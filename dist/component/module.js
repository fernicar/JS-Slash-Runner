// TODO: 支持前端助手的各种函数
import { event_types, eventSource } from '../../../../../../script.js';
import { script_url } from '../script_url.js';
import { loadScripts } from '../util/load_script.js';
let modules = new Map();
const load_events = [
    event_types.CHAT_CHANGED
];
function destroyIfInitialized() {
    modules.forEach((value, key) => {
        if (value.onUnload) {
            value.onUnload();
        }
        script_url.delete(key);
    });
}
async function initialize() {
    destroyIfInitialized();
    const scripts = loadScripts("模块-");
    console.info(`[Module] 加载模块: ${JSON.stringify(scripts.map(module => module.name))}`);
    for (const script of scripts) {
        script_url.set(script.name, script.code);
        const module = await import(script_url.get(script.name));
        if (module.onLoad) {
            module.onLoad();
        }
        modules.set(script.name, module);
    }
}
export async function initializeModulesOnExtension() {
    await initialize();
    load_events.forEach((eventType) => {
        eventSource.on(eventType, initialize);
    });
}
export function destroyModulesOnExtension() {
    load_events.forEach((eventType) => {
        eventSource.removeListener(eventType, initialize);
    });
    destroyIfInitialized();
}
//# sourceMappingURL=module.js.map