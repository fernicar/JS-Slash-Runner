export const iframe_client_audio = `
async function audioMode(params) {
    return detail.make_iframe_promise({
        request: '[Audio][audioMode]',
        type: params.type,
        mode: params.mode,
    });
}
async function audioEnable(params) {
    return detail.make_iframe_promise({
        request: '[Audio][audioEnable]',
        type: params.type,
        state: params.state,
    });
}
async function audioPlay(params) {
    return detail.make_iframe_promise({
        request: '[Audio][audioPlay]',
        type: params.type,
        play: params.play,
    });
}
async function audioImport(params, url) {
    return detail.make_iframe_promise({
        request: '[Audio][audioImport]',
        type: params.type,
        url: url,
        play: params.play,
    });
}
async function audioSelect(params, url) {
    return detail.make_iframe_promise({
        request: '[Audio][audioSelect]',
        type: params.type,
        url: url,
    });
}
`;
//# sourceMappingURL=audio.js.map