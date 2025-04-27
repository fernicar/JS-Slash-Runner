interface LorebookEntry {
  /** uid 是相对于世界书内部的, 不要跨世界书使用 */
  uid: number;
  /** 酒馆中将排序设置为 "自定义" 时的显示顺序 */
  display_index: number;

  comment: string;
  enabled: boolean;
  type: 'constant' | 'selective' | 'vectorized';
  position:
    | 'before_character_definition'
    | 'after_character_definition'
    | 'before_example_messages'
    | 'after_example_messages'
    | 'before_author_note'
    | 'after_author_note'
    | 'at_depth_as_system'
    | 'at_depth_as_assistant'
    | 'at_depth_as_user';

  /** 仅对于 `position === 'at_depth_as_???'` 有意义; 其他情况为 null */
  depth: number | null;
  order: number;
  probability: number;

  key: string[];
  logic: 'and_any' | 'and_all' | 'not_all' | 'not_any';
  filter: string[];

  scan_depth: 'same_as_global' | number;
  case_sensitive: 'same_as_global' | boolean;
  match_whole_words: 'same_as_global' | boolean;
  use_group_scoring: 'same_as_global' | boolean;
  automation_id: string | null;

  exclude_recursion: boolean;
  prevent_recursion: boolean;
  /** 启用则是 true, 如果设置了具体的 Recursion Level 则是数字 (具体参考酒馆中勾选这个选项后的变化) */
  delay_until_recursion: boolean | number;

  content: string;

  group: string;
  group_prioritized: boolean;
  group_weight: number;
  sticky: number | null;
  cooldown: number | null;
  delay: number | null;
}

interface GetLorebookEntriesOption {
  /** 按照指定字段值筛选条目, 如 `{position: 'at_depth_as_system'}` 表示仅获取处于 @D⚙ 的条目; 默认为不进行筛选. 由于实现限制, 只能做到这样的简单筛选; 如果需要更复杂的筛选, 请获取所有条目然后自己筛选. */
  filter?: 'none' | Partial<LorebookEntry>;
}

/**
 * 获取世界书中的条目信息
 *
 * @param lorebook 世界书名称
 *
 * @returns 一个数组, 元素是各条目信息
 *
 * @example
 * // 获取世界书中所有条目的所有信息
 * const entries = await getLorebookEntries("eramgt少女歌剧");
 *
 * @example
 * // 按内容筛选, content 中必须出现 `'神乐光'`
 * const entries = await getLorebookEntries("eramgt少女歌剧", {filter: {content: '神乐光'}});
 */
async function getLorebookEntries(lorebook: string): Promise<LorebookEntry[]>;
