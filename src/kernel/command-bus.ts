import type { ChatMessage } from '@contracts/platform'
import type { Logger } from '@contracts/log'
import type { InteractionTool } from '@contracts/tool'

/** 按注册顺序询问工具；第一个消费消息的工具终止分发。 */
export class CommandBus {
  constructor(
    private readonly tools: () => readonly InteractionTool[],
    private readonly logger: Logger
  ) {}

  async dispatch(message: ChatMessage): Promise<boolean> {
    for (const tool of this.tools()) {
      try {
        if (await tool.handleChat(message)) return true
      } catch (error) {
        this.logger.error('command-bus', '工具处理弹幕失败：' + tool.manifest.id, String(error))
      }
    }
    return false
  }
}
