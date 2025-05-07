import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';
import { loadFileToDocument } from '@sillytavern/scripts/utils';

import { VariableController } from '@/component/variable_manager/controller';
import { VariableModel } from '@/component/variable_manager/model';
import { VariableSyncService } from '@/component/variable_manager/sync';
import { VariableView } from '@/component/variable_manager/view';
import { extensionFolderPath } from '@/util/extension_variables';

const templatePath = `${extensionFolderPath}/src/component/variable_manager/public`;

let variableView: VariableView | null = null;
let variableController: VariableController | null = null;

/**
 * 初始化变量管理器
 */
export async function openVariableManager() {
  await loadFileToDocument(`/scripts/extensions/${templatePath}/style.css`, 'css');

  const $variableManagerContainer = $(await renderExtensionTemplateAsync(`${templatePath}`, 'index'));

  const model = new VariableModel();
  variableView = new VariableView($variableManagerContainer);

  const syncService = new VariableSyncService(variableView, model);

  variableController = new VariableController(model, variableView, syncService);

  variableView.setController(variableController);

  await variableController.init($variableManagerContainer);
  if (variableView) {
    variableView.render();
  } else {
    console.error('[VariableManager] 变量管理器未初始化');
  }
}

export function initVariableManager() {
  const $button = $('#open-variable-manager');
  if ($button.length) {
    $button.on('click', async () => {
      await openVariableManager();
    });
  }
}
