import { ScriptManager } from '@/component/script_repository/script_controller';
import { eventSource } from '@sillytavern/script';
import { Script } from './types';

export abstract class Button {
  id: string;
  name: string;
  visible: boolean;
  scriptId: string;

  constructor(name: string, scriptId: string, visible: boolean = true) {
    this.id = `${scriptId}_${name}`;
    this.name = name;
    this.scriptId = scriptId;
    this.visible = visible;
  }

  // 渲染按钮HTML
  abstract render(): string;

  // 绑定事件
  abstract bindEvents(): void;

  // 移除按钮
  remove(): void {
    $(`#${this.id}`).remove();
  }
}

// 标准脚本按钮
export class ScriptButton extends Button {
  constructor(name: string, scriptId: string, visible: boolean = true) {
    super(name, scriptId, visible);
  }

  render(): string {
    return `<div class="qr--button menu_button interactable" id="${this.id}">${this.name}</div>`;
  }

  bindEvents(): void {
    $(`#${this.id}`).on('click', () => {
      eventSource.emit(this.id);
      console.log(`[Script] 点击按钮：${this.id}`);
    });
  }
}

// 未来可以扩展不同类型的按钮
export class ButtonFactory {
  static createButton(type: string, name: string, scriptId: string, visible: boolean = true): Button {
    switch (type) {
      case 'script':
      default:
        return new ScriptButton(name, scriptId, visible);
    }
  }
}

// 按钮管理器
export class ButtonManager {
  private container: JQuery<HTMLElement> | null = null;
  private buttons: Button[] = [];

  // 更新容器引用
  updateContainer(): void {
    this.container = $('.qr--buttons');
  }

  // 将按钮从旧容器迁移到新容器
  migrateButtonsToNewContainer(oldContainerId: string, newContainerId: string): void {
    const $oldButtons = $(`#${oldContainerId} .qr--button`);
    const $newContainer = $(`#${newContainerId}`);

    if ($oldButtons.length && $newContainer.length) {
      $oldButtons.detach().appendTo($newContainer);

      // 重新绑定事件
      this.buttons.forEach(button => {
        button.bindEvents();
      });
    }
  }

  // 从脚本数据创建按钮
  createButtonsFromScripts(
    globalScripts: Script[],
    characterScripts: Script[],
    isGlobalEnabled: boolean,
    isCharacterEnabled: boolean,
  ): void {
    this.clearButtons();

    // 检查是否有任何可见按钮
    const hasGlobalVisibleButtons =
      isGlobalEnabled &&
      globalScripts.some(
        script =>
          script.enabled &&
          script.buttons &&
          script.buttons.length > 0 &&
          script.buttons.some(button => button.visible),
      );

    const hasCharacterVisibleButtons =
      isCharacterEnabled &&
      characterScripts.some(
        script =>
          script.enabled &&
          script.buttons &&
          script.buttons.length > 0 &&
          script.buttons.some(button => button.visible),
      );

    if (!hasGlobalVisibleButtons && !hasCharacterVisibleButtons) {
      return;
    }

    // 处理全局脚本按钮
    if (isGlobalEnabled) {
      this.addScriptButtons(globalScripts);
    }

    // 处理角色脚本按钮
    if (isCharacterEnabled) {
      this.addScriptButtons(characterScripts);
    }
  }

  // 添加脚本按钮
  private addScriptButtons(scripts: Script[]): void {
    scripts.forEach(script => {
      if (script.enabled && script.buttons && script.buttons.length > 0) {
        script.buttons.forEach(buttonData => {
          if (buttonData.visible) {
            const button = ButtonFactory.createButton('script', buttonData.name, script.id, buttonData.visible);
            this.addButton(button);
          }
        });
      }
    });
  }

  // 添加按钮
  addButton(button: Button): void {
    if (!this.container) return;
    if (!button.visible) return;

    this.buttons.push(button);
    this.container?.append(button.render());
    button.bindEvents();
  }

  // 移除按钮
  removeButtonsByScriptId(scriptId: string): void {
    const buttonsToRemove = this.buttons.filter(btn => btn.scriptId === scriptId);
    buttonsToRemove.forEach(btn => btn.remove());
    this.buttons = this.buttons.filter(btn => btn.scriptId !== scriptId);
  }

  // 移除所有按钮
  clearButtons(): void {
    this.buttons.forEach(btn => btn.remove());
    this.buttons = [];
  }
}

// 创建按钮管理器实例
const buttonManager = new ButtonManager();

// 新增：提取出来的 setButton 逻辑
function _setButtonLogic() {
  // 更新容器引用
  buttonManager.updateContainer();
  // 获取脚本管理器实例
  const scriptManager = ScriptManager.getInstance();

  // 获取脚本数据
  const globalScripts = scriptManager.getGlobalScripts();
  const characterScripts = scriptManager.getCharacterScripts();
  const isGlobalEnabled = scriptManager.isGlobalScriptEnabled;
  const isCharacterEnabled = scriptManager.isCharacterScriptEnabled;

  // 重新创建按钮
  buttonManager.createButtonsFromScripts(globalScripts, characterScripts, isGlobalEnabled, isCharacterEnabled);
}

/**
 * qr启用或者禁用时重新添加按钮
 */
function bindQrEnabledChangeListener() {
  $(`#qr--isEnabled`).on('change', function () {
    const isChecked = $(this).prop('checked');
    if (!isChecked) {
      // 新建容器
      $('#send_form').append(
        '<div class="flex-container flexGap5" id="qr--bar"><div class="qr--buttons qr--color"></div></div>',
      );
    }

    _setButtonLogic();

    console.log('[script_manager] 创建按钮');
  });
}

/**
 * 解绑 qr--isEnabled 元素的 change 事件监听器
 */
export function unbindQrEnabledChangeListener() {
  $(`#qr--isEnabled`).off('change');
}

/**
 * 根据qr--isEnabled状态处理容器
 */
export function checkQrEnabledStatus() {
  const isQrEnabled = $('#qr--isEnabled').prop('checked');
  if (isQrEnabled) {
    // 如果已勾选，检查qr--bar是否已存在
    const $qrBar = $('#qr--bar');
    if ($qrBar.length) {
      // 容器已存在，检查子容器
      if ($qrBar.find('.qr--buttons').length === 0) {
        $qrBar.append('<div class="qr--buttons qr--color"></div>');
      }
    }
  } else {
    $('#send_form').append(
      '<div class="flex-container flexGap5" id="qr--bar"><div class="qr--buttons qr--color"></div></div>',
    );
  }

  _setButtonLogic();
}

/**
 * 初始化脚本按钮，包括确认qr容器和绑定change事件
 */
export function initScriptButton() {
  checkQrEnabledStatus();
  bindQrEnabledChangeListener();
}
