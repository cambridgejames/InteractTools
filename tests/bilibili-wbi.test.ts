import { describe, expect, it } from 'vitest'
import { signWbi, wbiKeysFromUrls } from '@platforms/bilibili/wbi'

describe('bilibili wbi', () => {
  it('derives keys from wbi img urls', () => {
    const keys = wbiKeysFromUrls(
      'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
      'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png'
    )
    expect(keys).toEqual({
      imgKey: '7cd084941338484aae1ad9425b84077c',
      subKey: '4932caff0ff746eab6f01bf08b70ac45'
    })
  })

  it('matches a real signed danmu query', () => {
    const query = signWbi(
      { id: 7734200, type: 0, web_location: 444.8 },
      {
        imgKey: '7cd084941338484aae1ad9425b84077c',
        subKey: '4932caff0ff746eab6f01bf08b70ac45'
      },
      1792336708
    )
    expect(query).toBe(
      'id=7734200&type=0&web_location=444.8&wts=1792336708&w_rid=37cf81a1878f6d6e6d02925c8cfeafe8'
    )
  })
})
