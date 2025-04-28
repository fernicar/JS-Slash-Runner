interface ChatMessage {
  message_id: number;
  name: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden: boolean;
  /** 当前被使用的消息页页号 */
  swipe_id: number;
  /** 当前被使用的消息页文本 */
  message: string;
  /** 当前被使用的消息页所绑定的数据 */
  data: Record<string, any>;
  swipes: string[];
  swipes_data: Record<string, any>[];
  is_user: boolean;
  is_system_or_hidden: boolean;
}

interface GetChatMessagesOption {
  /** 按 role 筛选消息; 默认为 `'all'` */
  role?: 'all' | 'system' | 'assistant' | 'user';
  /** 按是否被隐藏筛选消息; 默认为 `'all'` */
  hide_state?: 'all' | 'hidden' | 'unhidden';
}

/**
 * 获取聊天消息
 *
 * @param range 要获取的消息楼层号或楼层范围, 如 `0`, `'0-{{lastMessageId}}'`, `-1` 等. 负数表示深度, 如 `-1` 表示最新的消息楼层, `-2` 表示倒数第二条消息楼层.
 * @param option 可选选项
 *   - `role:'all'|'system'|'assistant'|'user'`: 按 role 筛选消息; 默认为 `'all'`
 *   - `hide_state:'all'|'hidden'|'unhidden'`: 按是否被隐藏筛选消息; 默认为 `'all'`
 *
 * @returns 一个数组, 数组的元素是每楼的消息 `ChatMessage`. 该数组依据按 message_id 从低到高排序.
 *
 * @exmaple
 * // 仅获取第 10 楼会被 ai 使用的消息页
 * const messages = getChatMessages(10);
 * const messages = getChatMessages("10");
 *
 * @example
 * // 获取所有楼层的所有消息页
 * const messages = getChatMessages("0-{{lastMessageId}}");
 */
function getChatMessages(range: string | number, { role, hide_state }?: GetChatMessagesOption): ChatMessage[];

interface ChatMessageToSet {
  message?: string;
  data?: Record<string, any>;
}

interface SetChatMessageOption {
  /**
   * 要替换的消息页 (`'current'` 来替换当前使用的消息页, 或从 0 开始的序号来替换对应消息页), 如果消息中还没有该消息页, 则会创建该页; 默认为 `'current'`
   */
  swipe_id?: 'current' | number;

  /**
   * 是否更新页面的显示和 iframe 渲染, 只会更新已经被加载显示在网页的楼层, 更新显示时会触发被更新楼层的 "仅格式显示" 正则; 默认为 `'display_and_render_current'`
   * - `'none'`: 不更新页面的显示和 iframe 渲染
   * - `'display_current'`: 仅更新当前被替换楼层的显示, 如果替换的是没被使用的消息页, 则会自动切换为使用那一页
   * - `'display_and_render_current'`: 与 `display_current` 相同, 但还会重新渲染该楼的 iframe
   * - `'all'`: 重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED` 进而重新加载全局脚本和楼层消息
   */
  refresh?: 'none' | 'display_current' | 'display_and_render_current' | 'all';
}

/**
 * 设置某消息楼层某聊天消息页的信息. 如果设置了当前会被发送给 ai 的消息文本 (正被使用且没被隐藏的消息页文本), 则 "仅格式提示词" 正则将会使用它而不是原来的消息.
 *
 * @param field_values 要设置的信息
 *   - message?: 消息页要设置的消息文本
 *   - data?: 消息页要绑定的数据
 * @param message_id 消息楼层id, 负数则表示深度, 如 `-1` 表示最新的消息楼层, `-2` 表示倒数第二条消息楼层
 * @param option 可选选项:
 *   - `swipe_id?:'current'|number`: 要替换的消息页 (`'current'` 来替换当前使用的消息页, 或从 0 开始的序号来替换对应消息页), 如果消息中还没有该消息页, 则会创建该页; 默认为 `'current'`
 *   - `refresh?:'none'|'display_current'|'display_and_render_current'|'all'`: 是否更新页面的显示和 iframe 渲染, 只会更新已经被加载显示在网页的楼层, 更新显示时会触发被更新楼层的 "仅格式显示" 正则; 默认为 `'display_and_render_current'`
 *
 * @example
 * await setChatMessage({message: "设置楼层 5 当前消息页的文本"}, 5);
 * await setChatMessage({message: "设置楼层 5 第 3 页的文本, 更新为显示它并渲染其中的 iframe"}, 5, {swipe_id: 3});
 * await setChatMessage({message: "设置楼层 5 第 3 页的文本, 但不更新显示它"}, 5, {swipe_id: 3, refresh: 'none'});
 *
 * @example
 * // 为最后一楼的当前消息页绑定数据
 * await setChatMessage({data: {神乐光好感度: 5}}, -1);
 */
async function setChatMessage(
  { message, data }?: ChatMessageToSet,
  message_id: number,
  { swipe_id, refresh }?: SetChatMessageOption,
): Promise<void>;
