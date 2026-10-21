import protobuf from 'protobufjs'
import { gunzipSync } from 'node:zlib'

/** 抖音 webcast 的最小消息集；只声明采集需要的字段，未声明字段由 protobuf 跳过。 */
const schema = `
syntax = "proto3";
package douyin;

message PushFrame {
  uint64 seqId = 1;
  uint64 logId = 2;
  uint64 service = 3;
  uint64 method = 4;
  repeated HeadersList headers = 5;
  string payloadEncoding = 6;
  string payloadType = 7;
  bytes payload = 8;
}

message HeadersList {
  string key = 1;
  string value = 2;
}

message Response {
  repeated Message messages = 1;
  string cursor = 2;
  uint64 fetchInterval = 3;
  uint64 now = 4;
  string internalExt = 5;
  uint32 fetchType = 6;
  map<string, string> routeParams = 7;
  uint64 heartbeatDuration = 8;
  bool needAck = 9;
  string pushServer = 10;
  string liveCursor = 11;
  bool historyNoMore = 12;
}

message Message {
  string method = 1;
  bytes payload = 2;
  int64 msgId = 3;
  int32 msgType = 4;
  int64 offset = 5;
  bool needWrdsStore = 6;
  int64 wrdsVersion = 7;
  string wrdsSubKey = 8;
}

message Common {
  string method = 1;
  uint64 msgId = 2;
  uint64 roomId = 3;
  uint64 createTime = 4;
}

message User {
  uint64 id = 1;
  uint64 shortId = 2;
  string nickname = 3;
  uint32 gender = 4;
  string signature = 5;
}

message ChatMessage {
  Common common = 1;
  User user = 2;
  string content = 3;
  bool visibleToSender = 4;
}

message GiftMessage {
  Common common = 1;
  int64 giftId = 2;
  string repeatCount = 5;
  string comboCount = 6;
  User user = 7;
  User toUser = 8;
  GiftStruct gift = 15;
}

message GiftStruct {
  uint64 id = 5;
  string name = 16;
  string describe = 2;
}

message MemberMessage {
  Common common = 1;
  User user = 2;
  int64 memberCount = 3;
}
`

const root = protobuf.parse(schema).root
const PushFrame = root.lookupType('douyin.PushFrame')
const Response = root.lookupType('douyin.Response')
const ChatMessage = root.lookupType('douyin.ChatMessage')
const GiftMessage = root.lookupType('douyin.GiftMessage')
const MemberMessage = root.lookupType('douyin.MemberMessage')

export type DouyinMessage =
  | {
      readonly kind: 'chat'
      readonly msgId: string
      readonly userId: string
      readonly userName: string
      readonly text: string
    }
  | {
      readonly kind: 'gift'
      readonly msgId: string
      readonly userId: string
      readonly userName: string
      readonly giftName: string
      readonly count: number
    }
  | {
      readonly kind: 'member'
      readonly msgId: string
      readonly userId: string
      readonly userName: string
      readonly memberCount: number
    }

export interface DouyinFrame {
  readonly messages: readonly DouyinMessage[]
  readonly needAck: boolean
  readonly internalExt: string
  readonly heartbeatDurationMs: number | null
}

/**
 * 抖音 WSS 的帧是 PushFrame；payload 可能是 gzip 压缩的 Response。
 * 这里只做协议解码，不向平台发送任何用户内容。
 */
export function decodeDouyinFrame(raw: Uint8Array): DouyinFrame {
  const frame = PushFrame.decode(raw)
  const payload = frame.payload ?? new Uint8Array()
  const decoded = frame.payloadEncoding === 'gzip' || (payload[0] === 0x1f && payload[1] === 0x8b)
    ? gunzipSync(payload)
    : payload
  const response = Response.decode(decoded)
  const messages: DouyinMessage[] = []

  for (const item of response.messages ?? []) {
    const method = item.method ?? ''
    if (method === 'WebcastChatMessage') {
      const chat = ChatMessage.decode(item.payload ?? new Uint8Array())
      messages.push({
        kind: 'chat',
        msgId: String(item.msgId ?? chat.common?.msgId ?? ''),
        userId: String(chat.user?.id ?? ''),
        userName: chat.user?.nickname ?? '抖音用户',
        text: chat.content ?? ''
      })
    } else if (method === 'WebcastGiftMessage') {
      const gift = GiftMessage.decode(item.payload ?? new Uint8Array())
      const count = Number.parseInt(gift.repeatCount ?? gift.comboCount ?? '1', 10)
      messages.push({
        kind: 'gift',
        msgId: String(item.msgId ?? gift.common?.msgId ?? ''),
        userId: String(gift.user?.id ?? ''),
        userName: gift.user?.nickname ?? '抖音用户',
        giftName: gift.gift?.name ?? '礼物',
        count: Number.isFinite(count) && count > 0 ? count : 1
      })
    } else if (method === 'WebcastMemberMessage') {
      const member = MemberMessage.decode(item.payload ?? new Uint8Array())
      messages.push({
        kind: 'member',
        msgId: String(item.msgId ?? member.common?.msgId ?? ''),
        userId: String(member.user?.id ?? ''),
        userName: member.user?.nickname ?? '抖音用户',
        memberCount: Number(member.memberCount ?? 0)
      })
    }
  }

  return {
    messages,
    needAck: response.needAck === true,
    internalExt: response.internalExt ?? '',
    heartbeatDurationMs: response.heartbeatDuration === undefined
      ? null
      : Number(response.heartbeatDuration) * 1000
  }
}

/** 服务器要求 ack 时只回 internalExt，不携带任何用户内容。 */
export function encodeDouyinAck(internalExt: string): Uint8Array {
  return PushFrame.encode(
    PushFrame.create({
      payloadType: 'ack',
      payload: Buffer.from(internalExt, 'utf8')
    })
  ).finish()
}

/** 从纯数字、live.douyin.com/123 或分享链接里取 web_rid。 */
export function normalizeDouyinRoom(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return ''
  const direct = /^\d+$/.test(trimmed)
  if (direct) return trimmed
  const match = trimmed.match(/live\.douyin\.com\/(\d+)/)
  return match?.[1] ?? trimmed
}
