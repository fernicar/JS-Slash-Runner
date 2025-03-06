import { chat, chat_metadata, event_types, eventSource } from '../../../../../../script.js';
import { extension_settings } from '../../../../../extensions.js';

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

function demacro(event_data: { messages: { role: string; content: string }[] }) {
  const map = {
    get_global_variable: extension_settings.variables.global,
    get_chat_variable: (chat_metadata as { variables: Object }).variables,
    get_message_variable: chat.filter(message => message.variables?.[message.swipe_id ?? 0] !== undefined).map(message => message.variables[message.swipe_id ?? 0]).at(-1) ?? {},
  };
  event_data.messages.forEach(messages => {
    messages.content = messages.content.replaceAll(/\{\{(get_global_variable|get_chat_variable|get_message_variable)::(.*?)\}\}/g, (_substring, type: keyof typeof map, path: string) => {
      return JSON.stringify(get_property_from_path(map[type], path, null));
    });
  });
}

export function initializeMacroOnExtension() {
  eventSource.on(event_types.CHAT_COMPLETION_SETTINGS_READY, demacro);
}

export function destroyMacroOnExtension() {
  eventSource.removeListener(event_types.CHAT_COMPLETION_SETTINGS_READY, demacro);
}
