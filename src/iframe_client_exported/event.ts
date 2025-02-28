export const iframe_client_event = `
/**
 * 发送 \`event_type\` 事件, 同时可以发送一些数据 \`data\`.
 *
 * 所有正在监听 \`event_type\` 消息频道的都会收到该消息并接收到 \`data\`.
 *
 * @param event_type 要发送的事件
 * @param data 要随着事件发送的数据
 *
 * @example
 * // 发送 "角色阶段更新完成" 事件, 所有监听该事件的 \`listener\` 都会被运行
 * eventEmit("角色阶段更新完成");
 *
 * @example
 * // 发送 "存档" 事件, 并等待所有 \`listener\` (也许是负责存档的函数) 执行完毕后才继续
 * await eventEmit("存档");
 *
 * @example
 * // 发送时携带数据 ["你好", 0]
 * eventEmit("事件", "你好", 0);
 */
async function eventEmit(event_type, ...data) {
    await sillyTavern().eventSource.emit(event_type, ...data);
    console.info(\`[Event][eventEmit](\${getIframeName()}) 发送 '\${event_type}' 事件, 携带数据: \${JSON.stringify(data)}\`);
}
/**
 * 让 \`listener\` 监听 \`event_type\`, 当事件发生时自动运行 \`listener\`.
 *
 * - 如果 \`listener\` 已经在监听 \`event_type\`, 则调用本函数不会有任何效果.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册的函数
 *
 * @example
 * function hello() { alert("hello"); }
 * eventOn(要监听的事件, hello);
 *
 * @example
 * // 消息被修改时监听是哪一条消息被修改
 * // 能这么做是因为酒馆 MESSAGE_UPDATED 会发送消息 id 回来, 但是这个发送太自由了, 我还没整理出每种消息会发送什么
 * function detectMessageUpdated(message_id) {
 *   alert(\`你刚刚修改了第 \${message_id} 条聊天消息对吧😡\`);
 * }
 * eventOn(tavern_events.MESSAGE_UPDATED, detectMessageUpdated);
 */
function eventOn(event_type, listener) {
    if (detail.try_get_wrapper(listener, event_type)) {
        console.warn(\`[Event][eventOn](\${getIframeName()}) 函数已经在监听 '\${event_type}' 事件, 调用无效\\n\\n  \${detail.format_function_to_string(listener)}\`);
        return;
    }
    sillyTavern().eventSource.on(event_type, detail.get_or_make_wrapper(listener, event_type, false));
    console.info(\`[Event][eventOn](\${getIframeName()}) 函数开始监听 '\${event_type}' 事件并将随事件触发\\n\\n  \${detail.format_function_to_string(listener)}\`);
}
/**
 * 让 \`listener\` 监听 \`event_type\`, 当事件发生时自动在最后运行 \`listener\`.
 *
 * - 如果 \`listener\` 已经在监听 \`event_type\`, 则调用本函数会将 \`listener\` 调整为最后运行.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册/调整到最后运行的函数
 *
 * @example
 * eventMakeLast(要监听的事件, 要注册的函数);
 */
function eventMakeLast(event_type, listener) {
    const is_listening = detail.try_get_wrapper(listener, event_type) !== undefined;
    sillyTavern().eventSource.makeLast(event_type, detail.get_or_make_wrapper(listener, event_type, false));
    if (is_listening) {
        console.info(\`[Event][eventMakeLast](\${getIframeName()}) 函数调整为监听到 '\${event_type}' 事件时最后触发\\n\\n  \${detail.format_function_to_string(listener)}\`);
    }
    else {
        console.info(\`[Event][eventMakeLast](\${getIframeName()}) 函数开始监听 '\${event_type}' 事件并将随事件最后触发\\n\\n  \${detail.format_function_to_string(listener)}\`);
    }
}
/**
 * 让 \`listener\` 监听 \`event_type\`, 当事件发生时自动在最先运行 \`listener\`.
 *
 * - 如果 \`listener\` 已经在监听 \`event_type\`, 则调用本函数会将 \`listener\` 调整为最先运行.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册/调整为最先运行的函数
 *
 * @example
 * eventMakeFirst(要监听的事件, 要注册的函数);
 */
function eventMakeFirst(event_type, listener) {
    const is_listening = detail.try_get_wrapper(listener, event_type) !== undefined;
    sillyTavern().eventSource.makeFirst(event_type, detail.get_or_make_wrapper(listener, event_type, false));
    if (is_listening) {
        console.info(\`[Event][eventMakeFirst](\${getIframeName()}) 函数调整为监听到 '\${event_type}' 事件时最先触发\\n\\n  \${detail.format_function_to_string(listener)}\`);
    }
    else {
        console.info(\`[Event][eventMakeFirst](\${getIframeName()}) 函数开始监听 '\${event_type}' 事件并将随事件最先触发\\n\\n  \${detail.format_function_to_string(listener)}\`);
    }
}
/**
 * 让 \`listener\` 仅监听下一次 \`event_type\`, 当该次事件发生时运行 \`listener\`, 此后取消监听.
 *
 * - 如果 \`listener\` 已经在监听 \`event_type\`, 则调用本函数不会有任何效果.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册的函数
 *
 * @example
 * eventOnce(要监听的事件, 要注册的函数);
 */
function eventOnce(event_type, listener) {
    if (detail.try_get_wrapper(listener, event_type)) {
        console.warn(\`[Event][eventOnce](\${getIframeName()}) 函数已经在监听 '\${event_type}' 事件, 调用无效\\n\\n  \${detail.format_function_to_string(listener)}\`);
        return;
    }
    sillyTavern().eventSource.once(event_type, detail.get_or_make_wrapper(listener, event_type, true));
    console.info(\`[Event][eventOnce](\${getIframeName()}) 函数开始监听下一次 '\${event_type}' 事件并仅在该次事件时触发\\n\\n  \${detail.format_function_to_string(listener)}\`);
}
async function eventWaitOnce(event_type, listener) {
    if (!listener) {
        const do_nothing = () => { };
        eventOnce(event_type, do_nothing);
        return await eventWaitOnce(event_type, do_nothing);
    }
    const entry = \`\${event_type}#\${listener.toString()}\`;
    return new Promise((resolve, _) => {
        const uid = Date.now() + Math.random();
        function handleMessage(event) {
            if (event.data?.request === "iframe_event_wait_callback" && event.data.uid == uid) {
                window.removeEventListener("message", handleMessage);
                resolve(event.data.result);
                detail.waiting_event_map.deleteEntry(entry, uid);
                console.info(\`[Event][eventWaitOnce](\${getIframeName()}) 等待到函数因 '\${event_type}' 事件触发后的执行结果: \${JSON.stringify(event.data.result)}\\n\\n  \${detail.format_function_to_string(listener)}\`);
            }
        }
        window.addEventListener("message", handleMessage);
        detail.waiting_event_map.put(entry, uid);
        console.info(\`[Event][eventWaitOnce](\${getIframeName()}) 等待函数被 '\${event_type}' 事件触发\\n\\n  \${detail.format_function_to_string(listener)}\`);
    });
}
/**
 * 让 \`listener\` 取消对 \`event_type\` 的监听.
 *
 * - 如果 \`listener\` 没有监听 \`event_type\`, 则调用本函数不会有任何效果.
 *
 * @param event_type 要监听的事件
 * @param listener 要取消注册的函数
 *
 * @example
 * eventRemoveListener(要监听的事件, 要取消注册的函数);
 */
function eventRemoveListener(event_type, listener) {
    const wrapper = detail.try_get_wrapper(listener, event_type);
    if (!wrapper) {
        console.warn(\`[Event][eventRemoveListener](\${getIframeName()}) 函数没有监听 '\${event_type}' 事件, 调用无效\\n\\n  \${detail.format_function_to_string(listener)}\`);
        return;
    }
    sillyTavern().eventSource.removeListener(event_type, wrapper);
    detail.remove_wrapper(listener, event_type);
    console.info(\`[Event][eventRemoveListener](\${getIframeName()}) 函数不再监听 '\${event_type}' 事件\\n\\n  \${detail.format_function_to_string(listener)}\`);
}
/**
 * 取消本 iframe 中对 \`event_type\` 的所有监听
 *
 * @param event_type 要取消监听的事件
 */
function eventClearEvent(event_type) {
    detail.listener_event_wrapper_map.forEach((event_wrapper_map, _) => {
        const wrapper = event_wrapper_map.get(event_type);
        if (wrapper) {
            sillyTavern().eventSource.removeListener(event_type, wrapper);
            event_wrapper_map.delete(event_type);
        }
    });
    console.info(\`[Event][eventClearEvent](\${getIframeName()})所有函数都不再监听 '\${event_type}' 事件\`);
}
/**
 * 取消本 iframe 中 \`listener\` 的的所有监听
 *
 * @param listener 要取消注册的函数
 */
function eventClearListener(listener) {
    const event_callback_map = detail.extract(detail.listener_event_wrapper_map, listener);
    if (event_callback_map) {
        event_callback_map.forEach((callback, event_type) => {
            sillyTavern().eventSource.removeListener(event_type, callback);
        });
    }
    console.info(\`[Event][eventClearListener](\${getIframeName()}) 函数不再监听任何事件\\n\\n  \${detail.format_function_to_string(listener)}\`);
}
/**
 * 取消本 iframe 中对所有事件的所有监听
 */
function eventClearAll() {
    detail.listener_event_wrapper_map.forEach((event_wrapper_map, _) => {
        event_wrapper_map.forEach((wrapper, event_type) => {
            sillyTavern().eventSource.removeListener(event_type, wrapper);
        });
    });
    detail.listener_event_wrapper_map.clear();
    console.info(\`[Event][eventClearAll](\${getIframeName()}) 取消所有函数对所有事件的监听\`);
}
// iframe 事件
const iframe_events = {
    MESSAGE_IFRAME_RENDER_STARTED: 'message_iframe_render_started',
    MESSAGE_IFRAME_RENDER_ENDED: 'message_iframe_render_ended',
    GENERATION_STARTED: 'js_generation_started', // \`generate\` 函数开始生成
    STREAM_TOKEN_RECEIVED_FULLY: 'js_stream_token_received_fully', // 启用流式传输的 \`generate\` 函数传输当前完整文本: "这是", "这是一条", "这是一条流式传输"
    STREAM_TOKEN_RECEIVED_INCREMENTALLY: 'js_stream_token_received_incrementally', // 启用流式传输的 \`generate\` 函数传输当前增量文本: "这是", "一条", "流式传输"
    GENERATION_ENDED: 'js_generation_ended', // \`generate\` 函数完成生成
};
// 酒馆事件. **不建议自己发送酒馆事件, 因为你并不清楚它需要发送什么数据**
const tavern_events = {
    APP_READY: 'app_ready',
    EXTRAS_CONNECTED: 'extras_connected',
    MESSAGE_SWIPED: 'message_swiped',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_RECEIVED: 'message_received',
    MESSAGE_EDITED: 'message_edited',
    MESSAGE_DELETED: 'message_deleted',
    MESSAGE_UPDATED: 'message_updated',
    MESSAGE_FILE_EMBEDDED: 'message_file_embedded',
    IMPERSONATE_READY: 'impersonate_ready',
    CHAT_CHANGED: 'chat_id_changed',
    GENERATION_AFTER_COMMANDS: 'GENERATION_AFTER_COMMANDS',
    GENERATION_STARTED: 'generation_started',
    GENERATION_STOPPED: 'generation_stopped',
    GENERATION_ENDED: 'generation_ended',
    EXTENSIONS_FIRST_LOAD: 'extensions_first_load',
    EXTENSION_SETTINGS_LOADED: 'extension_settings_loaded',
    SETTINGS_LOADED: 'settings_loaded',
    SETTINGS_UPDATED: 'settings_updated',
    GROUP_UPDATED: 'group_updated',
    MOVABLE_PANELS_RESET: 'movable_panels_reset',
    SETTINGS_LOADED_BEFORE: 'settings_loaded_before',
    SETTINGS_LOADED_AFTER: 'settings_loaded_after',
    CHATCOMPLETION_SOURCE_CHANGED: 'chatcompletion_source_changed',
    CHATCOMPLETION_MODEL_CHANGED: 'chatcompletion_model_changed',
    OAI_PRESET_CHANGED_BEFORE: 'oai_preset_changed_before',
    OAI_PRESET_CHANGED_AFTER: 'oai_preset_changed_after',
    OAI_PRESET_EXPORT_READY: 'oai_preset_export_ready',
    OAI_PRESET_IMPORT_READY: 'oai_preset_import_ready',
    WORLDINFO_SETTINGS_UPDATED: 'worldinfo_settings_updated',
    WORLDINFO_UPDATED: 'worldinfo_updated',
    CHARACTER_EDITED: 'character_edited',
    CHARACTER_PAGE_LOADED: 'character_page_loaded',
    CHARACTER_GROUP_OVERLAY_STATE_CHANGE_BEFORE: 'character_group_overlay_state_change_before',
    CHARACTER_GROUP_OVERLAY_STATE_CHANGE_AFTER: 'character_group_overlay_state_change_after',
    USER_MESSAGE_RENDERED: 'user_message_rendered',
    CHARACTER_MESSAGE_RENDERED: 'character_message_rendered',
    FORCE_SET_BACKGROUND: 'force_set_background',
    CHAT_DELETED: 'chat_deleted',
    CHAT_CREATED: 'chat_created',
    GROUP_CHAT_DELETED: 'group_chat_deleted',
    GROUP_CHAT_CREATED: 'group_chat_created',
    GENERATE_BEFORE_COMBINE_PROMPTS: 'generate_before_combine_prompts',
    GENERATE_AFTER_COMBINE_PROMPTS: 'generate_after_combine_prompts',
    GENERATE_AFTER_DATA: 'generate_after_data',
    GROUP_MEMBER_DRAFTED: 'group_member_drafted',
    WORLD_INFO_ACTIVATED: 'world_info_activated',
    TEXT_COMPLETION_SETTINGS_READY: 'text_completion_settings_ready',
    CHAT_COMPLETION_SETTINGS_READY: 'chat_completion_settings_ready',
    CHAT_COMPLETION_PROMPT_READY: 'chat_completion_prompt_ready',
    CHARACTER_FIRST_MESSAGE_SELECTED: 'character_first_message_selected',
    // TODO: Naming convention is inconsistent with other events
    CHARACTER_DELETED: 'characterDeleted',
    CHARACTER_DUPLICATED: 'character_duplicated',
    STREAM_TOKEN_RECEIVED: 'stream_token_received',
    FILE_ATTACHMENT_DELETED: 'file_attachment_deleted',
    WORLDINFO_FORCE_ACTIVATE: 'worldinfo_force_activate',
    OPEN_CHARACTER_LIBRARY: 'open_character_library',
    ONLINE_STATUS_CHANGED: 'online_status_changed',
    IMAGE_SWIPED: 'image_swiped',
    CONNECTION_PROFILE_LOADED: 'connection_profile_loaded',
    TOOL_CALLS_PERFORMED: 'tool_calls_performed',
    TOOL_CALLS_RENDERED: 'tool_calls_rendered',
};
//------------------------------------------------------------------------------------------------------------------------
var detail;
(function (detail) {
    detail.listener_event_wrapper_map = new Map();
    function try_get_wrapper(listener, event_type) {
        return detail.listener_event_wrapper_map.get(listener)?.get(event_type);
    }
    detail.try_get_wrapper = try_get_wrapper;
    function remove_wrapper(listener, event_type) {
        detail.listener_event_wrapper_map.get(listener)?.delete(event_type);
    }
    detail.remove_wrapper = remove_wrapper;
    function get_or_make_wrapper(listener, event_type, once) {
        const default_wrapper = async (...args) => {
            if (once) {
                remove_wrapper(listener, event_type);
            }
            const result = await listener(...args);
            console.info(\`[Event][callback '\${event_type}'](\${getIframeName()}) 函数因监听到 '\${event_type}' 事件而触发\\n\\n  \${detail.format_function_to_string(listener)}\`);
            const uid = detail.waiting_event_map.get(\`\${event_type}#\${listener.toString()}\`)[0];
            if (uid) {
                window.postMessage({
                    request: 'iframe_event_wait_callback',
                    uid: uid,
                    result: result,
                }, '*');
            }
            return result;
        };
        const default_event_wrapper_map = new Map([[event_type, default_wrapper]]);
        const event_wrapper = detail.get_or_set(detail.listener_event_wrapper_map, listener, () => default_event_wrapper_map);
        const wrapper = detail.get_or_set(event_wrapper, event_type, () => default_wrapper);
        return wrapper;
    }
    detail.get_or_make_wrapper = get_or_make_wrapper;
    detail.waiting_event_map = new ArrayMultimap();
    $(window).on('unload', eventClearAll);
})(detail || (detail = {}));
//------------------------------------------------------------------------------------------------------------------------
// 已被弃用的接口, 请尽量按照指示更新它们
/**
 * @deprecated 已弃用, 请使用 eventOn
 */
const tavernOn = eventOn;
/**
 * @deprecated 已弃用, 请使用 eventMakeLast
 */
const tavernMakeLast = eventMakeLast;
/**
 * @deprecated 已弃用, 请使用 eventMakeFirst
 */
const tavernMakeFirst = eventMakeFirst;
/**
 * @deprecated 已弃用, 请使用 eventOnce
 */
const tavernOnce = eventOnce;
/**
 * @deprecated 已弃用, 请使用 eventRemoveListener
 */
const tavernRemoveListener = eventRemoveListener;
`