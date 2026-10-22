import { describe, expect, it } from 'vitest'
import protobuf from 'protobufjs'
import { decodeDouyinFrame, normalizeDouyinRoom } from '../src/platforms/douyin/protocol'

const root = protobuf.parse(`
syntax = "proto3";
package test;
message PushFrame { string payloadEncoding = 6; bytes payload = 8; }
message Response { repeated Message messages = 1; bool needAck = 9; uint64 heartbeatDuration = 8; }
message Message { string method = 1; bytes payload = 2; int64 msgId = 3; }
message ChatMessage { User user = 2; string content = 3; }
message GiftStruct { string name = 16; }
message Common { int64 msgId = 1; }
message GiftMessage { Common common = 1; User user = 7; GiftStruct gift = 15; string repeatCount = 5; string comboCount = 6; }
message User { uint64 id = 1; string nickname = 3; }
`).root

describe('Douyin protocol', () => {
  it('normalizes room ids and live URLs', () => {
    expect(normalizeDouyinRoom('123456')).toBe('123456')
    expect(normalizeDouyinRoom('https://live.douyin.com/7654321?foo=1')).toBe('7654321')
  })

  it('decodes a chat PushFrame without any send path', () => {
    const user = root.lookupType('test.User').encode({ id: 42, nickname: '观众' }).finish()
    const chat = root.lookupType('test.ChatMessage').encode({ user: root.lookupType('test.User').decode(user), content: '你好' }).finish()
    const message = root.lookupType('test.Message').encode({ method: 'WebcastChatMessage', payload: chat, msgId: 9 }).finish()
    const response = root.lookupType('test.Response').encode({ messages: [root.lookupType('test.Message').decode(message)] }).finish()
    const frame = root.lookupType('test.PushFrame').encode({ payload: response }).finish()

    const decoded = decodeDouyinFrame(frame)
    expect(decoded.messages).toEqual([
      { kind: 'chat', msgId: '9', userId: '42', userName: '观众', text: '你好' }
    ])
  })

  it('decodes a gift PushFrame as a read-only gift event', () => {
    const user = root.lookupType('test.User').encode({ id: 7, nickname: '送礼观众' }).finish()
    const giftStruct = root.lookupType('test.GiftStruct').encode({ name: '小心心' }).finish()
    const gift = root.lookupType('test.GiftMessage').encode({
      user: root.lookupType('test.User').decode(user),
      gift: root.lookupType('test.GiftStruct').decode(giftStruct),
      repeatCount: '3'
    }).finish()
    const message = root.lookupType('test.Message').encode({ method: 'WebcastGiftMessage', payload: gift, msgId: 12 }).finish()
    const response = root.lookupType('test.Response').encode({ messages: [root.lookupType('test.Message').decode(message)] }).finish()
    const frame = root.lookupType('test.PushFrame').encode({ payload: response }).finish()

    expect(decodeDouyinFrame(frame).messages).toEqual([
      {
        kind: 'gift',
        msgId: '12',
        userId: '7',
        userName: '送礼观众',
        giftName: '小心心',
        count: 3
      }
    ])
  })
})
