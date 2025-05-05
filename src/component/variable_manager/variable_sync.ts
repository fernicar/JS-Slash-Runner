import { eventSource } from '@sillytavern/script';

import { VariableType } from '@/component/variable_manager/types';
import { getVariables } from '@/function/variables';

const VARIABLE_CACHE_KEY = 'variable_cache';
let variableCache: Record<string, any> = {};

const VARIABLE_EVENTS: Record<string, string> = {
  GLOBAL: 'settings_updated',
  CHARACTER: 'character_variables_changed',
  MESSAGE: 'message_variables_changed',
  // 聊天变量不使用事件，而是使用轮询
  CHAT: '',
};

// 定义轮询间隔（毫秒）
const CHAT_POLLING_INTERVAL = 2000;

export interface IDomUpdater {
  addVariableCard(name: string, value: any): void;
  removeVariableCard(name: string): void;
  updateVariableCard(name: string, value: any): void;
  updateWithoutAnimation(isSkipAnimation: boolean): void;
}

// 定义监听器状态映射接口
interface ListenerStatus {
  bound: boolean;
  handler: (...args: any[]) => Promise<void>;
}

export class VariableSyncService {
  private domUpdater: IDomUpdater;
  private currentType: VariableType | null = null;
  private _boundListeners: Record<VariableType, ListenerStatus> = {
    global: { bound: false, handler: this._handleVariableUpdate.bind(this, 'global') },
    character: { bound: false, handler: this._handleVariableUpdate.bind(this, 'character') },
    chat: { bound: false, handler: this._handleVariableUpdate.bind(this, 'chat') },
    message: { bound: false, handler: this._handleVariableUpdate.bind(this, 'message') },
  };
  // 用于聊天变量轮询的定时器ID
  private _chatPollingInterval: number | null = null;
  // 标记监听器是否处于激活状态
  private _listenersActive: boolean = false;
  // 标记是否正在进行类型切换
  private _isTypeChanging: boolean = false;

  constructor(domUpdater: IDomUpdater) {
    this.domUpdater = domUpdater;
  }

  // 获取当前是否正在进行类型切换
  public get isTypeChanging(): boolean {
    return this._isTypeChanging;
  }

  public async cleanup(): Promise<void> {
    this._unbindAllEventListeners();
    this._stopChatPolling();

    try {
      variableCache = {};
    } catch (error) {
      console.error(`[VariableManager]：清空缓存键 ${VARIABLE_CACHE_KEY} 时出错:`, error);
    }
    this.currentType = null;
  }

  /**
   * 设置当前变量类型，并相应地初始化监听器或轮询
   * @param type 变量类型
   */
  public async setCurrentType(type: VariableType): Promise<void> {
    if (this.currentType !== type) {
      this._isTypeChanging = true;
      this.domUpdater.updateWithoutAnimation(true);

      this._unbindAllEventListeners();
      this._stopChatPolling();

      this.currentType = type;

      // 初始化类型对应的缓存（但不执行变量更新）
      await this.initializeCacheForType(type);

      if (this._listenersActive) {
        if (type === 'chat') {
          this._startChatPolling();
        } else {
          this._bindVariableListener(type);
        }
      }

      this._isTypeChanging = false;
      this.domUpdater.updateWithoutAnimation(false);
    }
  }

  /**
   * 激活当前类型的事件监听器或轮询
   * 应在标签页激活时调用
   */
  public activateListeners(): void {
    this._listenersActive = true;
    if (this.currentType) {
      if (this.currentType === 'chat') {
        this._startChatPolling();
      } else {
        this._bindVariableListener(this.currentType);
      }
    }
  }

  /**
   * 停用当前的事件监听器或轮询
   * 应在标签页停用时调用，以节省性能
   */
  public deactivateListeners(): void {
    this._listenersActive = false;
    this._unbindAllEventListeners();
    this._stopChatPolling();
  }

  public async initializeCacheForType(type: VariableType): Promise<void> {
    try {
      const currentVariables = getVariables({ type });
      const fullCache = variableCache || {};
      fullCache[type] = _.cloneDeep(currentVariables);
      variableCache = fullCache;
    } catch (error) {
      console.error(`[VariableManager]：初始化类型 ${type} 的缓存时出错:`, error);
    }
  }

  /**
   * 手动触发变量更新处理，用于测试服务功能或在事件系统不可用时使用
   * @returns Promise<void>
   */
  public async manualUpdate(): Promise<void> {
    if (this.currentType) {
      await this._handleVariableUpdate(this.currentType);
    }
  }

  /**
   * 统一的变量监听器绑定方法
   * @param type 变量类型
   * @private
   */
  private _bindVariableListener(type: VariableType): void {
    if (type === 'chat') return;

    const eventName = VARIABLE_EVENTS[type.toUpperCase()];
    const listenerStatus = this._boundListeners[type];

    if (!listenerStatus.bound && eventName) {
      try {
        eventSource.on(eventName, listenerStatus.handler);
        this._boundListeners[type].bound = true;
      } catch (error) {
        console.error(`[VariableSyncService]：绑定${type}变量事件监听器时出错:`, error);
        this._boundListeners[type].bound = false;
      }
    }
  }

  /**
   * 解绑所有事件监听器
   * @private
   */
  private _unbindAllEventListeners(): void {
    for (const type of Object.keys(this._boundListeners) as VariableType[]) {
      if (type === 'chat') continue;

      const eventName = VARIABLE_EVENTS[type.toUpperCase()];
      const listenerStatus = this._boundListeners[type];

      if (listenerStatus.bound && eventName) {
        try {
          eventSource.removeListener(eventName, listenerStatus.handler);
          this._boundListeners[type].bound = false;
        } catch (error) {
          console.error(`[VariableManager]：解绑${type}变量事件监听器时出错:`, error);
        }
      }
    }
  }

  /**
   * 启动聊天变量的轮询
   * @private
   */
  private _startChatPolling(): void {
    this._stopChatPolling();

    if (this.currentType === 'chat' && this._listenersActive) {
      try {
        // 设置定时器定期检查聊天变量
        this._chatPollingInterval = window.setInterval(async () => {
          await this._handleVariableUpdate('chat');
        }, CHAT_POLLING_INTERVAL);
      } catch (error) {
        console.error('[VariableManager]：启动聊天变量轮询时出错:', error);
        this._chatPollingInterval = null;
      }
    }
  }

  /**
   * 停止聊天变量的轮询
   * @private
   */
  private _stopChatPolling(): void {
    if (this._chatPollingInterval !== null) {
      try {
        window.clearInterval(this._chatPollingInterval);
        this._chatPollingInterval = null;
      } catch (error) {
        console.error('[VariableManager]：停止聊天变量轮询时出错:', error);
      }
    }
  }

  /**
   * 统一的变量更新处理方法
   * 适用于所有变量类型（全局、角色、聊天、消息）
   * @param type 变量类型
   * @param data 可选的事件数据（角色变量事件会提供）
   * @private
   */
  private async _handleVariableUpdate(type: VariableType, data?: any): Promise<void> {
    if (!this.currentType || this.currentType !== type || this._isTypeChanging) {
      return;
    }

    try {
      // 获取最新变量
      // 角色变量和消息变量事件会直接提供变量数据
      let currentVariables: Record<string, any>;
      if ((type === 'character' || type === 'message') && data && data.variables) {
        currentVariables = data.variables;
      } else {
        // 其他类型需要通过getVariables获取
        currentVariables = getVariables({ type });
      }

      const fullCache = variableCache || {};
      const cachedVariables = fullCache[type] || {};

      // 比较变量并更新DOM
      const { added, removed, updated } = this._compareVariableRecords(cachedVariables, currentVariables);

      // 处理变量添加
      Object.entries(added).forEach(([name, value]) => {
        this.domUpdater.addVariableCard(name, value);
      });

      // 处理变量删除
      removed.forEach(name => {
        this.domUpdater.removeVariableCard(name);
      });

      // 处理变量更新
      Object.entries(updated).forEach(([name, value]) => {
        this.domUpdater.updateVariableCard(name, value);
      });

      // 更新缓存
      fullCache[type] = _.cloneDeep(currentVariables);
      variableCache = fullCache;
    } catch (error) {
      console.error(`[VariableManager]：处理${type}变量更新时出错:`, error);
    }
  }

  /**
   * 比较缓存的变量记录和当前的变量记录。
   * @param cached - 缓存的变量记录 (Record<string, any>)
   * @param current - 当前的变量记录 (Record<string, any>)
   * @returns 包含已添加(Record)、已删除(string[])、已更新(Record)变量的对象
   */
  private _compareVariableRecords(
    cached: Record<string, any>,
    current: Record<string, any>,
  ): { added: Record<string, any>; removed: string[]; updated: Record<string, any> } {
    const added: Record<string, any> = {};
    const removed: string[] = [];
    const updated: Record<string, any> = {};

    const cachedKeys = new Set(Object.keys(cached));
    const currentKeys = new Set(Object.keys(current));
    // 检查已删除的变量
    for (const key of cachedKeys) {
      if (!currentKeys.has(key)) {
        removed.push(key);
      }
    }

    // 检查已添加或已更新的变量
    for (const key of currentKeys) {
      if (!cachedKeys.has(key)) {
        added[key] = _.cloneDeep(current[key]);
      } else if (!_.isEqual(current[key], cached[key])) {
        updated[key] = _.cloneDeep(current[key]);
      }
    }

    return { added, removed, updated };
  }
}
