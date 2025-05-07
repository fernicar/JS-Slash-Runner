import { destroyIframe } from '@/component/message_iframe';
import { ScriptData } from '@/component/script_repository/data';
import { ScriptRepositoryEventType, scriptEvents } from '@/component/script_repository/events';
import { IFrameElement, Script, ScriptType } from '@/component/script_repository/types';
import { script_url } from '@/script_url';
import third_party from '@/third_party.html';
import { getSettingValue } from '@/util/extension_variables';

/**
 * 脚本执行器 - 内部类，专注于脚本的iframe创建和管理
 */
class ScriptExecutor {
  /**
   * 创建并运行单个脚本
   * @param script 脚本
   * @param type 脚本类型
   */
  async runScript(script: Script, type: ScriptType): Promise<void> {
    const typeName = type === ScriptType.GLOBAL ? '全局' : '局部';

    try {
      // 先检查是否已经存在同名iframe，如果存在则销毁
      const iframeElement = $('iframe').filter(
        (_index, element) => $(element).attr('script-id') === script.id,
      )[0] as IFrameElement;

      if (iframeElement) {
        await destroyIframe(iframeElement);
      }

      // 创建运行脚本的HTML内容
      const htmlContent = this.createScriptHtml(script);

      // 创建新的iframe元素
      const $iframe = $('<iframe>', {
        style: 'display: none;',
        id: `tavern-helper-script-${script.name}`,
        srcdoc: htmlContent,
        'script-id': script.id,
      });

      // 设置加载事件
      $iframe.on('load', () => {
        console.info(`[Script] 启用${typeName}脚本["${script.name}"]`);
      });

      // 添加到页面
      $('body').append($iframe);
    } catch (error) {
      console.error(`[Script] ${typeName}脚本启用失败:["${script.name}"]`, error);
      toastr.error(`${typeName}脚本启用失败:["${script.name}"]`);
      throw error; // 向上抛出异常以便调用方处理
    }
  }

  /**
   * 停止单个脚本
   * @param script 脚本
   * @param type 脚本类型
   */
  async stopScript(script: Script, type: ScriptType): Promise<void> {
    const typeName = type === ScriptType.GLOBAL ? '全局' : '局部';

    const iframeElement = $('iframe').filter(
      (_index, element) => $(element).attr('script-id') === script.id,
    )[0] as IFrameElement;

    if (iframeElement) {
      await destroyIframe(iframeElement);
      console.info(`[Script] 禁用${typeName}脚本["${script.name}"]`);
    }
  }

  /**
   * 创建运行脚本的HTML内容
   * @param script 脚本对象
   * @returns HTML内容
   */
  private createScriptHtml(script: Script): string {
    return `
      <html>
      <head>
        ${third_party}
        <script>
          (function ($) {
            var original$ = $;
            window.$ = function (selector, context) {
              if (context === undefined || context === null) {
                if (window.parent && window.parent.document) {
                  context = window.parent.document;
                } else {
                  console.warn('无法访问 window.parent.document，将使用当前 iframe 的 document 作为上下文。');
                  context = window.document;
                }
              }
              return original$(selector, context);
            };
          })(jQuery);

          SillyTavern = window.parent.SillyTavern.getContext();
          TavernHelper = window.parent.TavernHelper;
          for (const key in TavernHelper) {
            window[key] = TavernHelper[key];
          }
        </script>
        <script src="${script_url.get('iframe_client')}"></script>
      </head>
      <body>
        <script type="module">
          ${script.content}
        </script>
      </body>
      </html>
    `;
  }

  /**
   * 清理所有脚本iframe
   */
  async clearAllScriptsIframe(): Promise<void> {
    const $iframes = $('iframe[id^="tavern-helper-script-"]');
    for (const iframe of $iframes) {
      await destroyIframe(iframe as IFrameElement);
    }
  }
}

/**
 * 脚本管理器 - 负责脚本的运行、停止等核心功能
 * 作为统一入口，内部使用ScriptExecutor处理具体执行
 */
export class ScriptManager {
  private static instance: ScriptManager;
  private scriptData: ScriptData;
  private executor: ScriptExecutor;

  private constructor() {
    this.scriptData = ScriptData.getInstance();
    this.executor = new ScriptExecutor();
    this.registerEventListeners();
  }

  /**
   * 获取脚本管理器实例
   */
  public static getInstance(): ScriptManager {
    if (!ScriptManager.instance) {
      ScriptManager.instance = new ScriptManager();
    }
    return ScriptManager.instance;
  }

  /**
   * 销毁脚本管理器实例
   */
  public static destroyInstance(): void {
    if (ScriptManager.instance) {
      ScriptManager.instance = undefined as unknown as ScriptManager;
    }
  }

  /**
   * 注册事件监听器
   * 将回调数量降到最低，只保留必要的UI交互事件
   */
  private registerEventListeners(): void {
    // 脚本切换事件
    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_TOGGLE, async data => {
      const { script, type, enable, userInput = true } = data;
      await this.toggleScript(script, type, enable, userInput);
    });

    // 类型切换事件
    scriptEvents.on(ScriptRepositoryEventType.TYPE_TOGGLE, async data => {
      const { type, enable, userInput = true } = data;
      await this.toggleScriptType(type, enable, userInput);
    });

    // 脚本导入事件
    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_IMPORT, async data => {
      const { file, type } = data;
      await this.importScript(file, type);
    });

    // 脚本删除事件
    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_DELETE, async data => {
      const { scriptId, type } = data;
      await this.deleteScript(scriptId, type);
    });

    // 脚本保存事件
    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_SAVE, async data => {
      const { script, type } = data;
      await this.saveScript(script, type);
    });

    // 脚本移动事件
    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_MOVE, async data => {
      const { script, fromType } = data;
      await this.moveScript(script, fromType);
    });

    // UI加载完成事件 - 自动运行已启用的脚本
    scriptEvents.on(ScriptRepositoryEventType.UI_LOADED, async () => {
      // 检查扩展是否启用
      if (!getSettingValue('enabled_extension')) {
        return;
      }

      // 获取全局和角色脚本列表
      const globalScripts = this.scriptData.getGlobalScripts();
      const characterScripts = this.scriptData.getCharacterScripts();

      // 检查全局脚本类型开关是否启用
      if (this.scriptData.isGlobalScriptEnabled) {
        console.info('[Script] 全局脚本类型已启用，运行所有已启用的全局脚本');
        await this.runScriptsByType(globalScripts, ScriptType.GLOBAL);
      } else {
        console.info('[Script] 全局脚本类型未启用，跳过运行全局脚本');
      }

      // 检查角色脚本类型开关是否启用
      if (this.scriptData.isCharacterScriptEnabled) {
        console.info('[Script] 角色脚本类型已启用，运行所有已启用的角色脚本');
        await this.runScriptsByType(characterScripts, ScriptType.CHARACTER);
      } else {
        console.info('[Script] 角色脚本类型未启用，跳过运行角色脚本');
      }
    });
  }

  /**
   * 切换脚本启用状态
   * @param script 脚本
   * @param type 脚本类型
   * @param enable 是否启用
   * @param userInput 是否由用户输入
   */
  public async toggleScript(
    script: Script,
    type: ScriptType,
    enable: boolean,
    userInput: boolean = true,
  ): Promise<void> {
    if (userInput) {
      script.enabled = enable;
      await this.scriptData.saveScript(script, type);
    }

    try {
      if (enable) {
        await this.runScript(script, type);
      } else {
        await this.stopScript(script, type);
      }

      // 仅触发UI更新事件，而不在内部实现UI更新逻辑
      scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
        action: 'scriptToggled',
        script,
        type,
        enable,
      });
    } catch (error) {
      console.error(`[Script] 切换脚本状态失败: ${script.name}`, error);
      toastr.error(`切换脚本状态失败: ${script.name}`);
    }
  }

  /**
   * 切换脚本类型启用状态
   * @param type 脚本类型
   * @param enable 是否启用
   * @param userInput 是否由用户输入
   */
  public async toggleScriptType(type: ScriptType, enable: boolean, userInput: boolean = true): Promise<void> {
    if (userInput) {
      await this.scriptData.updateScriptTypeEnableState(type, enable);
    }

    try {
      const scripts =
        type === ScriptType.GLOBAL ? this.scriptData.getGlobalScripts() : this.scriptData.getCharacterScripts();

      if (enable) {
        await this.runScriptsByType(scripts, type);
      } else {
        await this.stopScriptsByType(scripts, type);
      }

      // 仅触发UI更新事件
      scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
        action: 'typeToggled',
        type,
        enable,
      });
    } catch (error) {
      console.error(`[Script] 切换脚本类型状态失败: ${type}`, error);
      toastr.error(`切换脚本类型状态失败: ${type}`);
    }
  }

  /**
   * 运行单个脚本
   * @param script 脚本
   * @param type 脚本类型
   */
  public async runScript(script: Script, type: ScriptType): Promise<void> {
    // 检查扩展是否启用
    if (!getSettingValue('enabled_extension')) {
      toastr.error('[Script] 扩展未启用');
      return;
    }

    // 检查相应类型的脚本是否启用
    if (type === ScriptType.GLOBAL && !this.scriptData.isGlobalScriptEnabled) {
      return;
    }
    if (type === ScriptType.CHARACTER && !this.scriptData.isCharacterScriptEnabled) {
      return;
    }

    // 运行脚本
    await this.executor.runScript(script, type);

    // 处理按钮
    if (script.buttons && script.buttons.length > 0) {
      scriptEvents.emit(ScriptRepositoryEventType.BUTTON_ADD, { script });
    }
  }

  /**
   * 停止单个脚本
   * @param script 脚本
   * @param type 脚本类型
   */
  public async stopScript(script: Script, type: ScriptType): Promise<void> {
    await this.executor.stopScript(script, type);

    // 处理按钮
    if (script.buttons && script.buttons.length > 0) {
      scriptEvents.emit(ScriptRepositoryEventType.BUTTON_REMOVE, { scriptId: script.id });
    }
  }

  /**
   * 运行指定类型的所有脚本
   * @param scripts 脚本列表
   * @param type 脚本类型
   */
  public async runScriptsByType(scripts: Script[], type: ScriptType): Promise<void> {
    // 检查扩展是否启用
    if (!getSettingValue('enabled_extension')) {
      toastr.error('[Script] 酒馆助手未启用，无法运行脚本');
      return;
    }

    // 检查相应类型的脚本是否启用
    if (type === ScriptType.GLOBAL && !this.scriptData.isGlobalScriptEnabled) {
      return;
    }
    if (type === ScriptType.CHARACTER && !this.scriptData.isCharacterScriptEnabled) {
      return;
    }

    // 筛选启用的脚本
    const enabledScripts = scripts.filter(script => script.enabled);

    // 运行每个脚本
    for (const script of enabledScripts) {
      await this.executor.runScript(script, type);

      // 处理按钮
      if (script.buttons && script.buttons.length > 0) {
        scriptEvents.emit(ScriptRepositoryEventType.BUTTON_ADD, { script });
      }
    }
  }

  /**
   * 停止指定类型的所有脚本
   * @param scripts 脚本列表
   * @param type 脚本类型
   */
  public async stopScriptsByType(scripts: Script[], type: ScriptType): Promise<void> {
    const enabledScripts = scripts.filter(script => script.enabled);

    for (const script of enabledScripts) {
      await this.executor.stopScript(script, type);

      // 处理按钮
      if (script.buttons && script.buttons.length > 0) {
        scriptEvents.emit(ScriptRepositoryEventType.BUTTON_REMOVE, { scriptId: script.id });
      }
    }
  }

  /**
   * 导入脚本
   * @param file 文件
   * @param type 脚本类型
   */
  public async importScript(file: File, type: ScriptType): Promise<void> {
    try {
      const fileText = await this.readFileAsText(file);
      const scriptData = JSON.parse(fileText);

      if (!scriptData.name) {
        throw new Error('[Script] 未提供脚本名称。');
      }

      const script = new Script(scriptData);
      const existingScript = this.scriptData.getScriptById(script.id);

      if (existingScript) {
        // 处理脚本冲突 - 只发送事件，UI处理由监听者负责
        scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
          action: 'scriptImportConflict',
          script,
          existingScript,
          type,
        });
      } else {
        // 直接保存脚本
        await this.saveScript(script, type);
        scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
          action: 'scriptImported',
          script,
          type,
        });
      }
    } catch (error) {
      console.error('[Script] 导入脚本失败:', error);
      toastr.error('无效的JSON文件。');
    }
  }

  /**
   * 读取文件内容为文本 - 使用Promise代替回调
   * @param file 文件对象
   * @returns 文件内容
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = e => reject(e);
      reader.readAsText(file);
    });
  }

  /**
   * 保存脚本
   * @param script 脚本
   * @param type 脚本类型
   */
  public async saveScript(script: Script, type: ScriptType): Promise<void> {
    await this.scriptData.saveScript(script, type);
    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
      action: 'scriptSaved',
      script,
      type,
    });
  }

  /**
   * 删除脚本
   * @param scriptId 脚本ID
   * @param type 脚本类型
   */
  public async deleteScript(scriptId: string, type: ScriptType): Promise<void> {
    const script = this.scriptData.getScriptById(scriptId);
    if (!script) {
      throw new Error('[Script] 脚本不存在');
    }

    // 先停止脚本
    await this.stopScript(script, type);

    // 删除脚本
    await this.scriptData.deleteScript(scriptId, type);

    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
      action: 'scriptDeleted',
      scriptId,
      type,
    });
  }

  /**
   * 移动脚本到另一个类型
   * @param script 脚本
   * @param fromType 源类型
   */
  public async moveScript(script: Script, fromType: ScriptType): Promise<void> {
    // 先停止脚本
    await this.stopScript(script, fromType);

    // 移动脚本
    await this.scriptData.moveScriptToOtherType(script, fromType);

    const targetType = fromType === ScriptType.GLOBAL ? ScriptType.CHARACTER : ScriptType.GLOBAL;

    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
      action: 'scriptMoved',
      script,
      fromType,
      targetType,
    });

    // 如果目标类型已启用，且脚本本身是启用状态，则启动脚本
    if (
      script.enabled &&
      ((targetType === ScriptType.GLOBAL && this.scriptData.isGlobalScriptEnabled) ||
        (targetType === ScriptType.CHARACTER && this.scriptData.isCharacterScriptEnabled))
    ) {
      await this.runScript(script, targetType);
    }
  }

  /**
   * 刷新数据
   */
  public refreshData(): void {
    this.scriptData.loadScripts();
  }

  /**
   * 获取全局脚本
   */
  public getGlobalScripts(): Script[] {
    return this.scriptData.getGlobalScripts();
  }

  /**
   * 获取角色脚本
   */
  public getCharacterScripts(): Script[] {
    return this.scriptData.getCharacterScripts();
  }

  /**
   * 获取全局脚本启用状态
   */
  public get isGlobalScriptEnabled(): boolean {
    return this.scriptData.isGlobalScriptEnabled;
  }

  /**
   * 获取角色脚本启用状态
   */
  public get isCharacterScriptEnabled(): boolean {
    return this.scriptData.isCharacterScriptEnabled;
  }

  /**
   * 根据ID获取脚本
   * @param id 脚本ID
   */
  public getScriptById(id: string): Script | undefined {
    return this.scriptData.getScriptById(id);
  }

  /**
   * 清理所有资源
   */
  public async cleanup(): Promise<void> {
    await this.executor.clearAllScriptsIframe();
  }
}
