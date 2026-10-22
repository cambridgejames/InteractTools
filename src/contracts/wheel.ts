import { z } from 'zod'

export const WHEEL_LABEL_MAX = 48

export type WheelPhase = 'idle' | 'spinning' | 'result'

/** 停止动画尾段：滑步感或更干脆的急停。 */
export type WheelStopEasing = 'glide' | 'brake'

export interface WheelPreset {
  readonly id: string
  readonly name: string
  readonly segments: readonly string[]
  readonly spinDurationSeconds: number
}

export interface WheelConfig {
  readonly segments: readonly string[]
  readonly spinDurationSeconds: number
  readonly presets: readonly WheelPreset[]
}

export interface WheelResult {
  readonly spinId: string
  readonly label: string
  readonly index: number
  readonly at: number
}

const wheelPresetSchema = z
  .object({
    id: z.string().min(1).max(40),
    name: z.string().trim().min(1).max(20),
    segments: z.array(z.string().trim().min(1).max(WHEEL_LABEL_MAX)).min(2).max(16),
    spinDurationSeconds: z.number().min(2).max(10)
  })
  .strict()

export const wheelConfigSchema = z
  .object({
    segments: z.array(z.string().trim().min(1).max(WHEEL_LABEL_MAX)).min(2).max(16),
    spinDurationSeconds: z.number().min(2).max(10),
    presets: z.array(wheelPresetSchema).max(12)
  })

export const wheelResultSchema = z
  .object({
    spinId: z.string(),
    label: z.string(),
    index: z.number().int().min(0),
    at: z.number()
  })
  .strict()

export const DEFAULT_WHEEL_CONFIG: WheelConfig = {
  segments: ["最近一次熬夜到几点？","手机里最舍不得删的照片","今年最想完成的一件事","最近单曲循环的歌","直播时最社死的一件事","如果明天放假一天","最想和谁连麦","最近被哪条弹幕逗笑"],
  spinDurationSeconds: 5,
  presets: [
    {
      id: 'preset-truth',
      name: '真心话',
      segments: ["最近一次熬夜到几点？","手机里最舍不得删的照片","今年最想完成的一件事","最近单曲循环的歌","直播时最社死的一件事","如果明天放假一天","最想和谁连麦","最近被哪条弹幕逗笑"],
      spinDurationSeconds: 5
    },
    {
      id: 'preset-dare',
      name: '大冒险',
      segments: ["用夹子音说一句晚安","模仿一个动物叫","清唱一句最近的歌","用方言夸一句观众","做五个深蹲","给榜一点一首歌","现场学一个表情包","闭眼十秒再睁眼"],
      spinDurationSeconds: 5
    }
  ]
}
