import { brotliCompressSync, deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  authBody,
  decodePackets,
  encodePacket,
  OP_AUTH,
  OP_MESSAGE,
  readChat,
  readGift,
  readMember
} from '@platforms/bilibili/protocol'

function packed(protoVersion: number, payload: Buffer): Buffer {
  const header = Buffer.alloc(16)
  header.writeUInt32BE(16 + payload.length, 0)
  header.writeUInt16BE(16, 4)
  header.writeUInt16BE(protoVersion, 6)
  header.writeUInt32BE(OP_MESSAGE, 8)
  header.writeUInt32BE(1, 12)
  return Buffer.concat([header, payload])
}

describe('bilibili protocol', () => {
  it('writes an auth packet with the expected header', () => {
    const packet = encodePacket(OP_AUTH, authBody(7734200, 'token', 'buvid'))
    expect(packet.readUInt32BE(0)).toBe(packet.length)
    expect(packet.readUInt16BE(4)).toBe(16)
    expect(packet.readUInt32BE(8)).toBe(OP_AUTH)
    const body = JSON.parse(packet.subarray(16).toString('utf8')) as { roomid: number; key: string }
    expect(body.roomid).toBe(7734200)
    expect(body.key).toBe('token')
  })

  it('decodes concatenated packets', () => {
    const payload = JSON.stringify({ cmd: 'DANMU_MSG', info: [[], 'hello', [1, '小满']] })
    const packets = decodePackets(Buffer.concat([encodePacket(OP_MESSAGE, payload), encodePacket(OP_MESSAGE, payload)]))
    expect(packets).toHaveLength(2)
    expect(packets[0]?.operation).toBe(OP_MESSAGE)
  })

  it('decodes zlib and brotli wrappers', () => {
    const payload = encodePacket(OP_MESSAGE, JSON.stringify({ cmd: 'TEST' }))
    const zlibPacket = packed(2, deflateSync(payload))
    const brotliPacket = packed(3, brotliCompressSync(payload))
    expect(decodePackets(zlibPacket)[0]?.body).toContain('TEST')
    expect(decodePackets(brotliPacket)[0]?.body).toContain('TEST')
  })

  it('reads chat, gift and member events', () => {
    const chat = readChat({ cmd: 'DANMU_MSG', info: [[], '晚上好', [42, '小满']] }, '6', 10)
    expect(chat).toMatchObject({ userId: '42', userName: '小满', text: '晚上好', platform: 'bilibili' })

    const gift = readGift(
      { cmd: 'SEND_GIFT', data: { uid: 42, uname: '小满', giftName: '小心心', num: 3 } },
      '6',
      11
    )
    expect(gift).toMatchObject({ giftName: '小心心', count: 3 })

    const member = readMember(
      { cmd: 'INTERACT_WORD', data: { uid: 42, uname: '小满', msg_type: 2 } },
      '6',
      12
    )
    expect(member?.kind).toBe('follow')
  })
})
