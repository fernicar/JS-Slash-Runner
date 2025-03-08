import { extract } from './util/helper.js';
function createObjectURLFromScript(code) {
    return URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
}
class ScriptUrl {
    map = new Map();
    get(name) {
        return this.map.get(name);
    }
    set(name, code) {
        this.map.set(name, createObjectURLFromScript(code));
    }
    delete(name) {
        const url = extract(this.map, name);
        if (!url) {
            return url;
        }
        URL.revokeObjectURL(url);
        return url;
    }
}
export let script_url = new ScriptUrl();
//# sourceMappingURL=script_url.js.map