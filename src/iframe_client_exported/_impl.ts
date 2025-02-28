export const iframe_client__impl = `
var detail;
(function (detail) {
    ;
    async function make_iframe_promise(message) {
        return new Promise((resolve, _) => {
            const uid = Date.now() + Math.random();
            function handleMessage(event) {
                if (event.data?.request === (message.request + "_callback") && event.data.uid == uid) {
                    window.removeEventListener("message", handleMessage);
                    resolve(event.data.result);
                }
            }
            window.addEventListener("message", handleMessage);
            window.parent.postMessage({
                uid: uid,
                ...message,
            }, "*");
        });
    }
    detail.make_iframe_promise = make_iframe_promise;
    function format_function_to_string(fn) {
        const string = fn.toString();
        const index = string.indexOf('\\n');
        if (index > -1) {
            return string.slice(0, index);
        }
        else {
            return string;
        }
    }
    detail.format_function_to_string = format_function_to_string;
    function get_or_set(map, key, defaulter) {
        const existing_value = map.get(key);
        if (existing_value) {
            return existing_value;
        }
        const default_value = defaulter();
        map.set(key, default_value);
        return default_value;
    }
    detail.get_or_set = get_or_set;
    function extract(map, key) {
        const value = map.get(key);
        if (!value) {
            return undefined;
        }
        map.delete(key);
        return value;
    }
    detail.extract = extract;
})(detail || (detail = {}));
`