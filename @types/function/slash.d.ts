/**
 * 运行 Slash 命令, 注意如果命令写错了将不会有任何反馈
 *
 * @param command 要运行的 Slash 命令
 * @returns Slash 管道结果, 如果命令出错或执行了 `/abort` 则返回 `undefined`
 */
function triggerSlash(command: string): Promise<string>;
