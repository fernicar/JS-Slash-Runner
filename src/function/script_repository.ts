import { ScriptData } from '@/component/script_repository/data';
import { ScriptManager } from '@/component/script_repository/script_controller';

interface ScriptButton {
  name: string;
  visible: boolean;
}

/**
 * Get script buttons
 * @param script_id Script ID
 * @returns Button array
 */
export function getScriptButtons(script_id: string): ScriptButton[] {
  if (!script_id) {
    throw new Error('Script ID cannot be empty');
  }
  return ScriptManager.getInstance().getScriptButton(script_id);
}

/**
 * Modify the button array of the specified script
 * @param script_id Script ID
 * @param buttons Script array
 */
export function replaceScriptButtons(script_id: string, buttons: ScriptButton[]): void {
  if (!script_id) {
    throw new Error(`Script ID cannot be empty`);
  }

  const script = ScriptManager.getInstance().getScriptById(script_id);
  if (!script) {
    throw new Error(`Script does not exist: ${script_id}`);
  }

  const type = ScriptData.getInstance().getScriptType(script);

  script.buttons = buttons;
  ScriptManager.getInstance().setScriptButton(script, type);
}
