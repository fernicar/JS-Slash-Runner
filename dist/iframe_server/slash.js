import { executeSlashCommandsWithOptions } from '../../../../../slash-commands.js';
import { getLogPrefix, registerIframeHandler } from './index.js';
export function registerIframeSlashHandler() {
    registerIframeHandler('[Slash][triggerSlash]', async (event) => {
        const command = event.data.command;
        const result = await executeSlashCommandsWithOptions(command);
        if (result.isError) {
            throw Error(`运行 Slash 命令 '${command}' 时出错: ${result.errorMessage}`);
        }
        console.info(`${getLogPrefix(event)}运行 Slash 命令: ${command}`);
    });
    registerIframeHandler('[Slash][triggerSlashWithResult]', async (event) => {
        const command = event.data.command;
        const result = await executeSlashCommandsWithOptions(command);
        if (result.isError) {
            throw Error(`运行 Slash 命令 '${command}' 时出错: ${result.errorMessage}`);
        }
        console.info(`${getLogPrefix(event)}运行 Slash 命令 '${command}', 结果: ${result.pipe}`);
        return result.pipe;
    });
}
//# sourceMappingURL=slash.js.map