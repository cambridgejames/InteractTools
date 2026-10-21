import type { EngineSnapshot, FeedItem, MemberNotice } from './view'
import type { LogEntry } from './log'
import type { Presentation } from './presentation'

export type EngineEvent =
  | { readonly type: 'snapshot'; readonly snapshot: EngineSnapshot }
  | { readonly type: 'feed'; readonly item: FeedItem }
  | { readonly type: 'members'; readonly members: readonly MemberNotice[] }
  | { readonly type: 'log'; readonly entry: LogEntry }
  | { readonly type: 'presentation'; readonly presentation: Presentation }
