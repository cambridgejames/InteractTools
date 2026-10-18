/** 工具历史记录的持久化端口；主进程按工具 id 分文件，测试可替换为内存实现。 */
export interface ToolHistory {
  load(): Promise<readonly unknown[]>
  append(entry: unknown): Promise<void>
  clear(): Promise<void>
}
