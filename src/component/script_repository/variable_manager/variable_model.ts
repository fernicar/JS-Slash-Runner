import {
  deleteVariable,
  getVariables,
  insertOrAssignVariables,
  replaceVariables,
  updateVariablesWith,
} from '@/function/variables';
import { VariableDataType, VariableItem, VariableType } from './types';

/**
 * 变量数据模型类，负责变量数据的管理和存储
 */
export class VariableModel {
  /**
   * 存储当前加载的变量
   */
  private currentVariables: Record<string, any> = {};

  /**
   * 当前活动的变量类型
   */
  private activeVariableType: VariableType = 'global';

  /**
   * 筛选状态
   */
  private filterState: Record<VariableDataType, boolean> = {
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
  private searchKeyword: string = '';

  /**
   * 构造函数
   */
  constructor() {
    // 初始化模型
  }

  /**
   * 加载指定类型的变量
   * @param type 变量类型(global/character/chat)
   */
  public async loadVariables(type: VariableType): Promise<void> {
    console.log(`[VariableModel] 开始加载${type}变量`);
    this.activeVariableType = type;
    this.currentVariables = getVariables({ type });
    console.log(`[VariableModel] 加载${type}变量完成`, JSON.stringify(this.currentVariables));
  }

  /**
   * 获取当前加载的所有变量
   * @returns 当前变量
   */
  public getCurrentVariables(): Record<string, any> {
    return this.currentVariables;
  }

  /**
   * 获取当前活动的变量类型
   * @returns 变量类型
   */
  public getActiveVariableType(): VariableType {
    return this.activeVariableType;
  }

  /**
   * 获取特定变量的值
   * @param name 变量名称
   * @returns 变量值
   */
  public getVariableValue(name: string): any {
    return this.currentVariables[name];
  }

  /**
   * 保存变量数据
   * @param type 变量类型(global/character/chat)
   * @param name 变量名称
   * @param dataType 数据类型
   * @param value 变量值
   */
  public async saveVariableData(
    type: VariableType,
    name: string,
    dataType: VariableDataType,
    value: any,
  ): Promise<void> {
    // 更新内存中的变量
    if (type === this.activeVariableType) {
      this.currentVariables[name] = value;
    }

    // 调用系统变量保存函数
    await insertOrAssignVariables({ [name]: value }, { type });
  }

  /**
   * 删除变量
   * @param type 变量类型(global/character/chat)
   * @param name 变量名称
   */
  public async deleteVariableData(type: VariableType, name: string): Promise<void> {
    // 从内存中删除变量
    if (type === this.activeVariableType && this.currentVariables[name]) {
      delete this.currentVariables[name];
    }

    // 调用系统变量删除函数
    await deleteVariable(name, { type });
  }

  /**
   * 重命名变量（在单个事务中完成）
   * @param type 变量类型(global/character/chat)
   * @param oldName 旧变量名称
   * @param newName 新变量名称
   * @param value 变量值
   */
  public async renameVariable(type: VariableType, oldName: string, newName: string, value: any): Promise<void> {
    // 在一个事务中完成重命名操作
    await updateVariablesWith(
      variables => {
        // 设置新值
        _.set(variables, newName, value);
        // 删除旧值
        _.unset(variables, oldName);
        return variables;
      },
      { type },
    );

    // 更新内存中的变量
    if (type === this.activeVariableType) {
      this.currentVariables[newName] = value;
      delete this.currentVariables[oldName];
    }
  }

  /**
   * 更新列表变量的顺序
   * @param type 变量类型(global/character/chat)
   * @param name 变量名称
   * @param items 新的列表顺序
   */
  public async updateListOrder(type: VariableType, name: string, items: string[]): Promise<void> {
    // 更新列表变量顺序
    if (type === this.activeVariableType && this.currentVariables[name] && Array.isArray(this.currentVariables[name])) {
      this.currentVariables[name] = items;
      await insertOrAssignVariables({ [name]: items }, { type });
    }
  }

  /**
   * 清除所有变量
   * @param type 变量类型(global/character/chat)
   */
  public async clearAllVariables(type: VariableType): Promise<void> {
    // 清除内存中的变量
    if (type === this.activeVariableType) {
      this.currentVariables = {};
    }

    // 替换为空对象
    await replaceVariables({}, { type });
  }

  /**
   * 更新筛选状态
   * @param type 数据类型
   * @param checked 是否选中
   */
  public updateFilterState(type: VariableDataType, checked: boolean): void {
    this.filterState[type] = checked;
  }

  /**
   * 获取筛选状态
   * @returns 筛选状态
   */
  public getFilterState(): Record<VariableDataType, boolean> {
    return this.filterState;
  }

  /**
   * 更新搜索关键词
   * @param keyword 关键词
   */
  public updateSearchKeyword(keyword: string): void {
    this.searchKeyword = keyword;
  }

  /**
   * 获取搜索关键词
   * @returns 搜索关键词
   */
  public getSearchKeyword(): string {
    return this.searchKeyword;
  }

  /**
   * 转换变量到UI显示格式
   * @returns 格式化后的变量列表，用于UI显示
   */
  public formatVariablesForUI(): VariableItem[] {
    const result: VariableItem[] = [];

    for (const name in this.currentVariables) {
      const value = this.currentVariables[name];
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

  /**
   * 过滤变量列表
   * @returns 过滤后的变量列表
   */
  public filterVariables(): VariableItem[] {
    const variables = this.formatVariablesForUI();

    return variables.filter(variable => {
      // 筛选类型
      if (!this.filterState[variable.type]) {
        return false;
      }

      // 搜索匹配
      if (this.searchKeyword && !variable.name.toLowerCase().includes(this.searchKeyword.toLowerCase())) {
        return false;
      }

      return true;
    });
  }
}
