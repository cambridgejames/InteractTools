import { createHash } from 'node:crypto'

/** B站 WBI 混淆表；顺序与 web 端一致，改动会导致签名失效。 */
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52
] as const

export interface WbiKeys {
  readonly imgKey: string
  readonly subKey: string
}

export function wbiKeysFromUrls(imgUrl: string, subUrl: string): WbiKeys {
  return {
    imgKey: fileNameWithoutExtension(imgUrl),
    subKey: fileNameWithoutExtension(subUrl)
  }
}

/**
 * 生成带 wts / w_rid 的查询串。
 *
 * B站会按参数名排序后拼接，过滤值里的 !'()*，再用 mixinKey 做 MD5；
 * 签名错误时接口统一返回 -352，看起来很像风控，实际是缺参数。
 */
export function signWbi(
  params: Readonly<Record<string, string | number>>,
  keys: WbiKeys,
  timestampSeconds: number
): string {
  const signed: Record<string, string | number> = { ...params, wts: timestampSeconds }
  const query = Object.keys(signed)
    .sort()
    .map((key) => {
      const value = String(signed[key] ?? '').replace(/[!'()*]/g, '')
      return encodeURIComponent(key) + '=' + encodeURIComponent(value)
    })
    .join('&')

  const mixin = mixinKey(keys.imgKey + keys.subKey)
  const wRid = createHash('md5').update(query + mixin).digest('hex')
  return query + '&w_rid=' + wRid
}

function mixinKey(original: string): string {
  return MIXIN_KEY_ENC_TAB.map((index) => original[index] ?? '').join('').slice(0, 32)
}

function fileNameWithoutExtension(url: string): string {
  const file = url.split('/').pop() ?? ''
  return file.split('.')[0] ?? ''
}
