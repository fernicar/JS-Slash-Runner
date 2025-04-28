import { handlePartialRender } from '@/component/message_iframe';

import {
  chat,
  messageFormatting,
  reloadCurrentChat,
  saveChatConditional,
  substituteParamsExtended,
  system_message_types,
} from '@sillytavern/script';

interface ChatMessage {
  message_id: number;
  name: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden: boolean;

  swipe_id: number;
  message: string;
  data: Record<string, any>;

  swipes: string[];
  swipes_data: Record<string, any>[];

  is_user: boolean;
  is_system_or_hidden: boolean;
}

interface GetChatMessagesOption {
  role?: 'all' | 'system' | 'assistant' | 'user';
  hide_state?: 'all' | 'hidden' | 'unhidden';
}

function string_to_range(input: string, min: number, max: number) {
  let start, end;

  if (input.match(/^(-?\d+)$/)) {
    const value = Number(input);
    start = end = value < 0 ? max + value + 1 : value;
  } else {
    const match = input.match(/^(-?\d+)-(-?\d+)$/);
    if (!match) {
      return null;
    }

    [start, end] = _.sortBy(
      [match[1], match[2]].map(value => Number(value)).map(value => (value < 0 ? max + value + 1 : value)),
    );
  }

  if (isNaN(start) || isNaN(end) || start > end || start < min || end > max) {
    return null;
  }
  return { start, end };
}

export function getChatMessages(
  range: string | number,
  { role = 'all', hide_state = 'all' }: GetChatMessagesOption = {},
): ChatMessage[] {
  const range_demacroed = substituteParamsExtended(range.toString());
  const range_number = string_to_range(range_demacroed, 0, chat.length - 1);
  if (!range_number) {
    throw Error(`提供的消息范围 range 无效: ${range}`);
  }
  if (!['all', 'system', 'assistant', 'user'].includes(role)) {
    throw Error(`提供的 role 无效, 请提供 'all', 'system', 'assistant' 或 'user', 你提供的是: ${role}`);
  }
  if (!['all', 'hidden', 'unhidden'].includes(hide_state)) {
    throw Error(`提供的 hide_state 无效, 请提供 'all', 'hidden' 或 'unhidden', 你提供的是: ${hide_state}`);
  }

  const { start, end } = range_number;

  const getRole = (chat_message: any) => {
    const is_narrator = chat_message.extra?.type === system_message_types.NARRATOR;
    if (is_narrator) {
      if (chat_message.is_user) {
        return 'unknown';
      }
      return 'system';
    }
    if (chat_message.is_user) {
      return 'user';
    }
    return 'assistant';
  };

  const process_message = (message_id: number): ChatMessage | null => {
    const message = chat[message_id];
    if (!message) {
      console.warn(`没找到第 ${message_id} 楼的消息`);
      return null;
    }

    const message_role = getRole(message);
    if (role !== 'all' && message_role !== role) {
      console.debug(`筛去了第 ${message_id} 楼的消息因为它的身份不是 ${role}`);
      return null;
    }

    if (hide_state !== 'all' && (hide_state === 'hidden') !== message.is_system) {
      console.debug(`筛去了第 ${message_id} 楼的消息因为它${hide_state === 'hidden' ? `` : `没`} 被隐藏`);
      return null;
    }

    const swipe_id = message?.swipe_id ?? 0;
    const swipes = message?.swipes ?? [message.mes];
    const swipes_data = message?.variables ?? [];
    const data = swipes_data[swipe_id] ?? {};

    return {
      message_id: message_id,
      name: message.name,
      role: message_role as 'system' | 'assistant' | 'user',
      is_hidden: message.is_system,
      message: message.mes,
      data: data,

      swipe_id: swipe_id,
      swipes: swipes,
      swipes_data: swipes_data,

      is_user: message.is_user,
      is_system_or_hidden: message.is_system,
    };
  };

  const chat_messages: ChatMessage[] = _.range(start, end + 1)
    .map(i => process_message(i))
    .filter(chat_message => chat_message !== null);

  console.info(
    `获取${start == end ? `第 ${start} ` : ` ${start}-${end} `}楼的消息, 选项: ${JSON.stringify({
      role,
      hide_state,
    })} `,
  );
  return structuredClone(chat_messages);
}

interface ChatMessageToSet {
  message?: string;
  data?: Record<string, any>;
}

interface SetChatMessageOption {
  swipe_id?: 'current' | number;
  refresh?: 'none' | 'display_current' | 'display_and_render_current' | 'all';
}

export async function setChatMessage(
  field_values: ChatMessageToSet,
  message_id: number,
  { swipe_id = 'current', refresh = 'display_and_render_current' }: SetChatMessageOption = {},
): Promise<void> {
  field_values = typeof field_values === 'string' ? { message: field_values } : field_values;
  if (typeof swipe_id !== 'number' && swipe_id !== 'current') {
    throw Error(`提供的 swipe_id 无效, 请提供 'current' 或序号, 你提供的是: ${swipe_id} `);
  }
  if (!['none', 'display_current', 'display_and_render_current', 'all'].includes(refresh)) {
    throw Error(
      `提供的 refresh 无效, 请提供 'none', 'display_current', 'display_and_render_current' 或 'all', 你提供的是: ${refresh} `,
    );
  }

  const chat_message = chat.at(message_id);
  if (!chat_message) {
    console.warn(`未找到第 ${message_id} 楼的消息`);
    return;
  }

  const add_swipes_if_required = (): boolean => {
    if (swipe_id === 'current') {
      return false;
    }

    // swipe_id 对应的消息页存在
    if (swipe_id == 0 || (chat_message.swipes && swipe_id < chat_message.swipes.length)) {
      return true;
    }

    if (!chat_message.swipes) {
      chat_message.swipe_id = 0;
      chat_message.swipes = [chat_message.mes];
      chat_message.swipe_info = [{}];
    }
    for (let i = chat_message.swipes.length; i <= swipe_id; ++i) {
      chat_message.swipes.push('');
      chat_message.swipe_info.push({});
    }
    return true;
  };

  const swipe_id_previous_index: number = chat_message.swipe_id ?? 0;
  const swipe_id_to_set_index: number = swipe_id == 'current' ? swipe_id_previous_index : swipe_id;
  const swipe_id_to_use_index: number = refresh != 'none' ? swipe_id_to_set_index : swipe_id_previous_index;
  const message: string =
    field_values.message ??
    (chat_message.swipes ? chat_message.swipes[swipe_id_to_set_index] : undefined) ??
    chat_message.mes;

  const update_chat_message = () => {
    const message_demacroed = substituteParamsExtended(message);

    if (field_values.data) {
      if (!chat_message.variables) {
        chat_message.variables = [];
      }
      chat_message.variables[swipe_id_to_set_index] = field_values.data;
    }

    if (chat_message.swipes) {
      chat_message.swipes[swipe_id_to_set_index] = message_demacroed;
      chat_message.swipe_id = swipe_id_to_use_index;
    }

    if (swipe_id_to_use_index === swipe_id_to_set_index) {
      chat_message.mes = message_demacroed;
    }
  };

  const update_partial_html = (should_update_swipe: boolean) => {
    // @ts-ignore
    const mes_html = $(`div.mes[mesid = "${message_id}"]`);
    if (!mes_html) {
      return;
    }

    if (should_update_swipe) {
      // FIXME: 只有一条消息时, swipes-counter 不会正常显示; 此外还要考虑 swipes-counter 的 "Swipe # for All Messages" 选项
      mes_html.find('.swipes-counter').text(`${swipe_id_to_use_index + 1}\u200b/\u200b${chat_message.swipes.length}`);
    }
    if (refresh != 'none') {
      mes_html
        .find('.mes_text')
        .empty()
        .append(
          messageFormatting(message, chat_message.name, chat_message.is_system, chat_message.is_user, message_id),
        );
      if (refresh == 'display_and_render_current') {
        handlePartialRender(message_id);
      }
    }
  };

  const should_update_swipe: boolean = add_swipes_if_required();
  update_chat_message();
  if (refresh == 'all') {
    await reloadCurrentChat();
  } else {
    update_partial_html(should_update_swipe);
    await saveChatConditional();
  }

  console.info(
    `设置第 ${message_id} 楼消息, 选项: ${JSON.stringify({
      swipe_id,
      refresh,
    })}, 设置前使用的消息页: ${swipe_id_previous_index}, 设置的消息页: ${swipe_id_to_set_index}, 现在使用的消息页: ${swipe_id_to_use_index} `,
  );
}
