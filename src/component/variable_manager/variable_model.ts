import { getLastMessageId } from '@/function/util';
import {
  deleteVariable,
  getVariables,
  insertOrAssignVariables,
  replaceVariables,
  updateVariablesWith,
} from '@/function/variables';
import { VariableDataType, VariableItem, VariableType } from '@/component/variable_manager/types';

export class VariableModel {
  private currentVariables: Record<string, any> = {};

  private activeVariableType: VariableType = 'global';

  private filterState: Record<VariableDataType, boolean> = {
    string: true,
    array: true,
    boolean: true,
    number: true,
    object: true,
  };

  private searchKeyword: string = '';

  private floorMinRange: number | null = null;
  private floorMaxRange: number | null = null;

  constructor() {}

  /**
   * 加载指定类型的变量
   * @param type 变量类型(global/character/chat/message)
   */
  public async loadVariables(type: VariableType): Promise<void> {
    this.activeVariableType = type;

    if (type === 'message') {
      const [currentMinFloor, currentMaxFloor] = this.getFloorRange();
      const hasExistingRange = currentMinFloor !== null && currentMaxFloor !== null;

      if (!hasExistingRange) {
        const lastMessageId = getLastMessageId();

        const newMinFloor = Math.max(0, lastMessageId - 4);
        const newMaxFloor = lastMessageId;

        this.updateFloorRange(newMinFloor, newMaxFloor);
      }

      this.currentVariables = {};

      if (hasExistingRange || (currentMinFloor !== null && currentMaxFloor !== null)) {
        const minFloor = currentMinFloor!;
        const maxFloor = currentMaxFloor!;

        for (let floor = minFloor; floor <= maxFloor; floor++) {
          const floorVars = this.getFloorVariables(floor);
          const floorVarCount = Object.keys(floorVars).length;

          if (floorVarCount > 0) {
            Object.assign(this.currentVariables, floorVars);
          }
        }
      }
    } else {
      this.currentVariables = getVariables({ type });
    }
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
   * @param type 变量类型(global/character/chat/message)
   * @param name 变量名称
   * @param dataType 数据类型
   * @param value 变量值
   */
  public async saveVariableData(type: VariableType, name: string, value: any): Promise<void> {
    if (type === this.activeVariableType) {
      this.currentVariables[name] = value;
    }

    await insertOrAssignVariables({ [name]: value }, { type });
  }

  /**
   * 删除变量
   * @param type 变量类型(global/character/chat/message)
   * @param name 变量名称
   */
  public async deleteVariableData(type: VariableType, name: string): Promise<void> {
    if (type === this.activeVariableType && this.currentVariables[name]) {
      delete this.currentVariables[name];
    }

    await deleteVariable(name, { type });
  }

  /**
   * 重命名变量（在单个事务中完成）
   * @param type 变量类型(global/character/chat/message)
   * @param oldName 旧变量名称
   * @param newName 新变量名称
   * @param value 变量值
   */
  public async renameVariable(type: VariableType, oldName: string, newName: string, value: any): Promise<void> {
    await updateVariablesWith(
      variables => {
        _.set(variables, newName, value);
        _.unset(variables, oldName);
        return variables;
      },
      { type },
    );

    if (type === this.activeVariableType) {
      this.currentVariables[newName] = value;
      delete this.currentVariables[oldName];
    }
  }

  /**
   * 更新列表变量的顺序
   * @param type 变量类型(global/character/chat/message)
   * @param name 变量名称
   * @param items 新的列表顺序
   */
  public async updateListOrder(type: VariableType, name: string, items: string[]): Promise<void> {
    if (type === this.activeVariableType && this.currentVariables[name] && Array.isArray(this.currentVariables[name])) {
      this.currentVariables[name] = items;
      await insertOrAssignVariables({ [name]: items }, { type });
    }
  }

  /**
   * 清除所有变量
   * @param type 变量类型(global/character/chat/message)
   */
  public async clearAllVariables(type: VariableType): Promise<void> {
    if (type === this.activeVariableType) {
      this.currentVariables = {};
    }

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
   * 更新楼层范围筛选
   * @param min 最小楼层
   * @param max 最大楼层
   */
  public updateFloorRange(min: number | null, max: number | null): void {
    if (min !== null) {
      min = Math.max(0, min);
    }

    this.floorMinRange = min;
    this.floorMaxRange = max;
  }

  /**
   * 获取当前楼层范围筛选
   * @returns 当前楼层范围 [min, max]
   */
  public getFloorRange(): [number | null, number | null] {
    return [this.floorMinRange, this.floorMaxRange];
  }

  /**
   * 获取特定楼层的变量数据
   * @param messageId 消息ID
   * @returns 楼层变量数据对象
   */
  public getFloorVariables(messageId: number): Record<string, any> {
    try {
      const variables = getVariables({ type: 'message', message_id: messageId });
      return variables || {};
    } catch (error) {
      console.error(`获取第${messageId}层变量失败:`, error);
      return {};
    }
  }

  /**
   * 转换变量到UI显示格式
   * @returns 格式化后的变量列表，用于UI显示
   */
  public formatVariablesForUI(): VariableItem[] {
    const result: VariableItem[] = [];

    for (const name in this.currentVariables) {
      const value = this.currentVariables[name];
      let type: VariableDataType = 'string';
      let formattedValue = value;

      if (Array.isArray(value)) {
        type = 'array';
      } else if (value === null) {
        type = 'string';
        formattedValue = 'null';
      } else if (value === undefined) {
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
   * @param operationId 操作ID（用于日志追踪）
   * @returns 过滤后的变量列表
   */
  public filterVariables(): VariableItem[] {
    const initialVariables = this.formatVariablesForUI();

    if (Object.values(this.filterState).every(value => value === true) && !this.searchKeyword) {
      return initialVariables;
    }

    const filteredVariables = initialVariables.filter(variable => {
      const typeFilterPassed = this.filterState[variable.type];
      if (!typeFilterPassed) return false;

      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase();
        const nameMatch = variable.name.toLowerCase().includes(keyword);

        let valueMatch = false;
        if (['string','number', 'boolean'].includes(variable.type)) {
          const valueStr = String(variable.value).toLowerCase();
          valueMatch = valueStr.includes(keyword);
        }

        return nameMatch || valueMatch;
      }

      return true;
    });

    return filteredVariables;
  }
}
