// TODO: 支持前端助手的各种函数
import { script_url } from '../../script_url.js';
import { loadScripts } from '../../util/load_script.js';
let modules = new Map();
export function destroy() {
    modules.forEach((value, key) => {
        if (value.onUnload) {
            value.onUnload();
        }
        script_url.delete(key);
    });
}
function include_library(code) {
    const library = `
function sillyTavern() {
  return window.SillyTavern;
}
`;
    return library + code;
}
export async function initialize() {
    destroy();
    const scripts = loadScripts("模块-");
    console.info(`[Module] 加载模块: ${JSON.stringify(scripts.map(module => module.name))}`);
    for (const script of scripts) {
        script_url.set(script.name, include_library(script.code));
        const module = await import(script_url.get(script.name));
        if (module.onLoad) {
            module.onLoad();
        }
        modules.set(script.name, module);
    }
}
//# sourceMappingURL=module.js.map