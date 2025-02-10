import { getLogPrefix, registerIframeHandler } from './index.js';
import { getRequestHeaders } from '../../../../../../script.js';
import { extensionTypes } from '../../../../../extensions.js';
import { t } from '../../../../../i18n.js';
function getExtensionType(extension_id) {
    const id = Object.keys(extensionTypes).find(id => id === extension_id || (id.startsWith('third-party') && id.endsWith(extension_id)));
    return id ? extensionTypes[id] : '';
}
export function registerIframeFrontendVersionHandler() {
    registerIframeHandler('[FrontendVersion][updateFrontendVersion]', async (event) => {
        const extension_name = 'JS-Slash-Runner';
        const response = await fetch('/api/extensions/update', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                extensionName: extension_name,
                global: getExtensionType(extension_name) === 'global',
            }),
        });
        if (!response.ok) {
            const text = await response.text();
            // @ts-expect-error
            toastr.error(text || response.statusText, t `更新前端助手失败`, { timeOut: 5000 });
            console.error(`${getLogPrefix(event)}更新前端助手失败: ${text}`);
            return false;
        }
        const data = await response.json();
        if (data.isUpToDate) {
            console.info(`${getLogPrefix(event)}前端助手已是最新版本, 无需更新`);
        }
        else {
            // @ts-expect-error
            toastr.success(t `成功更新前端助手为 ${data.shortCommitHash}`, t `请刷新页面`);
            console.info(`${getLogPrefix(event)}成功更新前端助手为  ${data.shortCommitHash}, 请刷新页面`);
        }
        return true;
    });
}
//# sourceMappingURL=frontend_version.js.map