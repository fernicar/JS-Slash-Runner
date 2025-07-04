import { ScriptManager } from '@/component/script_repository/script_controller';
import { Script } from '@/component/script_repository/types';
import { ScriptData } from '@/component/script_repository/data';

/**
 * 获取指定脚本的按钮数组
 * @param script_id 脚本ID
 * @returns 按钮数组
 */
export function getScriptButton(script_id: string): Script['buttons'] {
  if (!script_id) {
    throw new Error('脚本ID不能为空');
  }
  return ScriptManager.getInstance().getScriptButton(script_id);
}

/**
 * 修改指定脚本的按钮数组
 * @param script_id 脚本ID
 * @param buttons 脚本数组
 */
export function setScriptButton(script_id: string, buttons: Script['buttons']): void {
  if (!script_id) {
    throw new Error(`脚本ID不能为空`);
  }

  const script = ScriptManager.getInstance().getScriptById(script_id);
  if (!script) {
    throw new Error(`脚本不存在: ${script_id}`);
  }

  const type = ScriptData.getInstance().getScriptType(script);

  script.buttons = buttons;
  ScriptManager.getInstance().setScriptButton(script, type);
}
