import { VariableChangeCallback, VariableType } from './types';

/**
 * 存储注册的变量变更事件监听器
 */
const changeListeners: VariableChangeCallback[] = [];

/**
 * 初始化同步服务
 */
export function initSync(): void {
  // 初始化变量同步系统
}

/**
 * 注册变量变更监听器
 * @param callback 回调函数
 */
export function registerVariableChangeListener(callback: VariableChangeCallback): void {
  changeListeners.push(callback);
}

/**
 * 移除变量变更监听器
 * @param callback 要移除的回调函数
 */
export function removeVariableChangeListener(callback: VariableChangeCallback): void {
  const index = changeListeners.indexOf(callback);
  if (index !== -1) {
    changeListeners.splice(index, 1);
  }
}

/**
 * 通知变量已更新
 * @param type 变量类型
 * @param name 变量名称
 * @param value 变量值
 */
export function notifyVariableUpdate(type: VariableType, name: string, value: any): void {
  // 通知所有监听器
  changeListeners.forEach(listener => {
    try {
      listener(type, name, value);
    } catch (error) {
      console.error('变量更新监听器执行出错:', error);
    }
  });
}

/**
 * 注册系统变量变更监听
 */
export function registerChangeListeners(): void {
  // 监听ST系统的变量变化

  // 添加聊天变量变更监听
  listenChatVariableChanges();

  // 添加角色变量变更监听
  listenCharacterVariableChanges();

  // 添加全局变量变更监听
  listenGlobalVariableChanges();
}

/**
 * 监听聊天变量变更
 */
function listenChatVariableChanges(): void {
  // 监听聊天元数据变更事件
  // 例如: ST事件系统中的chat元数据变更事件
}

/**
 * 监听角色变量变更
 */
function listenCharacterVariableChanges(): void {
  // 监听角色变量变更事件
  // 例如: ST事件系统中的角色变更事件
}

/**
 * 监听全局变量变更
 */
function listenGlobalVariableChanges(): void {
  // 监听全局变量变更事件
  // 例如: ST事件系统中的设置变更事件
}

/**
 * 处理外部变量变更
 * @param type 变量类型
 * @param name 变量名称
 * @param value 新的变量值
 */
export function handleExternalVariableChange(type: VariableType, name: string, value: any): void {
  // 通知其他监听器
  notifyVariableUpdate(type, name, value);
}

/**
 * 应用列表变量排序变更
 * @param type 变量类型
 * @param name 变量名称
 * @param newOrder 新的排序
 */
export async function applyListOrderChange(type: VariableType, name: string, newOrder: string[]): Promise<void> {
  // 更新变量存储

  // 通知变量已更新
  notifyVariableUpdate(type, name, newOrder);
}
