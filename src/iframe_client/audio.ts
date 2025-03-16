type AudioType = 'bgm' | 'ambient';

type AudioMode = 'repeat' | 'stop' | 'random' | 'single';

interface AudioModeParams {
  type: AudioType;
  mode: AudioMode;
}

interface AudioEnableParams {
  type: AudioType;
  state?: string;
}

interface AudioPlayParams {
  type: AudioType;
  play?: string;
}

interface AudioImportParams {
  type: AudioType;
  play?: string;
}

interface AudioSelectParams {
  type: AudioType;
}

async function audioMode(params: AudioModeParams) {
  return detail.make_iframe_promise({
    request: '[Audio][audioMode]',
    type: params.type,
    mode: params.mode,
  });
}

async function audioEnable(params: AudioEnableParams) {
  return detail.make_iframe_promise({
    request: '[Audio][audioEnable]',
    type: params.type,
    state: params.state,
  });
}

async function audioPlay(params: AudioPlayParams) {
  return detail.make_iframe_promise({
    request: '[Audio][audioPlay]',
    type: params.type,
    play: params.play,
  });
}

async function audioImport(params: AudioImportParams, url: string) {
  return detail.make_iframe_promise({
    request: '[Audio][audioImport]',
    type: params.type,
    url: url,
    play: params.play,
  });
}

async function audioSelect(params: AudioSelectParams, url: string) {
  return detail.make_iframe_promise({
    request: '[Audio][audioSelect]',
    type: params.type,
    url: url,
  });
}
