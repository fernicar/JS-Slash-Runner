import { loadScripts } from '../../util/load_script.js';
export let libraries_text = '';
export function initialize() {
    const libraries = loadScripts('库-');
    console.info(`[Library] 加载库: ${JSON.stringify(libraries.map(library => library.name))}`);
    libraries_text = libraries.map(script => script.code).join('\n');
}
export function destroy() {
    libraries_text = '';
}
//# sourceMappingURL=library.js.map