import { event_types, eventSource } from '../../../../../../script.js';

const codeblock_regex = /`{5}javascript(.+?)`{5}/gs;

async function parse_message(event_data: Parameters<ListenerType['chat_completion_prompt_ready']>[0]): Promise<void> {
  for (const message of event_data.chat) {
    try {
      message.content = await parse_codeblock(message.content);
    } catch (error) {
      const error_message = `[EmbeddedCodeblock] 解析内嵌代码失败: ${error}`
      // @ts-expect-error
      toastr.error(error_message);
      console.error(error_message);
    }
  }
}

async function parse_codeblock(content: string): Promise<string> {
  let matches = [...content.matchAll(codeblock_regex)];
  if (matches.length < 1) {
    return content;
  }
  for (const match of matches) {
    const fn = new Function(match[1]);
    content = content.replace(match[0], String(await fn()));
  }
  return content;
}

export function initializeEmbeddedCodeblockOnExtension() {
  eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, parse_message);
}

export function destroyEmbeddedCodeblockOnExtension() {
  eventSource.removeListener(event_types.CHAT_COMPLETION_PROMPT_READY, parse_message);
}
