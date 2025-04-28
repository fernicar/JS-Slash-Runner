/**
 * 变量类型
 */
export type VariableType = 'global' | 'character' | 'chat';

/**
 * 变量数据类型
 */
export type VariableDataType =
  | 'text'
  | 'list' // 原始类型
  | 'array'
  | 'boolean'
  | 'number'
  | 'object'
  | 'string';

/**
 * 变量项结构
 */
export interface VariableItem {
  /** 变量名称 */
  name: string;
  /** 变量类型 */
  type: VariableDataType;
  /** 变量值(根据类型可以是不同的数据) */
  value: any;
}

/**
 * 变量变更事件回调函数类型
 */
export type VariableChangeCallback = (type: VariableType, name: string, value: any) => void;
