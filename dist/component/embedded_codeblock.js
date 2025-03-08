const codeblock_regex = /`{5}javascript(.+?)`{5}/gs;
async function parse_message(event_data) {
    for (const message of event_data.messages) {
        try {
            message.content = await parse_codeblock(message.content);
        }
        catch (error) {
            const error_message = `[EmbeddedCodeblock] 解析内嵌代码失败: ${error}`;
            // @ts-expect-error
            toastr.error(error_message);
            console.error(error_message);
        }
    }
}
async function parse_codeblock(content) {
    let matches = [...content.matchAll(codeblock_regex)];
    if (matches.length < 1) {
        return content;
    }
    for (const match of matches) {
        const fn = new Function(match[1]);
        const result = await fn();
        content = content.replace(match[0], typeof result === 'string' ? result : '');
    }
    return content;
}
export function initializeEmbeddedCodeblockOnExtension() {
    // eventSource.on(event_types.CHAT_COMPLETION_SETTINGS_READY, parse_message);
}
export function destroyEmbeddedCodeblockOnExtension() {
    // eventSource.removeListener(event_types.CHAT_COMPLETION_SETTINGS_READY, parse_message);
}
//# sourceMappingURL=embedded_codeblock.js.map