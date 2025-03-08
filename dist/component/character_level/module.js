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
  return window.SillyTavern.getContext();
}
`;
    return library + code;
}
export async function initialize() {
    destroy();
    const scripts = loadScripts("模块-");
    console.info(`[Module] 加载模块: ${JSON.stringify(scripts.map(module => module.name))}`);
    if (scripts.length > 0) {
        const error_message = `该功能出于安全性考虑已暂时关闭，请等待前端助手 3.0`;
        // @ts-expect-error
        toastr.error(error_message);
        console.error(error_message);
    }
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