import { z } from 'zod'

const GITHUB_OWNER = '/cambridgejames/'

/**
 * 外部链接白名单：项目 GitHub 与 B站/抖音官方直播间。
 * 只允许 HTTPS，且拒绝带 userinfo 的伪装 URL。
 */
export const externalUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value)
      if (url.protocol !== 'https:') return false
      if (url.username.length > 0 || url.password.length > 0) return false
      if (url.hostname === 'github.com') return url.pathname.startsWith(GITHUB_OWNER)
      return url.hostname === 'live.bilibili.com' || url.hostname === 'live.douyin.com'
    } catch {
      return false
    }
  }, {
    message: '只允许打开项目 GitHub 或平台官方直播间链接'
  })
