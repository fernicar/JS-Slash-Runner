import { audioMode, audioEnable, audioPlay, audioImport, audioSelect } from '../slash_command/audio.js';
import { getLogPrefix, registerIframeHandler } from './index.js';
export function registerIframeAudioHandler() {
    registerIframeHandler('[Audio][audioMode]', async (event) => {
        const type = event.data.type;
        const mode = event.data.mode;
        await audioMode({ type, mode });
        console.info(`${getLogPrefix(event)} 切换音频模式: ${type}-${mode}`);
    });
    registerIframeHandler('[Audio][audioEnable]', async (event) => {
        const type = event.data.type;
        const state = event.data.state;
        await audioEnable({ type, state });
        console.info(`${getLogPrefix(event)} 切换音频状态: ${type}-${state}`);
    });
    registerIframeHandler('[Audio][audioPlay]', async (event) => {
        const type = event.data.type;
        const play = event.data.play;
        await audioPlay({ type, play });
        console.info(`${getLogPrefix(event)} 切换音频播放状态: ${type}-${play}`);
    });
    registerIframeHandler('[Audio][audioImport]', async (event) => {
        const type = event.data.type;
        const url = event.data.url;
        const play = event.data.play;
        await audioImport({ type, play }, url);
        console.info(`${getLogPrefix(event)} 导入音频: ${type}-${url}-${play}`);
    });
    registerIframeHandler('[Audio][audioSelect]', async (event) => {
        const type = event.data.type;
        const url = event.data.url;
        await audioSelect({ type }, url);
        console.info(`${getLogPrefix(event)} 选择音频: ${type}-${url}`);
    });
}
//# sourceMappingURL=audio.js.map