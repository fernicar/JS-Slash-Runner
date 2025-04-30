import { eventSource } from '@sillytavern/script';

import { VariableType } from '@/component/script_repository/variable_manager/types';
import { getVariables } from '@/function/variables';

// 新增：定义统一的缓存键
const VARIABLE_CACHE_KEY = 'variable_cache';
let variableCache: Record<string, any> = {};

// 修订后的 DOM 更新器接口
export interface IDomUpdater {
  addVariableCard(name: string, value: any): void;
  removeVariableCard(name: string): void;
  updateVariableCard(name: string, value: any): void;
}

/**
 * 变量同步服务 - 负责处理变量变更并更新UI
 *
 * 工作原理:
 * 1. 初始化时，不立即绑定监听器，而是等待设置当前变量类型
 * 2. 当setCurrentType被调用时:
 *    - 解绑之前的监听器（如果有）
 *    - 设置新的变量类型
 *    - 初始化该类型的缓存
 *    - 绑定settings_updated事件监听器（包括测试监听器用于调试）
 * 3. 当settings_updated事件触发时:
 *    - 获取最新变量并与缓存比较
 *    - 更新UI反映变更（添加、删除、更新）
 *    - 更新缓存
 * 4. 如需手动触发更新，可调用manualUpdate方法
 */
export class VariableSyncService {
  private domUpdater: IDomUpdater;
  private currentType: VariableType | null = null;
  // 新增：存储绑定的监听器函数引用
  private _boundHandleSettingsUpdate: () => Promise<void>;
  // 新增：存储测试监听器函数引用
  private _boundTestListener: () => void;
  // 新增：标记监听器是否已绑定
  private _isListenerBound: boolean = false;
  // 新增：标记测试监听器是否已绑定
  private _isTestListenerBound: boolean = false;

  constructor(domUpdater: IDomUpdater) {
    this.domUpdater = domUpdater;
    // 初始化绑定后的函数引用，但不立即绑定监听器
    this._boundHandleSettingsUpdate = this._handleSettingsUpdate.bind(this);
    // 初始化测试监听器函数引用
    this._boundTestListener = () => {

      this._handleSettingsUpdate();
    };

  }

  // 新增：清理方法，用于断开监听和清空缓存
  public async cleanup(): Promise<void> {

    // 移除事件监听器（如果已绑定）
    this._unbindEventListener();

    try {
      // 清空缓存
      variableCache = {};

    } catch (error) {
      console.error(`【变量同步服务】：清空缓存键 ${VARIABLE_CACHE_KEY} 时出错:`, error);
      // 即使缓存清除失败，也应认为清理过程已尝试
    }
    this.currentType = null; // 重置当前类型

  }

  public async setCurrentType(type: VariableType): Promise<void> {
    if (this.currentType !== type) {
      // 先移除旧的监听器（如果有）
      this._unbindEventListener();



      this.currentType = type;

      // 初始化此类型的缓存
      await this.initializeCacheForType(type);

      // 只有当是全局变量类型时才绑定settings_updated事件监听器
      if (type === 'global') {
        this._bindEventListener();
      } else {

        // 对于非全局变量类型，立即执行一次更新以获取最新数据
        await this._handleOtherVariablesUpdate(type);
      }
    }
  }

  public async initializeCacheForType(type: VariableType): Promise<void> {
    try {
      const currentVariables = getVariables({ type });
      // 读取整个缓存对象
      const fullCache = variableCache || {};
      // 更新特定类型的部分 - 使用深拷贝
      fullCache[type] = _.cloneDeep(currentVariables);
      // 写回整个缓存对象
      variableCache = fullCache;

    } catch (error) {
      console.error(`【变量同步服务】：初始化类型 ${type} 的缓存时出错:`, error);
    }
  }

  /**
   * 手动触发变量更新处理，用于测试服务功能或在事件系统不可用时使用
   * @returns Promise<void>
   */
  public async manualUpdate(): Promise<void> {


    if (!this.currentType) {

      return;
    }

    if (this.currentType === 'global') {
      // 全局变量使用settings_updated事件处理函数
      await this._handleSettingsUpdate();
    } else {
      // 非全局变量使用专用处理函数
      await this._handleOtherVariablesUpdate(this.currentType);
    }


  }

  // 新增：绑定事件监听器
  private _bindEventListener(): void {

    // 只有当类型为 global 时才绑定监听器
    if (this.currentType !== 'global') {

      return;
    }

    // 绑定主要监听器
    if (!this._isListenerBound && this.currentType) {

      try {
        eventSource.on('settings_updated', this._boundHandleSettingsUpdate);
        this._isListenerBound = true;

      } catch (error) {
        console.error(`【变量同步服务】：绑定设置更新事件监听器时出错:`, error);
        this._isListenerBound = false;
      }
    }

    // 绑定测试监听器
    if (!this._isTestListenerBound && this.currentType) {

      try {
        eventSource.on('settings_updated', this._boundTestListener);
        this._isTestListenerBound = true;

      } catch (error) {
        console.error(`【变量同步服务】：绑定测试监听器时出错:`, error);
        this._isTestListenerBound = false;
      }
    }
  }

  // 新增：解绑事件监听器
  private _unbindEventListener(): void {
    // 移除主要监听器
    if (this._isListenerBound) {

      eventSource.removeListener('settings_updated', this._boundHandleSettingsUpdate);
      this._isListenerBound = false;

    }

    // 移除测试监听器
    if (this._isTestListenerBound) {

      eventSource.removeListener('settings_updated', this._boundTestListener);
      this._isTestListenerBound = false;

    }
  }

  /**
   * 处理非全局变量类型的更新
   * 当前为空实现，未来可能会扩展支持其他类型变量的自动更新
   * @param type 变量类型
   * @returns Promise<void>
   */
  private async _handleOtherVariablesUpdate(type: VariableType): Promise<void> {
    if (type === 'global') {
      // 全局变量类型应该使用 _handleSettingsUpdate() 处理
      return;
    }


    // 未来可以在这里添加其他类型的变量更新实现
  }

  private async _handleSettingsUpdate(): Promise<void> {
    if (!this.currentType) {

      return;
    }

    // 确保只处理全局变量类型
    if (this.currentType !== 'global') {

      return;
    }

    try {

      // 获取当前变量
      const currentVariables = getVariables({ type: this.currentType });


      // 获取缓存变量
      const fullCache = variableCache || {};
      const cachedVariables = fullCache[this.currentType] || {};


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

      // 更新缓存 - 使用深拷贝
      fullCache[this.currentType] = _.cloneDeep(currentVariables);
      variableCache = fullCache;

    } catch (error) {
      console.error(`【变量同步服务】：处理设置更新时出错:`, error);
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
        // 使用深拷贝确保缓存独立
        added[key] = _.cloneDeep(current[key]);

      } else if (!_.isEqual(current[key], cached[key])) {
        // 使用 lodash 的 isEqual 进行深比较
        // 使用深拷贝确保缓存独立
        updated[key] = _.cloneDeep(current[key]);

      }
    }

    return { added, removed, updated };
  }
}
