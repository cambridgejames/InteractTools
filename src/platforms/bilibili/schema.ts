import { z } from 'zod'

export const roomInitSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  data: z.object({ room_id: z.number().int() }).optional()
})

export const danmuInfoSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  data: z
    .object({
      token: z.string(),
      host_list: z.array(
        z.object({
          host: z.string(),
          port: z.number().optional(),
          wss_port: z.number().optional()
        })
      )
    })
    .optional()
})

export const fingerSchema = z.object({
  code: z.number(),
  data: z.object({ b_3: z.string(), b_4: z.string() }).optional()
})

export type DanmuInfo = z.infer<typeof danmuInfoSchema>
