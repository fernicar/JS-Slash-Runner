import { purgeEmbeddedScripts, ScriptData } from '@/component/script_repository/data';
import { scriptEvents, ScriptRepositoryEventType } from '@/component/script_repository/events';
import { ScriptManager } from '@/component/script_repository/script_controller';
import { ScriptType } from '@/component/script_repository/types';
import { UIController } from '@/component/script_repository/ui_controller';
import { extensionFolderPath, getSettingValue } from '@/util/extension_variables';

import { characters, event_types, eventSource, this_chid } from '@sillytavern/script';
import { loadFileToDocument } from '@sillytavern/scripts/utils';

const load_events = [event_types.CHAT_CHANGED] as const;
const delete_events = [event_types.CHARACTER_DELETED] as const;

/**
 * 脚本仓库应用 - 使用事件驱动架构
 * 负责整合ScriptManager和UIManager，提供统一的接口
 */
export class ScriptRepositoryApp {
  private static instance: ScriptRepositoryApp;
  private scriptManager: ScriptManager;
  private uiManager: UIController;
  private initialized: boolean = false;

  private constructor() {
    this.scriptManager = ScriptManager.getInstance();
    this.uiManager = UIController.getInstance();

    // 监听角色切换事件
    this.registerEvents();
  }

  /**
   * 获取应用实例
   */
  public static getInstance(): ScriptRepositoryApp {
    if (!ScriptRepositoryApp.instance) {
      ScriptRepositoryApp.instance = new ScriptRepositoryApp();
    }
    return ScriptRepositoryApp.instance;
  }

  /**
   * 销毁应用实例
   */
  public static destroyInstance(): void {
    if (ScriptRepositoryApp.instance) {
      ScriptRepositoryApp.instance.cleanup();
      ScriptRepositoryApp.instance = undefined as unknown as ScriptRepositoryApp;
      ScriptManager.destroyInstance();
      UIController.destroyInstance();
      ScriptData.destroyInstance();
    }
  }

  /**
   * 初始化应用
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await loadFileToDocument(
        `/scripts/extensions/${extensionFolderPath}/src/component/script_repository/public/style.css`,
        'css',
      );
      await this.uiManager.initialize();
      this.initialized = true;
      console.info('[ScriptRepositoryApp] 初始化完成');
    } catch (error) {
      console.error('[ScriptRepositoryApp] 初始化失败:', error);
      this.initialized = false;
    }
  }

  /**
   * 注册事件监听
   */
  private registerEvents(): void {
    load_events.forEach(eventType => {
      eventSource.on(eventType, this.refreshRepository.bind(this));
    });

    delete_events.forEach(eventType => {
      eventSource.on(eventType, (character: any) => purgeEmbeddedScripts({ character }));
    });
  }

  /**
   * 刷新脚本库
   */
  private async refreshRepository(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    console.info('[script_repository] 刷新脚本库');

    // 刷新UI
    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, { action: 'refreshCharactScripts' });

    // 等待UI刷新完成后再检查嵌入式脚本
    // 使用 setTimeout 让刷新事件的处理先完成
    setTimeout(async () => {
      // 检查嵌入式脚本
      if (this_chid) {
        await this.uiManager.checkEmbeddedScripts(this_chid);
      }
    }, 10);
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    try {
      // 注销SillyTavern事件
      load_events.forEach(eventType => {
        eventSource.removeListener(eventType, this.refreshRepository.bind(this));
      });

      // 清理组件资源
      await this.scriptManager.cleanup();
      this.uiManager.cleanup();

      this.initialized = false;
      console.info('[ScriptRepositoryApp] 清理完成');
    } catch (error) {
      console.error('[ScriptRepositoryApp] 清理失败:', error);
    }
  }
}

/**
 * 构建脚本库应用
 */
export async function buildScriptRepository(): Promise<void> {
  const app = ScriptRepositoryApp.getInstance();
  await app.initialize();
}

/**
 * 移除脚本库应用
 */
export async function removeScriptRepository(): Promise<void> {
  ScriptRepositoryApp.destroyInstance();
}

/**
 * 扩展开启时构建脚本库
 */
export async function buildScriptRepositoryOnExtension(): Promise<void> {
  await buildScriptRepository();
}

/**
 * 扩展关闭时销毁脚本库
 */
export function destroyScriptRepositoryOnExtension(): void {
  removeScriptRepository();
}

export { ScriptType };
