import { eventSource } from '@sillytavern/script';
import { Script } from './types';

// 按钮基类
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

  // 初始化容器
  initContainer(): void {
    const $qrBar = $('#qr--bar');
    if (!$qrBar.length) {
      $('#send_form').append(
        '<div class="flex-container" id="qr--bar" style="gap: 0px;"><div class="qr--buttons qr--color" id="TH-script-buttons"></div></div>',
      );
    } else if (!$qrBar.find('#TH-script-buttons').length) {
      $qrBar.css('gap', '0px').append('<div class="qr--buttons qr--color" id="TH-script-buttons"></div>');
    }

    this.container = $('#TH-script-buttons');
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

    this.initContainer();

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
    if (!this.container) this.initContainer();
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
