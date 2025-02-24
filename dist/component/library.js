import { event_types, eventSource } from '../../../../../../script.js';
import { loadScripts } from '../util/load_script.js';
export let libraries_text = "";
const load_events = [
    event_types.CHAT_CHANGED
];
function initialize() {
    const libraries = loadScripts("库-");
    console.info(`[Library] 加载库: ${JSON.stringify(libraries.map(library => library.name))}`);
    libraries_text = libraries.map(script => script.code).join('\n');
}
function destroy() {
    libraries_text = "";
}
export function initializeLibrariesOnExtension() {
    initialize();
    load_events.forEach((eventType) => {
        eventSource.on(eventType, initialize);
    });
}
export function destroyLibrariesOnExtension() {
    load_events.forEach((eventType) => {
        eventSource.removeListener(eventType, initialize);
    });
    destroy();
}
//# sourceMappingURL=library.js.map