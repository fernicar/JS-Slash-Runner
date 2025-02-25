import { event_types, eventSource } from '../../../../../../script.js';
import { loadScripts } from '../util/load_script.js';

export let libraries_text: string = "";

const load_events = [
  event_types.CHAT_CHANGED
] as const;

function initialize(): void {
  const libraries = loadScripts("库-");
  console.info(`[Library] 加载库: ${JSON.stringify(libraries.map(library => library.name))}`);

  libraries_text = libraries.map(script => script.code).join('\n');
}

function destroy(): void {
  libraries_text = "";
}

export function initializeLibrariesOnExtension() {
  initialize();
  load_events.forEach((eventType) => {
    eventSource.makeFirst(eventType, initialize);
  });
}

export function destroyLibrariesOnExtension() {
  load_events.forEach((eventType) => {
    eventSource.removeListener(eventType, initialize);
  });
  destroy();
}
