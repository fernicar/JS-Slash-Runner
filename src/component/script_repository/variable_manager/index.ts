import { extensionFolderPath } from '@/util/extension_variables';

import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';
import { loadFileToDocument } from '@sillytavern/scripts/utils';

// 导入MVC组件
import { VariableController } from './VariableController';
import { VariableModel } from './VariableModel';
import { VariableSyncService } from './VariableSyncService';
import { VariableView } from './VariableView';

const templatePath = `${extensionFolderPath}/src/component/script_repository/variable_manager`;

/**
 * 初始化变量管理器
 * 加载模板、初始化MVC结构
 */
export async function initVariableManager() {
  // 加载CSS
  await loadFileToDocument(`/scripts/extensions/${templatePath}/style.css`, 'css');

  // 渲染HTML模板
  const $variableManagerContainer = $(await renderExtensionTemplateAsync(`${templatePath}`, 'index'));

  // 创建并初始化MVC组件
  const model = new VariableModel();
  const view = new VariableView($variableManagerContainer);
  const syncService = new VariableSyncService();
  const controller = new VariableController(model, view, syncService);

  // 初始化控制器
  await controller.init($variableManagerContainer);

  // 使用新的浮窗方式显示变量管理器
  view.render();
}
