import { brotliDecompressSync, inflateSync } from 'node:zlib'
import type { ChatMessage, GiftEvent, MemberEvent } from '@contracts/platform'

export const OP_HEARTBEAT = 2
export const OP_HEARTBEAT_REPLY = 3
export const OP_MESSAGE = 5
export const OP_AUTH = 7
export const OP_AUTH_REPLY = 8

const HEADER_SIZE = 16

export interface DecodedPacket {
  readonly operation: number
  readonly protoVersion: number
  readonly body: string
}

/** 把一条 WebSocket 二进制帧拆成逻辑包；自定义 protover 2/3 会递归解压。 */
export function decodePackets(buffer: Buffer): readonly DecodedPacket[] {
  const packets: DecodedPacket[] = []
  let offset = 0

  while (offset + HEADER_SIZE <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const headerLength = buffer.readUInt16BE(offset + 4)
    const protoVersion = buffer.readUInt16BE(offset + 6)
    const operation = buffer.readUInt32BE(offset + 8)

    if (length < headerLength || offset + length > buffer.length) break

    const body = buffer.subarray(offset + headerLength, offset + length)
    offset += length

    if (protoVersion === 2) {
      packets.push(...decodePackets(inflateSync(body)))
    } else if (protoVersion === 3) {
      packets.push(...decodePackets(brotliDecompressSync(body)))
    } else {
      packets.push({ operation, protoVersion, body: body.toString('utf8') })
    }
  }

  return packets
}

export function encodePacket(operation: number, body: string | Buffer): Buffer {
  const payload = typeof body === 'string' ? Buffer.from(body, 'utf8') : body
  const header = Buffer.alloc(HEADER_SIZE)
  header.writeUInt32BE(HEADER_SIZE + payload.length, 0)
  header.writeUInt16BE(HEADER_SIZE, 4)
  header.writeUInt16BE(1, 6)
  header.writeUInt32BE(operation, 8)
  header.writeUInt32BE(1, 12)
  return Buffer.concat([header, payload])
}

export function authBody(roomId: number, token: string, buvid: string): string {
  return JSON.stringify({
    uid: 0,
    roomid: roomId,
    protover: 3,
    platform: 'web',
    type: 2,
    key: token,
    buvid
  })
}

export function readChat(payload: unknown, roomId: string, receivedAt: number): ChatMessage | null {
  const data = asRecord(payload)
  if (data === null || typeof data.cmd !== 'string' || !data.cmd.startsWith('DANMU_MSG')) return null

  const info = data.info
  if (!Array.isArray(info)) return null

  const text = info[1]
  const user = info[2]
  if (typeof text !== 'string' || !Array.isArray(user)) return null

  const uid = user[0]
  const name = user[1]
  if (typeof uid !== 'number' && typeof uid !== 'string') return null
  if (typeof name !== 'string') return null

  return {
    id: 'bili-' + String(uid) + '-' + receivedAt + '-' + text.length,
    platform: 'bilibili',
    roomId,
    userId: String(uid),
    userName: name,
    text,
    receivedAt
  }
}

export function readGift(payload: unknown, roomId: string, receivedAt: number): GiftEvent | null {
  const root = asRecord(payload)
  if (root === null || root.cmd !== 'SEND_GIFT') return null
  const data = asRecord(root.data)
  if (data === null) return null

  const uid = data.uid
  const name = data.uname
  const giftName = data.giftName
  const count = data.num
  if (uid === undefined || typeof name !== 'string' || typeof giftName !== 'string') return null

  return {
    id: 'bili-gift-' + String(uid) + '-' + receivedAt,
    platform: 'bilibili',
    roomId,
    userId: String(uid),
    userName: name,
    giftName,
    count: typeof count === 'number' ? count : 1,
    receivedAt
  }
}

export function readMember(payload: unknown, roomId: string, receivedAt: number): MemberEvent | null {
  const root = asRecord(payload)
  if (root === null || root.cmd !== 'INTERACT_WORD') return null
  const data = asRecord(root.data)
  if (data === null) return null

  const uid = data.uid
  const name = data.uname
  const type = data.msg_type
  if (uid === undefined || typeof name !== 'string') return null

  return {
    id: 'bili-member-' + String(uid) + '-' + receivedAt,
    platform: 'bilibili',
    roomId,
    userId: String(uid),
    userName: name,
    kind: type === 2 ? 'follow' : type === 3 ? 'share' : 'enter',
    receivedAt
  }
}

export function readJson(body: string): unknown {
  try {
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}
