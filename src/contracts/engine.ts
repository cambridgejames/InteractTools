import type { EngineSnapshot, FeedItem } from './view'
import type { LogEntry } from './log'
import type { Presentation } from './presentation'

export type EngineEvent =
  | { readonly type: 'snapshot'; readonly snapshot: EngineSnapshot }
  | { readonly type: 'feed'; readonly item: FeedItem }
  | { readonly type: 'log'; readonly entry: LogEntry }
  | { readonly type: 'presentation'; readonly presentation: Presentation }
