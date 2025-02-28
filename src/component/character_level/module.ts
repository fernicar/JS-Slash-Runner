// TODO: 支持前端助手的各种函数
import { script_url } from '../../script_url.js';
import { loadScripts } from '../../util/load_script.js';

interface Module {
  onLoad?(): void;
  onUnload?(): void;
}

let modules: Map<string, Module> = new Map();

export function destroy(): void {
  modules.forEach((value, key) => {
    if (value.onUnload) {
      value.onUnload();
    }
    script_url.delete(key);
  })
}

function include_library(code: string): string {
  const library: string = `
function sillyTavern() {
  return window.SillyTavern.getContext();
}
` as const;

  return library + code;
}

export async function initialize(): Promise<void> {
  destroy();

  const scripts = loadScripts("模块-");
  console.info(`[Module] 加载模块: ${JSON.stringify(scripts.map(module => module.name))}`);

  for (const script of scripts) {
    script_url.set(script.name, include_library(script.code));
    const module: Module = await import(script_url.get(script.name) as string);
    if (module.onLoad) {
      module.onLoad();
    }
    modules.set(script.name, module);
  }
}
