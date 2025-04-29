import { extensionFolderPath } from '@/util/extension_variables';

import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';
import { loadFileToDocument } from '@sillytavern/scripts/utils';

// 导入MVC组件
import { VariableController } from './VariableController';
import { VariableModel } from './VariableModel';
import { VariableSyncService } from './VariableSyncService';
import { VariableView } from './VariableView';

const templatePath = `${extensionFolderPath}/src/component/script_repository/variable_manager`;

// 保存变量视图实例，以便外部函数可以访问
let variableView: VariableView | null = null;

/**
 * 初始化变量管理器
 * 加载模板、初始化MVC结构，但不显示浮窗
 */
export async function initVariableManager() {
  // 加载CSS
  await loadFileToDocument(`/scripts/extensions/${templatePath}/style.css`, 'css');

  // 渲染HTML模板
  const $variableManagerContainer = $(await renderExtensionTemplateAsync(`${templatePath}`, 'index'));

  // 创建并初始化MVC组件
  const model = new VariableModel();
  variableView = new VariableView($variableManagerContainer);
  const syncService = new VariableSyncService();
  const controller = new VariableController(model, variableView, syncService);

  // 初始化控制器
  await controller.init($variableManagerContainer);
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
