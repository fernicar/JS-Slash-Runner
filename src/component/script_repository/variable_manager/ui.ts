import { getSortableDelay } from '@sillytavern/scripts/utils';
import { formatVariablesForUI, getFilterState, getSearchKeyword, saveVariableData } from './store';
import { notifyVariableUpdate, registerVariableChangeListener } from './sync';
import { VariableDataType, VariableItem, VariableType } from './types';

/**
 * 存储UI容器
 */
let $container: JQuery<HTMLElement>;

/**
 * 初始化UI
 * @param container 变量管理器容器
 */
export function initUI(container: JQuery<HTMLElement>): void {
  $container = container;

  // 注册为变量变更监听器
  registerVariableChangeListener(handleVariableChange);
}

/**
 * 处理变量变更
 * @param type 变量类型
 * @param name 变量名称
 * @param value 变量值
 */
function handleVariableChange(type: VariableType, name: string, value: any): void {
  // 更新UI显示
  updateVariableCard(name, value);
}

/**
 * 刷新变量卡片
 * @param type 变量类型
 */
export function refreshVariableCards(type: VariableType): void {
  // 清除当前内容
  const $content = $container.find(`#${type}-content`);
  $content.empty();

  // 获取变量并刷新
  const variables = formatVariablesForUI();
  const filterState = getFilterState();
  const searchKeyword = getSearchKeyword();

  // 应用筛选和搜索
  const filteredVariables = variables.filter(variable => {
    // 筛选类型
    if (!filterState[variable.type]) {
      return false;
    }

    // 搜索匹配
    if (searchKeyword && !variable.name.toLowerCase().includes(searchKeyword.toLowerCase())) {
      return false;
    }

    return true;
  });

  // 为每个变量创建卡片
  filteredVariables.forEach(variable => {
    const card = createVariableCard(variable);
    $content.append(card);
  });

  // 如果没有变量或筛选后没有结果，显示空状态提示
  if (filteredVariables.length === 0) {
    $content.append(`
      <div class="empty-state">
        <p>没有找到符合条件的变量</p>
      </div>
    `);
  }
}

/**
 * 创建变量卡片
 * @param variable 变量信息
 * @returns 变量卡片jQuery对象
 */
function createVariableCard(variable: VariableItem): JQuery<HTMLElement> {
  switch (variable.type) {
    case 'text':
      // 将文本类型重定向到字符串类型
      return createStringVariableCard(variable.name, variable.value as string);
    case 'list':
      // 将列表类型重定向到数组类型
      return createArrayVariableCard(variable.name, variable.value as string[]);
    case 'array':
      return createArrayVariableCard(variable.name, variable.value as any[]);
    case 'boolean':
      return createBooleanVariableCard(variable.name, variable.value as boolean);
    case 'number':
      return createNumberVariableCard(variable.name, variable.value as number);
    case 'object':
      return createObjectVariableCard(variable.name, variable.value as object);
    case 'string':
      return createStringVariableCard(variable.name, variable.value as string);
    default:
      // 默认返回字符串变量卡片（包括处理null和undefined值）
      return createStringVariableCard(variable.name, String(variable.value));
  }
}

/**
 * 创建文本变量卡片
 * @param name 变量名称
 * @param value 变量值
 * @returns 文本变量卡片jQuery对象
 */
function createTextVariableCard(name: string, value: string): JQuery<HTMLElement> {
  const card = $(`
    <div class="variable-card" data-type="text">
      <div class="variable-card-header">
        <div class="variable-title-container">
          <i class="fa-solid fa-font"></i>
          <input type="text" class="variable-title" value="${name}" placeholder="变量名称">
        </div>
        <div class="variable-actions">
          <button class="variable-action-btn save-btn" title="保存">
            <i class="fa-regular fa-save"></i>
          </button>
          <button class="variable-action-btn delete-btn" title="删除">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="variable-card-content">
        <textarea class="variable-content-input" placeholder="输入变量内容">${value}</textarea>
      </div>
    </div>
  `);

  return card;
}

/**
 * 创建列表变量卡片
 * @param name 变量名称
 * @param items 列表项
 * @returns 列表变量卡片jQuery对象
 */
function createListVariableCard(name: string, items: string[]): JQuery<HTMLElement> {
  // 创建基本卡片
  const card = $(`
    <div class="variable-card" data-type="list">
      <div class="variable-card-header">
        <div class="variable-title-container">
          <i class="fa-solid fa-list"></i>
          <input type="text" class="variable-title" value="${name}" placeholder="变量名称">
        </div>
        <div class="variable-actions">
          <button class="variable-action-btn save-btn" title="保存">
            <i class="fa-regular fa-save"></i>
          </button>
          <button class="variable-action-btn delete-btn" title="删除">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="variable-card-content">
        <div class="list-items-container">
          ${generateListItems(items)}
        </div>
        <button class="add-list-item"><i class="fa-solid fa-plus"></i> 添加项目</button>
      </div>
    </div>
  `);

  // 为列表添加拖拽功能
  const listContainer = card.find('.list-items-container');
  listContainer.sortable({
    delay: getSortableDelay(),
    handle: '.drag-handle',
    stop: function () {
      // 处理排序后的更新
    },
  });

  return card;
}

/**
 * 生成列表项HTML
 * @param items 列表项数组
 * @returns 列表项HTML字符串
 */
function generateListItems(items: string[]): string {
  if (!items || items.length === 0) {
    return `
      <div class="list-item">
        <span class="drag-handle">☰</span>
        <textarea class="variable-content-input" placeholder="输入变量内容"></textarea>
        <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
      </div>
    `;
  }

  return items
    .map(
      item => `
    <div class="list-item">
      <span class="drag-handle">☰</span>
      <textarea class="variable-content-input" placeholder="输入变量内容">${item}</textarea>
      <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
    </div>
  `,
    )
    .join('');
}

/**
 * 创建新变量卡片
 * @param type 变量类型(global/character/chat)
 * @param dataType 数据类型
 */
export function createNewVariableCard(type: VariableType, dataType: VariableDataType): void {
  // 获取当前激活的内容区域
  const $content = $container.find(`#${type}-content`);

  // 创建变量名(新变量+类型+随机数)
  const typeNameMap = {
    text: '文本',
    list: '列表',
    array: '数组',
    boolean: '布尔',
    number: '数字',
    object: '对象',
    string: '字符串',
  } as const;
  const name = `新${typeNameMap[dataType as keyof typeof typeNameMap]}变量_${Math.floor(Math.random() * 1000)}`;

  // 根据数据类型创建相应的卡片
  let card: JQuery<HTMLElement>;

  switch (dataType) {
    case 'text':
      card = createTextVariableCard(name, '');
      break;
    case 'list':
      card = createListVariableCard(name, []);
      break;
    case 'array':
      card = createArrayVariableCard(name, []);
      break;
    case 'boolean':
      card = createBooleanVariableCard(name, false);
      break;
    case 'number':
      card = createNumberVariableCard(name, 0);
      break;
    case 'object':
      card = createObjectVariableCard(name, {});
      break;
    case 'string':
      card = createStringVariableCard(name, '');
      break;
    default:
      card = createTextVariableCard(name, '');
  }

  // 添加到内容区域
  $content.prepend(card);

  // 添加淡入效果
  card.hide().fadeIn(300);

  // 聚焦到标题输入框
  card.find('.variable-title').focus().select();
}

/**
 * 更新单个变量卡片
 * @param name 变量名称
 * @param value 新的变量值
 */
export function updateVariableCard(name: string, value: any): void {
  // 查找对应的变量卡片
  const card = $container.find(`.variable-card .variable-title[value="${name}"]`).closest('.variable-card');

  if (card.length === 0) return;

  // 判断类型并更新
  const type = card.attr('data-type') as VariableDataType;

  // 预先声明变量，避免在case块内声明
  let listContainer: JQuery<HTMLElement>;
  let isTrue: boolean;

  switch (type) {
    case 'text':
    case 'string':
      // 更新文本/字符串变量
      card.find('.variable-content-input').val(value);
      break;
    case 'list':
    case 'array':
      // 更新列表/数组变量
      listContainer = card.find('.list-items-container');
      listContainer.empty();
      listContainer.append(type === 'list' ? generateListItems(value) : generateArrayItems(value));
      break;
    case 'boolean':
      // 更新布尔值变量
      isTrue = !!value;
      card.find('.boolean-btn').removeClass('active');
      card.find(`.boolean-btn[data-value="${isTrue ? 'true' : 'false'}"]`).addClass('active');
      break;
    case 'number':
      // 更新数字变量
      card.find('.number-input').val(value);
      break;
    case 'object':
      // 更新对象变量
      card.find('.json-input').val(JSON.stringify(value, null, 2));
      break;
  }
}

/**
 * 获取变量卡片的值
 * @param card 变量卡片jQuery对象
 * @returns 变量值(根据类型返回相应的数据)
 */
export function getVariableCardValue(card: JQuery<HTMLElement>): any {
  const type = card.attr('data-type') as VariableDataType;

  // 预先声明变量，避免在case块内声明
  let listItems: string[];
  let arrayItems: any[];
  let value: string;
  let parsed: any;
  let numberValue: number;

  switch (type) {
    case 'text':
      // 获取文本变量值
      return card.find('.variable-content-input').val() as string;

    case 'list':
      // 获取列表变量值
      listItems = [];
      card.find('.list-item textarea').each(function () {
        listItems.push($(this).val() as string);
      });
      return listItems;

    case 'array':
      // 获取数组变量值
      arrayItems = [];
      card.find('.list-item textarea').each(function () {
        value = $(this).val() as string;
        try {
          // 尝试将内容解析为JSON，如果失败则作为普通字符串处理
          parsed = JSON.parse(value);
          arrayItems.push(parsed);
        } catch (e) {
          arrayItems.push(value);
        }
      });
      return arrayItems;

    case 'boolean':
      // 获取布尔变量值
      return card.find('.boolean-btn[data-value="true"]').hasClass('active');

    case 'number':
      // 获取数字变量值
      numberValue = parseFloat(card.find('.number-input').val() as string);
      return isNaN(numberValue) ? 0 : numberValue;

    case 'object':
      // 获取对象变量值
      try {
        return JSON.parse(card.find('.json-input').val() as string);
      } catch (e) {
        console.error('JSON解析错误:', e);
        return {}; // 解析失败返回空对象
      }

    case 'string':
      // 获取字符串变量值
      return card.find('.variable-content-input').val() as string;

    default:
      // 默认返回文本内容
      return card.find('.variable-content-input').val() as string;
  }
}

/**
 * 获取变量卡片的名称
 * @param card 变量卡片jQuery对象
 * @returns 变量名称
 */
export function getVariableCardName(card: JQuery<HTMLElement>): string {
  return card.find('.variable-title').val() as string;
}

/**
 * 保存变量卡片数据
 * @param type 变量类型
 * @param card 卡片jQuery对象
 */
export async function saveCardData(type: VariableType, card: JQuery<HTMLElement>): Promise<void> {
  const name = getVariableCardName(card);
  const dataType = card.attr('data-type') as VariableDataType;
  const value = getVariableCardValue(card);

  // 调用store中的保存方法
  await saveVariableData(type, name, dataType, value);

  // 通知变量已更新
  notifyVariableUpdate(type, name, value);
}

/**
 * 创建数组变量卡片
 * @param name 变量名称
 * @param items 数组项
 * @returns 数组变量卡片jQuery对象
 */
function createArrayVariableCard(name: string, items: any[]): JQuery<HTMLElement> {
  // 创建基本卡片
  const card = $(`
    <div class="variable-card" data-type="array">
      <div class="variable-card-header">
        <div class="variable-title-container">
          <i class="fa-solid fa-brackets fa-solid fa-list-ol"></i>
          <input type="text" class="variable-title" value="${name}" placeholder="变量名称">
        </div>
        <div class="variable-actions">
          <button class="variable-action-btn save-btn" title="保存">
            <i class="fa-regular fa-save"></i>
          </button>
          <button class="variable-action-btn delete-btn" title="删除">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="variable-card-content">
        <div class="list-items-container">
          ${generateArrayItems(items)}
        </div>
        <button class="add-list-item"><i class="fa-solid fa-plus"></i> 添加项目</button>
      </div>
    </div>
  `);

  // 为列表添加拖拽功能
  const listContainer = card.find('.list-items-container');
  listContainer.sortable({
    delay: getSortableDelay(),
    handle: '.drag-handle',
    stop: function () {
      // 处理排序后的更新
    },
  });

  return card;
}

/**
 * 生成数组项HTML
 * @param items 数组项
 * @returns 数组项HTML字符串
 */
function generateArrayItems(items: any[]): string {
  if (!items || items.length === 0) {
    return `
      <div class="list-item">
        <span class="drag-handle">☰</span>
        <textarea class="variable-content-input" placeholder="输入变量内容"></textarea>
        <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
      </div>
    `;
  }

  return items
    .map(
      item => `
    <div class="list-item">
      <span class="drag-handle">☰</span>
      <textarea class="variable-content-input" placeholder="输入变量内容">${
        typeof item === 'object' ? JSON.stringify(item) : item
      }</textarea>
      <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
    </div>
  `,
    )
    .join('');
}

/**
 * 创建布尔变量卡片
 * @param name 变量名称
 * @param value 布尔值
 * @returns 布尔变量卡片jQuery对象
 */
function createBooleanVariableCard(name: string, value: boolean): JQuery<HTMLElement> {
  const card = $(`
    <div class="variable-card" data-type="boolean">
      <div class="variable-card-header">
        <div class="variable-title-container">
          <i class="fa-solid fa-toggle-on"></i>
          <input type="text" class="variable-title" value="${name}" placeholder="变量名称">
        </div>
        <div class="variable-actions">
          <button class="variable-action-btn save-btn" title="保存">
            <i class="fa-regular fa-save"></i>
          </button>
          <button class="variable-action-btn delete-btn" title="删除">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="variable-card-content">
        <div class="boolean-buttons-container">
          <button class="boolean-btn ${value ? 'active' : ''}" data-value="true">true</button>
          <button class="boolean-btn ${!value ? 'active' : ''}" data-value="false">false</button>
        </div>
      </div>
    </div>
  `);

  // 添加点击事件
  card.find('.boolean-btn').on('click', function () {
    // 移除所有按钮的active类
    card.find('.boolean-btn').removeClass('active');
    // 给当前点击的按钮添加active类
    $(this).addClass('active');
  });

  return card;
}

/**
 * 创建数字变量卡片
 * @param name 变量名称
 * @param value 数字值
 * @returns 数字变量卡片jQuery对象
 */
function createNumberVariableCard(name: string, value: number): JQuery<HTMLElement> {
  const card = $(`
    <div class="variable-card" data-type="number">
      <div class="variable-card-header">
        <div class="variable-title-container">
          <i class="fa-solid fa-hashtag"></i>
          <input type="text" class="variable-title" value="${name}" placeholder="变量名称">
        </div>
        <div class="variable-actions">
          <button class="variable-action-btn save-btn" title="保存">
            <i class="fa-regular fa-save"></i>
          </button>
          <button class="variable-action-btn delete-btn" title="删除">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="variable-card-content">
        <input type="number" class="number-input" value="${value}" placeholder="输入数字">
      </div>
    </div>
  `);

  return card;
}

/**
 * 创建对象变量卡片
 * @param name 变量名称
 * @param value 对象值
 * @returns 对象变量卡片jQuery对象
 */
function createObjectVariableCard(name: string, value: object): JQuery<HTMLElement> {
  const jsonString = JSON.stringify(value, null, 2);

  const card = $(`
    <div class="variable-card" data-type="object">
      <div class="variable-card-header">
        <div class="variable-title-container">
          <i class="fa-solid fa-cube"></i>
          <input type="text" class="variable-title" value="${name}" placeholder="变量名称">
        </div>
        <div class="variable-actions">
          <button class="variable-action-btn save-btn" title="保存">
            <i class="fa-regular fa-save"></i>
          </button>
          <button class="variable-action-btn delete-btn" title="删除">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="variable-card-content">
        <textarea class="variable-content-input json-input" placeholder="输入JSON对象">${jsonString}</textarea>
      </div>
    </div>
  `);

  return card;
}

/**
 * 创建字符串变量卡片
 * @param name 变量名称
 * @param value 字符串值
 * @returns 字符串变量卡片jQuery对象
 */
function createStringVariableCard(name: string, value: string): JQuery<HTMLElement> {
  const card = $(`
    <div class="variable-card" data-type="string">
      <div class="variable-card-header">
        <div class="variable-title-container">
          <i class="fa-solid fa-font"></i>
          <input type="text" class="variable-title" value="${name}" placeholder="变量名称">
        </div>
        <div class="variable-actions">
          <button class="variable-action-btn save-btn" title="保存">
            <i class="fa-regular fa-save"></i>
          </button>
          <button class="variable-action-btn delete-btn" title="删除">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="variable-card-content">
        <textarea class="variable-content-input" placeholder="输入变量内容">${value}</textarea>
      </div>
    </div>
  `);

  return card;
}
