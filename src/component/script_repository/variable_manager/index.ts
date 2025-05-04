import { extensionFolderPath } from '@/util/extension_variables';

import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';
import { loadFileToDocument } from '@sillytavern/scripts/utils';

// 导入MVC组件
import { VariableController } from './variable_controller';
import { VariableModel } from './variable_model';
import { VariableSyncService } from './variable_sync';
import { VariableView } from './variable_view';

const templatePath = `${extensionFolderPath}/src/component/script_repository/variable_manager`;

let variableView: VariableView | null = null;
let variableController: VariableController | null = null;

/**
 * 初始化变量管理器
 * 加载模板、初始化，但不显示浮窗
 */
export async function initVariableManager() {
  await loadFileToDocument(`/scripts/extensions/${templatePath}/style.css`, 'css');

  const $variableManagerContainer = $(await renderExtensionTemplateAsync(`${templatePath}`, 'index'));

  const model = new VariableModel();
  variableView = new VariableView($variableManagerContainer);
  const syncService = new VariableSyncService(variableView);
  variableController = new VariableController(model, variableView, syncService);

  // 设置视图对控制器的引用，以便在unrender时能调用cleanup
  variableView.setController(variableController);

  await variableController.init($variableManagerContainer);
  showVariableManager();
}

/**
 * 显示变量管理器浮窗
 */
export function showVariableManager() {
  if (variableView) {
    variableView.render();
  } else {
    console.error('[VariableManager] 变量管理器未初始化');
  }
}
