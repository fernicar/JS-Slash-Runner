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
   * 当前活动的变量类型
   */
  private activeVariableType: VariableType = 'global';

  /**
   * 构造函数
   */
  constructor() {
    // 初始化同步服务
  }

  /**
   * 设置当前活动的变量类型
   * @param type 变量类型
   */
  public setActiveVariableType(type: VariableType): void {
    console.log(`[VariableSyncService] 设置当前活动变量类型为: ${type}`);
    this.activeVariableType = type;
  }

  /**
   * 获取当前活动的变量类型
   * @returns 当前活动的变量类型
   */
  public getActiveVariableType(): VariableType {
    return this.activeVariableType;
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
    // 检查是否与当前活动类型匹配
    if (type !== this.activeVariableType) {
      console.log(
        `[VariableSyncService] 跳过通知变量更新: type=${type}, name=${name}, 因为当前活动类型为 ${this.activeVariableType}`,
      );
      return;
    }

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
   * 注册指定类型的变量监听
   * @param type 变量类型
   */
  public registerVariablesListener(type: VariableType): void {
    if (this.variableTypeHandlers[type]) {
      // 已注册，直接返回
      console.log(`[VariableSyncService] ${type}变量监听器已注册，跳过`);
      return;
    }

    // chat类型特殊处理（不需要初始化缓存和强制刷新）
    if (type !== 'chat') {
      // 同步加载当前变量并缓存
      const currentVariables = this.getVariablesSync(type);
      console.log(`[VariableSyncService] 初始化${type}变量缓存:`, JSON.stringify(currentVariables));
      this.previousVariables[type] = { ...currentVariables }; // 使用深拷贝

      // 立即触发一次强制刷新
      setTimeout(() => this.handleSettingsUpdate(type, true), 100);
    }

    // 创建处理函数
    const handler = () => this.handleSettingsUpdate(type);
    this.variableTypeHandlers[type] = handler;

    // 注册监听
    try {
      console.log(`[VariableSyncService] 注册settings_updated事件监听`);
      eventSource.on('settings_updated', handler);
    } catch (error) {
      console.error(`注册${type}变量监听失败:`, error);
    }
  }

  /**
   * 移除指定类型的变量监听
   * @param type 变量类型
   */
  public removeVariablesListener(type: VariableType): void {
    if (!this.variableTypeHandlers[type]) {
      // 未注册，直接返回
      return;
    }

    // 移除监听
    try {
      eventSource.removeListener('settings_updated', this.variableTypeHandlers[type]);
      this.variableTypeHandlers[type] = null;
    } catch (error) {
      console.error(`移除${type}变量监听失败:`, error);
    }
  }

  // 为了保持向后兼容，保留原来的特定类型方法，但它们现在调用通用方法

  /**
   * 注册全局变量监听
   */
  public registerGlobalVariablesListener(): void {
    this.registerVariablesListener('global');
  }

  /**
   * 移除全局变量监听
   */
  public removeGlobalVariablesListener(): void {
    this.removeVariablesListener('global');
  }

  /**
   * 注册角色变量监听
   */
  public registerCharacterVariablesListener(): void {
    this.registerVariablesListener('character');
  }

  /**
   * 移除角色变量监听
   */
  public removeCharacterVariablesListener(): void {
    this.removeVariablesListener('character');
  }

  /**
   * 注册聊天变量监听
   */
  public registerChatVariablesListener(): void {
    this.registerVariablesListener('chat');
  }

  /**
   * 移除聊天变量监听
   */
  public removeChatVariablesListener(): void {
    this.removeVariablesListener('chat');
  }

  /**
   * 注册消息变量监听
   */
  public registerMessageVariablesListener(): void {
    this.registerVariablesListener('message');
  }

  /**
   * 移除消息变量监听
   */
  public removeMessageVariablesListener(): void {
    this.removeVariablesListener('message');
  }

  /**
   * 同步获取变量
   * @param type 变量类型
   * @returns 变量对象
   */
  private getVariablesSync(type: VariableType): Record<string, any> {
    try {
      if (type === 'message') {
        return getVariables({ type: 'message', message_id: 'latest' });
      }
      const variables = getVariables({ type });
      return variables;
    } catch (error) {
      console.error(`同步获取${type}变量失败:`, error);
      return {};
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
   * 计算两个变量集合之间的差异
   * @param previous 之前的变量集合
   * @param current 当前的变量集合
   * @returns 差异映射，包含每个变量的变更类型
   */
  private computeVariableDiffs(
    previous: Record<string, any>,
    current: Record<string, any>,
  ): Record<string, 'added' | 'changed' | 'deleted' | 'unchanged'> {
    const diffs: Record<string, 'added' | 'changed' | 'deleted' | 'unchanged'> = {};

    // 检查新增和变更
    for (const name in current) {
      if (!(name in previous)) {
        diffs[name] = 'added';
      } else if (!this.areValuesEqual(previous[name], current[name])) {
        diffs[name] = 'changed';
      } else {
        diffs[name] = 'unchanged';
      }
    }

    // 检查删除
    for (const name in previous) {
      if (!(name in current)) {
        diffs[name] = 'deleted';
      }
    }

    return diffs;
  }

  /**
   * 处理变量差异并执行相应操作
   * @param type 变量类型
   * @param diffs 差异映射
   * @param current 当前变量集合
   */
  private processVariableDiffs(
    type: VariableType,
    diffs: Record<string, 'added' | 'changed' | 'deleted' | 'unchanged'>,
    current: Record<string, any>,
  ): void {
    // 处理所有变更
    for (const [name, diffType] of Object.entries(diffs)) {
      // 跳过未变更的变量
      if (diffType === 'unchanged') continue;

      // 获取当前值（如果是删除则为undefined）
      const value = diffType === 'deleted' ? undefined : current[name];

      // 记录详细日志
      if (diffType === 'added') {
        console.log(`[VariableSyncService] 新增${type}变量: ${name} =`, value);
      } else if (diffType === 'changed') {
        console.log(`[VariableSyncService] 变更${type}变量: ${name} =`, value);
      } else if (diffType === 'deleted') {
        console.log(`[VariableSyncService] 删除${type}变量: ${name}`);
      }

      // 通知变量更新
      this.notifyVariableUpdate(type, name, value);

      // 应用UI动画
      this.addVariableAnimation(type, name, diffType as 'added' | 'changed' | 'deleted');
    }
  }

  /**
   * 处理设置更新
   * @param variableType 可选的变量类型，如果指定则只处理该类型的变量
   * @param forceRefresh 是否强制刷新（忽略比较逻辑，直接通知所有变量）
   */
  private async handleSettingsUpdate(variableType?: VariableType, forceRefresh: boolean = false): Promise<void> {
    try {
      // 确定要处理的变量类型
      // 如果指定了类型，则使用指定的类型；否则只处理当前活动的类型
      const typesToProcess: VariableType[] = variableType ? [variableType] : [this.activeVariableType];

      console.log(
        `[VariableSyncService] 处理设置更新 - 当前活动类型: ${
          this.activeVariableType
        }, 要处理的类型: ${typesToProcess.join(',')}`,
      );

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
          // 计算变量差异
          const diffs = this.computeVariableDiffs(previous, current);

          // 处理差异
          this.processVariableDiffs(type, diffs, current);
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
    try {
      const variables = getVariables({ type });
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
    // 检查是否与当前活动类型匹配
    if (type !== this.activeVariableType) {
      console.log(
        `[VariableSyncService] 跳过为变量添加动画: type=${type}, name=${name}, 因为当前活动类型为 ${this.activeVariableType}`,
      );
      return;
    }

    // 查找元素，并添加动画类
    try {
      const variableSelector = `.variable-card[data-type="${type}"][data-name="${name}"]`;
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
      const variableSelector = `.variable-card[data-type="${type}"][data-name="${name}"]`;
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
    // 检查是否与当前活动类型匹配
    if (type !== this.activeVariableType) {
      console.log(
        `[VariableSyncService] 跳过处理外部变量变更: type=${type}, name=${name}, 因为当前活动类型为 ${this.activeVariableType}`,
      );
      return;
    }

    console.log(`[VariableSyncService] 处理外部变量变更: ${type}.${name} =`, value);

    // 检查是否通过DOM属性已经反映了这个变更
    // 特别是在变量重命名场景中
    const variableSelector = `.variable-card[data-name="${name}"]`;
    const $existingCard = $(variableSelector);

    // 如果是删除操作，且同名卡片已经不存在，说明是重命名的删除部分，已被UI处理，跳过此次操作
    if (value === undefined && $existingCard.length === 0) {
      console.log(`[VariableSyncService] 跳过删除操作，因为卡片"${name}"已不存在，可能是重命名操作的一部分`);
      return;
    }

    // 如果是添加操作，且同名卡片已存在，且有data-original-name属性与name相同，说明是重命名操作且UI已更新，跳过此次操作
    if (value !== undefined && $existingCard.length > 0 && $existingCard.attr('data-original-name') === name) {
      console.log(
        `[VariableSyncService] 跳过添加操作，因为卡片"${name}"已存在且原始名称已更新，可能是重命名操作的一部分`,
      );
      return;
    }

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
    // 检查是否与当前活动类型匹配
    if (type !== this.activeVariableType) {
      console.log(
        `[VariableSyncService] 跳过应用列表排序变更: type=${type}, name=${name}, 因为当前活动类型为 ${this.activeVariableType}`,
      );
      return;
    }

    // 通知变量已更新
    this.notifyVariableUpdate(type, name, newOrder);
  }
}
