/**
 * 脚本仓库事件类型
 */
export enum ScriptRepositoryEventType {
  // 脚本操作相关事件
  SCRIPT_TOGGLE = 'script_toggle',
  SCRIPT_RUN = 'script_run',
  SCRIPT_STOP = 'script_stop',
  SCRIPT_SAVE = 'script_save',
  SCRIPT_DELETE = 'script_delete',
  SCRIPT_MOVE = 'script_move',
  SCRIPT_EDIT = 'script_edit',

  // 类型开关相关事件
  TYPE_TOGGLE = 'type_toggle',

  // 按钮相关事件
  BUTTON_ADD = 'button_add',
  BUTTON_REMOVE = 'button_remove',

  // 导入导出相关事件
  SCRIPT_IMPORT = 'script_import',
  SCRIPT_EXPORT = 'script_export',

  // 变量编辑相关事件
  VARIABLE_EDIT = 'variable_edit',

  // 界面相关事件
  UI_REFRESH = 'ui_refresh',
  UI_LOADED = 'ui_loaded',
}

/**
 * 事件监听器类型
 */
export type EventListener = (data: any) => void;

/**
 * 事件总线类，用于组件间通信
 */
export class EventBus {
  private static instance: EventBus;
  private listeners: Map<ScriptRepositoryEventType, EventListener[]> = new Map();

  private constructor() {}

  /**
   * 获取事件总线实例
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * 添加事件监听器
   * @param eventType 事件类型
   * @param listener 监听器函数
   */
  public on(eventType: ScriptRepositoryEventType, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(listener);
  }

  /**
   * 移除事件监听器
   * @param eventType 事件类型
   * @param listener 监听器函数
   */
  public off(eventType: ScriptRepositoryEventType, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      return;
    }

    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param eventType 事件类型
   * @param data 事件数据
   */
  public emit(eventType: ScriptRepositoryEventType, data?: any): void {
    if (!this.listeners.has(eventType)) {
      return;
    }

    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[EventBus] Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * 清空所有事件监听器
   */
  public clear(): void {
    this.listeners.clear();
  }

  /**
   * 销毁事件总线实例
   */
  public static destroyInstance(): void {
    if (EventBus.instance) {
      EventBus.instance.clear();
      EventBus.instance = undefined as unknown as EventBus;
    }
  }
}

// 导出事件总线单例
export const scriptEvents = EventBus.getInstance();
