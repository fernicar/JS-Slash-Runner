import { chat, chat_metadata, event_types, eventSource, messageFormatting } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

interface MacroLike {
  regex: RegExp;
  replace: (context: Context, substring: string, ...args: any[]) => string;
}

interface Context {
  message_id?: number;
  role?: 'user' | 'assistant' | 'system';
}

const macros: MacroLike[] = [
  {
    regex: /\{\{get_global_variable::(.*?)\}\}/gi,
    replace: (_context: Context, _substring: string, path: string) => {
      const variables = extension_settings.variables.global;
      return JSON.stringify(_.get(variables, path, null));
    },
  },
  {
    regex: /\{\{get_chat_variable::(.*?)\}\}/gi,
    replace: (_context: Context, _substring: string, path: string) => {
      const variables = (chat_metadata as { variables: Object }).variables;
      return JSON.stringify(_.get(variables, path, null));
    },
  },
  {
    regex: /\{\{get_message_variable::(.*?)\}\}/gi,
    replace: (context: Context, _substring: string, path: string) => {
      const variables =
        chat
          .filter(message => message.variables?.[message.swipe_id ?? 0] !== undefined)
          .map(message => message.variables[message.swipe_id ?? 0])
          .at(context.message_id ?? -1) ?? {};
      return JSON.stringify(_.get(variables, path, null));
    },
  },
];

export function registerMacroLike(
  regex: RegExp,
  replace: (context: Context, substring: string, ...args: any[]) => string,
) {
  macros.push({ regex, replace });
}

function demacroOnPrompt(event_data: Parameters<ListenerType['chat_completion_prompt_ready']>[0]) {
  if (event_data.dryRun) {
    return;
  }

  for (const message of event_data.chat) {
    for (const macro of macros) {
      message.content = message.content.replace(macro.regex, (substring: string, ...args: any[]) =>
        macro.replace({ role: message.role as 'user' | 'assistant' | 'system' }, substring, ...args),
      );
    }
  }
}

function demacroOnRender(message_id: number) {
  const $mes_text = $(`div.mes[mesid="${message_id}"]`).find('.mes_text');
  if ($mes_text.length === 0) {
    return;
  }

  const chat_message = chat[message_id];

  let demacroed_message = chat_message.mes;
  for (const macro of macros) {
    demacroed_message = demacroed_message.replace(macro.regex, (substring: string, ...args: any[]) =>
      macro.replace({ message_id: message_id, role: chat_message.is_user ? 'user' : 'assistant' }, substring, ...args),
    );
  }

  if (!_.isEqual(chat_message.mes, demacroed_message)) {
    $mes_text.html(
      messageFormatting(demacroed_message, chat_message.name, chat_message.is_system, chat_message.is_user, message_id),
    );
  }
}

export function renderAllMacros() {
  $('div.mes').each((_index, node) => {
    demacroOnRender(Number($(node).attr('mesid')!));
  });
}

export function initializeMacroOnExtension() {
  eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, demacroOnPrompt);
  eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, demacroOnRender);
  eventSource.on(event_types.USER_MESSAGE_RENDERED, demacroOnRender);
  eventSource.on(event_types.MESSAGE_UPDATED, demacroOnRender);
  eventSource.on(event_types.MESSAGE_SWIPED, demacroOnRender);
}

export function destroyMacroOnExtension() {
  eventSource.removeListener(event_types.CHAT_COMPLETION_PROMPT_READY, demacroOnPrompt);
  eventSource.removeListener(event_types.CHARACTER_MESSAGE_RENDERED, demacroOnRender);
  eventSource.removeListener(event_types.USER_MESSAGE_RENDERED, demacroOnRender);
  eventSource.removeListener(event_types.MESSAGE_UPDATED, demacroOnRender);
  eventSource.removeListener(event_types.MESSAGE_SWIPED, demacroOnRender);
}
