import { mockConfigSchema, type MockConfig } from '@contracts/config'
import type {
  ChatMessage,
  PlatformAdapter,
  PlatformAdapterFactory,
  PlatformContext,
  PlatformStatus
} from '@contracts/platform'

const CHAT_LINES = ['主播好', '这骰子有点东西', '来了来了', '666', '再投一次', '这力度稳了']

/** 本地模拟源：没有网络也能演示完整链路，并支持手动注入弹幕。 */
export class MockAdapter implements PlatformAdapter {
  readonly descriptor = mockAdapterFactory.descriptor

  private status: PlatformStatus = { phase: 'disconnected' }
  private config: MockConfig | null = null
  private seq = 0
  private botTimer: ReturnType<typeof setTimeout> | null = null
  private disposed = true

  constructor(private readonly context: PlatformContext) {}

  async connect(config: unknown, signal: AbortSignal): Promise<void> {
    this.config = mockConfigSchema.parse(config)
    this.disposed = false
    this.status = { phase: 'connecting' }
    this.context.emit({ type: 'status', status: this.status })

    signal.addEventListener('abort', () => void this.disconnect(), { once: true })
    this.status = { phase: 'connected', connectedAt: this.context.clock.now() }
    this.context.emit({ type: 'status', status: this.status })

    if (this.config.botsEnabled) this.scheduleBot()
  }

  async disconnect(): Promise<void> {
    this.disposed = true
    if (this.botTimer !== null) {
      clearTimeout(this.botTimer)
      this.botTimer = null
    }
    this.status = { phase: 'disconnected' }
    this.context.emit({ type: 'status', status: this.status })
  }

  snapshot(): PlatformStatus {
    return this.status
  }

  injectChat(input: { readonly userName: string; readonly text: string }): void {
    const message: ChatMessage = {
      id: 'mock-' + ++this.seq,
      platform: 'mock',
      roomId: 'local',
      userId: 'mock-' + input.userName,
      userName: input.userName,
      text: input.text,
      receivedAt: this.context.clock.now()
    }
    this.context.emit({ type: 'chat', message })
  }

  private scheduleBot(): void {
    if (this.disposed || this.config === null) return
    const interval = this.config.botsIntervalSeconds * 1000
    const jitter = 0.6 + Math.random() * 0.8

    this.botTimer = setTimeout(() => {
      if (this.disposed || this.config === null) return

      const name = this.config.botNames[Math.floor(Math.random() * this.config.botNames.length)]
      if (name !== undefined) {
        const roll = Math.random()
        if (roll < 0.7) {
          this.injectChat({ userName: name, text: '!力度 ' + randomPower() })
        } else if (roll < 0.9) {
          this.injectChat({
            userName: name,
            text: CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)] ?? '666'
          })
        } else {
          this.context.emit({
            type: 'gift',
            gift: {
              id: 'gift-' + ++this.seq,
              platform: 'mock',
              roomId: 'local',
              userId: 'mock-' + name,
              userName: name,
              giftName: '小心心',
              count: 1,
              receivedAt: this.context.clock.now()
            }
          })
        }
      }

      this.scheduleBot()
    }, interval * jitter)
  }
}

function randomPower(): number {
  // 中间值更常见，模拟真实弹幕分布。
  const base = (Math.random() + Math.random() + Math.random()) / 3
  return Math.round(15 + base * 80)
}

export const mockAdapterFactory: PlatformAdapterFactory = {
  descriptor: {
    id: 'mock',
    name: '本地模拟',
    capabilities: ['chat.read', 'gift.read', 'member.read']
  },
  configSchema: mockConfigSchema,
  create(context) {
    return new MockAdapter(context)
  }
}
