import { chat, chat_metadata, event_types, eventSource, saveChatDebounced } from '../../../../../../script.js';
import { extension_settings, saveMetadataDebounced } from '../../../../../extensions.js';

function get_property_from_path(object: Record<string, any>, path: string, default_value: any) {
  let result: Record<string, any> | undefined = object;
  for (const key of path.split('.')) {
    if (result === undefined) {
      return default_value;
    }
    result = result[key];
  };
  return result ?? default_value;
}

function demacro(event_data: { chat: { role: string; content: string }[]; dryRun: boolean }) {
  const map = {
    get_global_variable: extension_settings.variables.global,
    get_chat_variable: (chat_metadata as { variables: Object }).variables,
    get_message_variable: chat.filter(chat => chat.variables !== undefined).map(chat => chat.variables[chat.swipe_id ?? 0]).at(-1) ?? {},
  };
  event_data.chat.forEach(chat => {
    chat.content = chat.content.replaceAll(/\{\{(get_global_variable|get_chat_variable|get_message_variable)::(.*?)\}\}/g, (_substring, type: keyof typeof map, path: string) => {
      return JSON.stringify(get_property_from_path(map[type], path, null));
    });
  });
  saveMetadataDebounced();
  saveChatDebounced();
}

export function initializeMacroOnExtension() {
  eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, demacro);
}

export function destroyMacroOnExtension() {
  eventSource.removeListener(event_types.CHAT_COMPLETION_PROMPT_READY, demacro);
}
