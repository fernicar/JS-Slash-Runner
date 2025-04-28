import { deleteVariable, getVariables, insertOrAssignVariables, replaceVariables } from '@/function/variables';
import { VariableDataType, VariableItem, VariableType } from './types';

/**
 * 存储当前加载的变量
 */
let currentVariables: Record<string, any> = {};

/**
 * 当前活动的变量类型
 */
let activeVariableType: VariableType = 'global';

/**
 * 筛选状态
 */
let filterState: Record<VariableDataType, boolean> = {
  string: true,
  array: true,
  boolean: true,
  number: true,
  object: true,
  list: true,
  text: true,
};

/**
 * 搜索关键词
 */
let searchKeyword: string = '';

/**
 * 初始化变量存储
 */
export function initStore(): void {
  // 初始化变量存储相关功能
}

/**
 * 加载指定类型的变量
 * @param type 变量类型(global/character/chat)
 */
export async function loadVariables(type: VariableType): Promise<void> {
  // 从系统获取变量并存储到currentVariables
  activeVariableType = type;
  currentVariables = getVariables({ type });
}

/**
 * 获取当前加载的所有变量
 * @returns 当前变量
 */
export function getCurrentVariables(): Record<string, any> {
  return currentVariables;
}

/**
 * 获取当前活动的变量类型
 * @returns 变量类型
 */
export function getActiveVariableType(): VariableType {
  return activeVariableType;
}

/**
 * 获取特定变量的值
 * @param name 变量名称
 * @returns 变量值
 */
export function getVariableValue(name: string): any {
  return currentVariables[name];
}

/**
 * 保存变量数据
 * @param type 变量类型(global/character/chat)
 * @param name 变量名称
 * @param dataType 数据类型
 * @param value 变量值
 */
export async function saveVariableData(
  type: VariableType,
  name: string,
  dataType: VariableDataType,
  value: any,
): Promise<void> {
  // 将变量保存到系统中
  if (type === activeVariableType) {
    currentVariables[name] = value;
  }

  // 调用变量保存函数
  await insertOrAssignVariables({ [name]: value }, { type });
}

/**
 * 删除变量
 * @param type 变量类型(global/character/chat)
 * @param name 变量名称
 */
export async function deleteVariableData(type: VariableType, name: string): Promise<void> {
  // 从系统中删除变量
  if (type === activeVariableType && currentVariables[name]) {
    delete currentVariables[name];
  }

  // 调用变量删除函数
  await deleteVariable(name, { type });
}

/**
 * 更新列表变量的顺序
 * @param type 变量类型(global/character/chat)
 * @param name 变量名称
 * @param items 新的列表顺序
 */
export async function updateListOrder(type: VariableType, name: string, items: string[]): Promise<void> {
  // 更新列表变量顺序
  if (type === activeVariableType && currentVariables[name] && Array.isArray(currentVariables[name])) {
    currentVariables[name] = items;
    await insertOrAssignVariables({ [name]: items }, { type });
  }
}

/**
 * 清除所有变量
 * @param type 变量类型(global/character/chat)
 */
export async function clearAllVariables(type: VariableType): Promise<void> {
  // 清除指定类型的所有变量
  if (type === activeVariableType) {
    currentVariables = {};
  }

  // 替换为空对象
  await replaceVariables({}, { type });
}

/**
 * 更新筛选状态
 * @param type 数据类型
 * @param checked 是否选中
 */
export function updateFilterState(type: VariableDataType, checked: boolean): void {
  filterState[type] = checked;
}

/**
 * 获取筛选状态
 * @returns 筛选状态
 */
export function getFilterState(): Record<VariableDataType, boolean> {
  return filterState;
}

/**
 * 更新搜索关键词
 * @param keyword 关键词
 */
export function updateSearchKeyword(keyword: string): void {
  searchKeyword = keyword;
}

/**
 * 获取搜索关键词
 * @returns 搜索关键词
 */
export function getSearchKeyword(): string {
  return searchKeyword;
}

/**
 * 转换变量到UI显示格式
 * @returns 格式化后的变量列表，用于UI显示
 */
export function formatVariablesForUI(): VariableItem[] {
  // 将当前变量格式化为UI可用的格式
  const result: VariableItem[] = [];

  for (const name in currentVariables) {
    const value = currentVariables[name];
    let type: VariableDataType;
    let formattedValue = value;

    // 检测JavaScript数据类型
    if (Array.isArray(value)) {
      type = 'array';
    } else if (value === null) {
      // 将null值转为字符串显示
      type = 'string';
      formattedValue = 'null';
    } else if (value === undefined) {
      // 将undefined值转为字符串显示
      type = 'string';
      formattedValue = 'undefined';
    } else if (typeof value === 'boolean') {
      type = 'boolean';
    } else if (typeof value === 'number') {
      type = 'number';
    } else if (typeof value === 'object') {
      type = 'object';
    } else if (typeof value === 'string') {
      type = 'string';
    } else {
      // 兼容原有类型
      type = Array.isArray(value) ? 'list' : 'text';
    }

    result.push({
      name,
      type,
      value: formattedValue,
    });
  }

  return result;
}
