import { eventSource } from '@sillytavern/script';

import { VariableChangeCallback, VariableType } from '@/component/script_repository/variable_manager/types';
import { getVariables } from '@/function/variables';

/**
 * 变量同步服务类，负责变量的同步和事件通知
 */
export class VariableSyncService {
  /**
   * 存储注册的变量变更事件监听器
   */
  private changeListeners: VariableChangeCallback[] = [];

  /**
   * 上一次的变量状态缓存，用于比较变更
   */
  private previousVariables: Record<VariableType, Record<string, any>> = {
    global: {},
    character: {},
    chat: {},
    message: {},
  };

  /**
   * 各类型变量的监听处理函数引用
   */
  private variableTypeHandlers: Record<VariableType, Function | null> = {
    global: null,
    character: null,
    chat: null,
    message: null,
  };

  /**
   * 构造函数
   */
  constructor() {
    // 初始化同步服务
  }

  /**
   * 初始化同步服务
   */
  public init(): void {
    // 不再自动注册监听器，改为由外部控制何时注册和移除
  }

  /**
   * 注册变量变更监听器
   * @param callback 回调函数
   */
  public registerChangeListener(callback: VariableChangeCallback): void {
    this.changeListeners.push(callback);
  }

  /**
   * 移除变量变更监听器
   * @param callback 要移除的回调函数
   */
  public removeChangeListener(callback: VariableChangeCallback): void {
    const index = this.changeListeners.indexOf(callback);
    if (index !== -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * 通知变量已更新
   * @param type 变量类型
   * @param name 变量名称
   * @param value 变量值
   */
  public notifyVariableUpdate(type: VariableType, name: string, value: any): void {
    console.log(
      `[VariableSyncService] 通知变量更新: type=${type}, name=${name}, 监听器数量=${this.changeListeners.length}`,
    );

    // 通知所有监听器
    this.changeListeners.forEach((listener, index) => {
      try {
        console.log(`[VariableSyncService] 调用监听器[${index}]处理变量更新: ${type}.${name}`);
        listener(type, name, value);
      } catch (error) {
        console.error('变量更新监听器执行出错:', error);
      }
    });
  }

  /**
   * 注册全局变量监听
   */
  public registerGlobalVariablesListener(): void {
    if (this.variableTypeHandlers.global) {
      // 已注册，直接返回
      console.log(`[VariableSyncService] 全局变量监听器已注册，跳过`);
      return;
    }

    console.log(`[VariableSyncService] 开始注册全局变量监听器`);

    // 同步加载当前全局变量并缓存
    const currentVariables = this.getVariablesSync('global');
    console.log(`[VariableSyncService] 初始化全局变量缓存:`, JSON.stringify(currentVariables));
    this.previousVariables.global = { ...currentVariables }; // 使用深拷贝

    // 立即触发一次强制刷新
    setTimeout(() => this.handleSettingsUpdate('global', true), 100);

    // 创建处理函数
    const handler = () => this.handleSettingsUpdate('global');
    this.variableTypeHandlers.global = handler;

    // 注册监听
    try {
      console.log(`[VariableSyncService] 注册settings_updated事件监听`);
      eventSource.on('settings_updated', handler);
    } catch (error) {
      console.error('注册全局变量监听失败:', error);
    }
  }

  /**
   * 同步获取变量（避免异步加载带来的问题）
   * @param type 变量类型
   * @returns 变量对象
   */
  private getVariablesSync(type: VariableType): Record<string, any> {
    try {
      const variables = getVariables({ type });
      console.log(`[VariableSyncService] 同步获取${type}变量:`, JSON.stringify(variables));
      return variables;
    } catch (error) {
      console.error(`同步获取${type}变量失败:`, error);
      return {};
    }
  }

  /**
   * 移除全局变量监听
   */
  public removeGlobalVariablesListener(): void {
    if (!this.variableTypeHandlers.global) {
      // 未注册，直接返回
      return;
    }

    // 移除监听
    try {
      eventSource.removeListener('settings_updated', this.variableTypeHandlers.global);
      this.variableTypeHandlers.global = null;
    } catch (error) {
      console.error('移除全局变量监听失败:', error);
    }
  }

  /**
   * 注册角色变量监听
   */
  public registerCharacterVariablesListener(): void {
    if (this.variableTypeHandlers.character) {
      // 已注册，直接返回
      console.log(`[VariableSyncService] 角色变量监听器已注册，跳过`);
      return;
    }

    console.log(`[VariableSyncService] 开始注册角色变量监听器`);

    // 同步加载当前角色变量并缓存
    const currentVariables = this.getVariablesSync('character');
    console.log(`[VariableSyncService] 初始化角色变量缓存:`, JSON.stringify(currentVariables));
    this.previousVariables.character = { ...currentVariables }; // 使用深拷贝

    // 立即触发一次强制刷新
    setTimeout(() => this.handleSettingsUpdate('character', true), 100);

    // 创建处理函数
    const handler = () => this.handleSettingsUpdate('character');
    this.variableTypeHandlers.character = handler;

    // 注册监听
    try {
      console.log(`[VariableSyncService] 注册settings_updated事件监听`);
      eventSource.on('settings_updated', handler);
    } catch (error) {
      console.error('注册角色变量监听失败:', error);
    }
  }

  /**
   * 移除角色变量监听
   */
  public removeCharacterVariablesListener(): void {
    if (!this.variableTypeHandlers.character) {
      // 未注册，直接返回
      return;
    }

    // 移除监听
    try {
      eventSource.removeListener('settings_updated', this.variableTypeHandlers.character);
      this.variableTypeHandlers.character = null;
    } catch (error) {
      console.error('移除角色变量监听失败:', error);
    }
  }

  /**
   * 注册聊天变量监听
   */
  public registerChatVariablesListener(): void {
    if (this.variableTypeHandlers.chat) {
      // 已注册，直接返回
      console.log(`[VariableSyncService] 聊天变量监听器已注册，跳过`);
      return;
    }

    console.log(`[VariableSyncService] 开始注册聊天变量监听器`);

    // 同步加载当前聊天变量并缓存
    const currentVariables = this.getVariablesSync('chat');
    console.log(`[VariableSyncService] 初始化聊天变量缓存:`, JSON.stringify(currentVariables));
    this.previousVariables.chat = { ...currentVariables }; // 使用深拷贝

    // 立即触发一次强制刷新
    setTimeout(() => this.handleSettingsUpdate('chat', true), 100);

    // 创建处理函数
    const handler = () => this.handleSettingsUpdate('chat');
    this.variableTypeHandlers.chat = handler;

    // 注册监听
    try {
      console.log(`[VariableSyncService] 注册settings_updated事件监听`);
      eventSource.on('settings_updated', handler);
    } catch (error) {
      console.error('注册聊天变量监听失败:', error);
    }
  }

  /**
   * 移除聊天变量监听
   */
  public removeChatVariablesListener(): void {
    if (!this.variableTypeHandlers.chat) {
      // 未注册，直接返回
      return;
    }

    // 移除监听
    try {
      eventSource.removeListener('settings_updated', this.variableTypeHandlers.chat);
      this.variableTypeHandlers.chat = null;
    } catch (error) {
      console.error('移除聊天变量监听失败:', error);
    }
  }

  /**
   * 注册消息变量监听
   */
  public registerMessageVariablesListener(): void {
    if (this.variableTypeHandlers.message) {
      // 已注册，直接返回
      console.log(`[VariableSyncService] 消息变量监听器已注册，跳过`);
      return;
    }

    console.log(`[VariableSyncService] 开始注册消息变量监听器`);

    // 同步加载当前消息变量并缓存
    const currentVariables = this.getVariablesSync('message');
    console.log(`[VariableSyncService] 初始化消息变量缓存:`, JSON.stringify(currentVariables));
    this.previousVariables.message = { ...currentVariables }; // 使用深拷贝

    // 立即触发一次强制刷新
    setTimeout(() => this.handleSettingsUpdate('message', true), 100);

    // 创建处理函数
    const handler = () => this.handleSettingsUpdate('message');
    this.variableTypeHandlers.message = handler;

    // 注册监听
    try {
      console.log(`[VariableSyncService] 注册settings_updated事件监听`);
      eventSource.on('settings_updated', handler);
    } catch (error) {
      console.error('注册消息变量监听失败:', error);
    }
  }

  /**
   * 移除消息变量监听
   */
  public removeMessageVariablesListener(): void {
    if (!this.variableTypeHandlers.message) {
      // 未注册，直接返回
      return;
    }

    // 移除监听
    try {
      eventSource.removeListener('settings_updated', this.variableTypeHandlers.message);
      this.variableTypeHandlers.message = null;
    } catch (error) {
      console.error('移除消息变量监听失败:', error);
    }
  }

  /**
   * 检查两个值是否相等（增强版比较）
   * @param a 值A
   * @param b 值B
   * @returns 是否相等
   */
  private areValuesEqual(a: any, b: any): boolean {
    // 处理undefined和null
    if (a === undefined && b === undefined) return true;
    if (a === null && b === null) return true;
    if ((a === undefined || a === null) && (b === undefined || b === null)) return true;
    if ((a === undefined || a === null) && b !== undefined && b !== null) return false;
    if (a !== undefined && a !== null && (b === undefined || b === null)) return false;

    // 使用JSON比较
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (error) {
      console.error('JSON比较出错:', error);
      // 如果JSON比较失败，使用简单比较
      return a === b;
    }
  }

  /**
   * 处理设置更新
   * @param variableType 可选的变量类型，如果指定则只处理该类型的变量
   * @param forceRefresh 是否强制刷新（忽略比较逻辑，直接通知所有变量）
   */
  private async handleSettingsUpdate(variableType?: VariableType, forceRefresh: boolean = false): Promise<void> {
    try {
      console.log(
        `[VariableSyncService] 开始处理设置更新, 变量类型:`,
        variableType || 'all',
        '强制刷新:',
        forceRefresh,
      );

      // 确定要处理的变量类型
      const typesToProcess: VariableType[] = variableType
        ? [variableType]
        : (['global', 'character', 'chat', 'message'] as VariableType[]);

      // 获取指定类型的变量数据
      const currentVariables: Partial<Record<VariableType, Record<string, any>>> = {};

      // 获取需要处理的变量类型数据
      for (const type of typesToProcess) {
        currentVariables[type] = await this.getVariables(type);
      }

      console.log(`[VariableSyncService] 处理变量类型:`, typesToProcess.join(','));

      // 对比每个类型的变量
      for (const type of typesToProcess) {
        const previous = this.previousVariables[type] || {};
        const current = currentVariables[type] || {};

        console.log(
          `[VariableSyncService] 比较${type}变量 - 之前:`,
          Object.keys(previous).length,
          '个, 当前:',
          Object.keys(current).length,
          '个',
        );

        // 详细打印之前和当前的变量值
        console.log(`[VariableSyncService] 之前的${type}变量:`, JSON.stringify(previous));
        console.log(`[VariableSyncService] 当前的${type}变量:`, JSON.stringify(current));

        // 如果是强制刷新，则直接通知所有变量更新
        if (forceRefresh) {
          console.log(`[VariableSyncService] 强制刷新${type}变量，开始通知所有变量...`);
          Object.entries(current).forEach(([name, value]) => {
            this.notifyVariableUpdate(type, name, value);
          });
        } else {
          // 正常模式：检查变更和新增的变量
          for (const name in current) {
            const prevValue = previous[name];
            const currentValue = current[name];

            console.log(`[VariableSyncService] 检查${type}变量: ${name}, 之前值:`, prevValue, '当前值:', currentValue);

            const areEqual = this.areValuesEqual(prevValue, currentValue);
            console.log(`[VariableSyncService] 变量比较: ${name}, 相等=${areEqual}`);

            if (prevValue === undefined) {
              // 新增的变量
              console.log(`[VariableSyncService] 新增${type}变量: ${name} =`, currentValue);
              this.notifyVariableUpdate(type, name, currentValue);
              this.addVariableAnimation(type, name, 'added');
            } else if (!areEqual) {
              // 变更的变量
              console.log(`[VariableSyncService] 变更${type}变量: ${name} = `, currentValue, '(原值:', prevValue, ')');
              this.notifyVariableUpdate(type, name, currentValue);
              this.addVariableAnimation(type, name, 'changed');
            } else {
              console.log(`[VariableSyncService] ${type}变量无变化: ${name}`);
            }
          }

          // 检查删除的变量
          for (const name in previous) {
            if (current[name] === undefined) {
              // 删除的变量
              console.log(`[VariableSyncService] 删除${type}变量: ${name}`);
              this.notifyVariableUpdate(type, name, undefined);
              this.addVariableAnimation(type, name, 'deleted');
            }
          }
        }

        // 更新缓存
        this.previousVariables[type] = JSON.parse(JSON.stringify(current)); // 深拷贝，避免引用问题
      }

      console.log(`[VariableSyncService] 设置更新处理完成`);
    } catch (error) {
      console.error('处理设置更新失败:', error);
    }
  }

  /**
   * 获取指定类型的变量
   * @param type 变量类型
   * @returns 变量对象
   */
  private async getVariables(type: VariableType): Promise<Record<string, any>> {
    // 使用导入的getVariables函数获取变量数据
    try {
      // VariableType（'global' | 'character' | 'chat' | 'message'）与getVariables函数的参数类型相同
      // 所以可以直接传递
      const variables = getVariables({ type });
      console.log(`[VariableSyncService] 获取${type}变量:`, JSON.stringify(variables));
      return variables;
    } catch (error) {
      console.error(`获取${type}变量失败:`, error);
      return {};
    }
  }

  /**
   * 为变量元素添加动画效果
   * @param type 变量类型
   * @param name 变量名称
   * @param action 变量动作
   */
  private addVariableAnimation(type: VariableType, name: string, action: 'added' | 'changed' | 'deleted'): void {
    // 查找元素，并添加动画类
    try {
      const variableSelector = `.variable-item[data-type="${type}"][data-name="${name}"]`;
      const $variableElement = $(variableSelector);

      // 如果元素存在或者是删除操作，执行相应动画
      if ($variableElement.length > 0 || action === 'deleted') {
        this.applyAnimation($variableElement, action);
      } else {
        // 元素不存在，可能尚未渲染，延迟重试
        this.retryAnimation(type, name, action);
      }
    } catch (error) {
      console.error('应用变量动画失败:', error);
    }
  }

  /**
   * 应用动画效果
   * @param $element jQuery元素
   * @param action 变量动作
   */
  private applyAnimation($element: JQuery<HTMLElement>, action: 'added' | 'changed' | 'deleted'): void {
    if ($element.length === 0 && action !== 'deleted') {
      return; // 非删除操作且元素不存在，直接返回
    }

    switch (action) {
      case 'added':
        $element.addClass('variable-added');
        setTimeout(() => {
          $element.removeClass('variable-added');
        }, 1500);
        break;

      case 'changed':
        $element.addClass('variable-changed');
        setTimeout(() => {
          $element.removeClass('variable-changed');
        }, 1500);
        break;

      case 'deleted':
        if ($element.length > 0) {
          $element.addClass('variable-deleted');
          setTimeout(() => {
            $element.fadeOut(300, function () {
              $(this).remove();
            });
          }, 1000);
        }
        break;
    }
  }

  /**
   * 延迟重试应用动画
   * @param type 变量类型
   * @param name 变量名称
   * @param action 变量动作
   */
  private retryAnimation(type: VariableType, name: string, action: 'added' | 'changed' | 'deleted'): void {
    // 最多重试3次，每次间隔100ms
    let retries = 0;
    const maxRetries = 3;

    const attemptAnimation = () => {
      const variableSelector = `.variable-item[data-type="${type}"][data-name="${name}"]`;
      const $variableElement = $(variableSelector);

      if ($variableElement.length > 0) {
        // 找到元素，应用动画
        this.applyAnimation($variableElement, action);
      } else if (retries < maxRetries) {
        // 继续重试
        retries++;
        setTimeout(attemptAnimation, 100);
      }
    };

    // 开始首次尝试
    setTimeout(attemptAnimation, 100);
  }

  /**
   * 强制刷新变量（手动调用）
   * @param type 变量类型
   */
  public forceRefreshVariables(type: VariableType): void {
    console.log(`[VariableSyncService] 手动触发${type}变量强制刷新`);
    this.handleSettingsUpdate(type, true);
  }

  /**
   * 处理外部变量变更
   * @param type 变量类型
   * @param name 变量名称
   * @param value 新的变量值
   */
  public handleExternalVariableChange(type: VariableType, name: string, value: any): void {
    console.log(`[VariableSyncService] 处理外部变量变更: ${type}.${name} =`, value);

    // 更新缓存
    if (!this.previousVariables[type]) {
      this.previousVariables[type] = {};
    }

    const previousValue = this.previousVariables[type][name];
    this.previousVariables[type][name] = value === undefined ? undefined : JSON.parse(JSON.stringify(value)); // 深拷贝

    // 先通知其他监听器
    this.notifyVariableUpdate(type, name, value);

    // 判断变量的变更类型
    let action: 'added' | 'changed' | 'deleted' = 'changed';
    if (previousValue === undefined && value !== undefined) {
      action = 'added';
    } else if (previousValue !== undefined && value === undefined) {
      action = 'deleted';
    }

    // 应用动画效果
    this.addVariableAnimation(type, name, action);
  }

  /**
   * 应用列表变量排序变更
   * @param type 变量类型
   * @param name 变量名称
   * @param newOrder 新的排序
   */
  public async applyListOrderChange(type: VariableType, name: string, newOrder: string[]): Promise<void> {
    // 通知变量已更新
    this.notifyVariableUpdate(type, name, newOrder);
  }
}
