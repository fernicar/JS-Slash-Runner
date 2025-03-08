import { event_types, eventSource, getCurrentChatId } from '../../../../../../../script.js';
import { initialize as initializeLibrary, destroy as destroyLibrary } from './library.js';
import { initialize as initializeModule, destroy as destroyModule } from './module.js';
import { initialize as initializeScriptIframe, destroy as destroyScriptIframe } from './script_iframe.js';
const load_events = [event_types.CHAT_CHANGED];
export function initializeCharacterLevelOnExtension() {
    if (!getCurrentChatId()) {
        initializeModule();
        initializeLibrary();
        initializeScriptIframe();
    }
    load_events.forEach(eventType => {
        eventSource.makeFirst(eventType, initializeScriptIframe);
        eventSource.makeFirst(eventType, initializeLibrary);
        eventSource.makeFirst(eventType, initializeModule);
    });
}
export function destroyCharacterLevelOnExtension() {
    load_events.forEach(eventType => {
        eventSource.removeListener(eventType, initializeScriptIframe);
        eventSource.removeListener(eventType, initializeLibrary);
        eventSource.removeListener(eventType, initializeModule);
    });
    destroyScriptIframe();
    destroyLibrary();
    destroyModule();
}
//# sourceMappingURL=index.js.map