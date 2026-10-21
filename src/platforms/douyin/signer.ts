import { createHash } from 'node:crypto'
import vm from 'node:vm'
import { ProxyAgent, fetch as undiciFetch } from 'undici'
import signSource from './assets/sign.js?raw'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'
const REQUEST_TIMEOUT_MS = 12_000

export interface DouyinSignResult {
  readonly roomId: string
  readonly title: string
  readonly wssUrl: string
  readonly headers: Readonly<Record<string, string>>
  readonly heartbeat: { readonly intervalMs: number; readonly payloadHex: string } | null
}

export interface DouyinSigner {
  sign(roomId: string, signal: AbortSignal): Promise<DouyinSignResult>
}

let signFunction: ((md5: string) => string) | null = null

/** 用 vm 执行随包发布的 webmssdk 签名脚本；算法更新时只替换 assets/sign.js。 */
function getSignFunction(): (md5: string) => string {
  if (signFunction !== null) return signFunction
  const context: Record<string, unknown> = {
    console,
    navigator: { userAgent: USER_AGENT }
  }
  vm.createContext(context)
  vm.runInContext(signSource, context)
  const fn = context.get_sign
  if (typeof fn !== 'function') throw new Error('抖音签名脚本未导出 get_sign')
  signFunction = (md5: string) => String((fn as (value: string) => unknown)(md5))
  return signFunction
}

/** 与签名脚本同源的浏览器 UA；a_bogus 与请求头必须一致。 */
export function douyinUserAgent(): string {
  return USER_AGENT
}

/**
 * 抖音网页端使用同一套本地签名链路。
 *
 * 连接前先用网页 cookie（ttwid / __ac_nonce）解析真实 roomId，再用
 * 内置签名脚本生成 WSS signature。除协议心跳和 ack 外不发送用户内容。
 */
export class LocalDouyinSigner implements DouyinSigner {
  private readonly dispatcher: ProxyAgent | null

  constructor(proxyUrl: string | null) {
    this.dispatcher = proxyUrl === null ? null : new ProxyAgent(proxyUrl)
  }

  async sign(roomId: string, signal: AbortSignal): Promise<DouyinSignResult> {
    if (signal.aborted) throw new Error('抖音连接已取消')
    const jar = await this.loadCookies(signal)
    const resolved = await this.resolveRoom(roomId, jar, signal)
    const signature = this.createSignature(resolved.roomId)
    const cookie = cookieString(jar)
    return {
      roomId: resolved.roomId,
      title: resolved.title,
      wssUrl: buildWssUrl(resolved.roomId, signature),
      headers: {
        'User-Agent': USER_AGENT,
        Cookie: cookie,
        Referer: 'https://live.douyin.com/' + roomId
      },
      heartbeat: { intervalMs: 5_000, payloadHex: '3a026862' }
    }
  }

  private async request(
    url: string,
    init: { readonly headers?: Record<string, string>; readonly method?: string },
    signal: AbortSignal
  ): Promise<Awaited<ReturnType<typeof undiciFetch>>> {
    const response = await undiciFetch(url, {
      ...init,
      signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
      ...(this.dispatcher === null ? {} : { dispatcher: this.dispatcher })
    })
    if (!response.ok) throw new Error('抖音请求返回 HTTP ' + String(response.status))
    return response
  }

  private async loadCookies(signal: AbortSignal): Promise<Map<string, string>> {
    const jar = new Map<string, string>()
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const home = await this.request('https://www.douyin.com/', {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      }, signal)
      storeCookies(home.headers, jar)

      const live = await this.request('https://live.douyin.com/', {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          Cookie: cookieString(jar)
        }
      }, signal)
      storeCookies(live.headers, jar)
      if (jar.get('ttwid') !== undefined) break
      if (attempt < 2) await delay(500 * (attempt + 1))
    }

    const nonce = jar.get('__ac_nonce')
    if (nonce !== undefined) {
      jar.set(
        '__ac_signature',
        acSignature('www.douyin.com', USER_AGENT, Math.floor(Date.now() / 1000))
      )
    }
    if (jar.get('ttwid') === undefined) {
      throw new Error('获取抖音匿名 cookie 失败，请检查网络或代理')
    }
    return jar
  }

  private async resolveRoom(
    webRid: string,
    jar: Map<string, string>,
    signal: AbortSignal
  ): Promise<{ readonly roomId: string; readonly title: string }> {
    const pageUrl = 'https://live.douyin.com/' + encodeURIComponent(webRid)
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this.request(pageUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Cookie: cookieString(jar),
          Referer: pageUrl
        }
      }, signal)
      const html = (await response.text()).replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      const match =
        html.match(/roomId\\?"\s*[:=]\s*\\?"(\d+)\\?"/) ??
        html.match(/"roomId"\s*:\s*"(\d+)"/) ??
        html.match(/roomId&quot;:&quot;(\d+)&quot;/)
      if (match?.[1] !== undefined) {
        const titleMatch = html.match(/<title>([^<]*)<\/title>/)
        return { roomId: match[1], title: titleMatch?.[1]?.trim() ?? '' }
      }
      if (attempt < 2) await delay(1_500 * (attempt + 1))
    }
    throw new Error('无法解析抖音直播间：未开播、房间不存在或页面被风控')
  }

  private createSignature(roomId: string): string {
    const params =
      'live_id=1,aid=6383,version_code=180800,webcast_sdk_version=1.0.14-beta.0,room_id=' +
      roomId +
      ',sub_room_id=,sub_channel_id=,did_rule=3,user_unique_id=' +
      roomId +
      ',device_platform=web,device_type=,ac=,identity=audience'
    const md5 = createHash('md5').update(params).digest('hex')
    const signature = getSignFunction()(md5)
    if (signature.length === 0) throw new Error('抖音签名脚本返回空结果')
    return signature
  }
}

function cookieString(jar: Map<string, string>): string {
  return [...jar].map(([key, value]) => key + '=' + value).join('; ')
}

function storeCookies(headers: Headers, jar: Map<string, string>): void {
  const bag = headers as unknown as { getSetCookie?: () => string[] }
  const values = bag.getSetCookie?.() ?? []
  for (const value of values) {
    const pair = value.split(';')[0]
    if (pair === undefined) continue
    const index = pair.indexOf('=')
    if (index <= 0) continue
    jar.set(pair.slice(0, index).trim(), pair.slice(index + 1))
  }
}

function buildWssUrl(roomId: string, signature: string): string {
  const now = Date.now()
  const cursor = 'r-' + roomId + '_d-1_u-1_fh-' + roomId + '_t-' + String(now)
  const internalExt =
    'internal_src:dim|wss_push_room_id:' + roomId +
    '|wss_push_did:' + roomId +
    '|first_req_ms:' + String(now) +
    '|fetch_time:' + String(now) +
    '|seq:1|wss_info:0-' + String(now) + '-0-0|wrds_v:' + roomId
  const params = [
    'app_name=douyin_web',
    'version_code=180800',
    'webcast_sdk_version=1.0.14-beta.0',
    'update_version_code=1.0.14-beta.0',
    'compress=gzip',
    'device_platform=web',
    'cookie_enabled=true',
    'screen_width=1536',
    'screen_height=864',
    'browser_language=zh-CN',
    'browser_platform=Win32',
    'browser_name=Mozilla',
    'browser_version=' + encodeURIComponent('5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'),
    'browser_online=true',
    'tz_name=Asia/Shanghai',
    'cursor=' + encodeURIComponent(cursor),
    'internal_ext=' + encodeURIComponent(internalExt),
    'host=https://live.douyin.com',
    'aid=6383',
    'live_id=1',
    'did_rule=3',
    'endpoint=live_pc',
    'support_wrds=1',
    'user_unique_id=' + roomId,
    'im_path=/webcast/im/fetch/',
    'identity=audience',
    'need_persist_msg_count=15',
    'insert_task_id=',
    'live_reason=',
    'room_id=' + roomId,
    'heartbeatDuration=0'
  ].join('&')
  return 'wss://webcast100-ws-web-lq.douyin.com/webcast/im/push/v2/?' + params + '&signature=' + signature
}

/** __ac_signature 纯算法；与抖音网页 cookie 链配合使用。 */
function acSignature(site: string, ua: string, timestamp: number): string {
  const cal1 = (value: string, iv: number): number => {
    let key = iv
    for (const char of value) key = ((key ^ char.charCodeAt(0)) * 65599) >>> 0
    return key
  }
  const cal2 = (value: string, iv: number): number => {
    let key = iv
    if (value.length === 0) return key
    for (let index = 0; index < 32; index += 1) {
      key = (key * 65599 + value.charCodeAt(key % value.length)) >>> 0
    }
    return key
  }
  const cal3 = (value: string, iv: number): number => {
    let key = iv
    for (const char of value) key = (key * 65599 + char.charCodeAt(0)) >>> 0
    return key
  }
  const encodeChar = (value: number): string =>
    value < 26 ? String.fromCharCode(value + 65) : value < 52 ? String.fromCharCode(value + 71) : value < 62 ? String.fromCharCode(value - 4) : String.fromCharCode(value - 17)
  const encode = (value: number): string => {
    let result = ''
    for (let shift = 24; shift >= 0; shift -= 6) result += encodeChar((value >>> shift) & 63)
    return result
  }
  const s1 = cal1(site, 0)
  const s3 = cal1(site, 0)
  const s5 = cal2(site, 0)
  const s2 = cal2(ua, s1)
  const s4 = cal3(ua, s3)
  const s6 = cal3(ua, s5)
  const s7 = (s1 + s2) >>> 0
  const s8 = (s3 + s4) >>> 0
  const s9 = (s5 + s6) >>> 0
  const s10 = (s7 + s8) >>> 0
  const s11 = (s8 + s9) >>> 0
  const s12 = (s10 + s11) >>> 0
  const s13 = (s1 + s4 + s5 + s7 + s9 + s11) >>> 0
  const s14 = (s2 + s3 + s6 + s8 + s10 + s12) >>> 0
  const s15 = (s13 + s14) >>> 0
  return encode(timestamp & 0xffffffff) + encode(s12) + encode(s15) + encode(timestamp & 0xffffffff)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
