import { getSortableDelay } from '@sillytavern/scripts/utils';
import { VariableDataType } from './types';

/**
 * 变量卡片类，负责创建各种类型的变量卡片
 */
export class VariableCardFactory {
  /**
   * 创建变量卡片
   * @param type 变量数据类型
   * @param name 变量名称
   * @param value 变量值
   * @returns 变量卡片jQuery对象
   */
  public createCard(type: VariableDataType, name: string, value: any): JQuery<HTMLElement> {
    switch (type) {
      case 'text':
        // 将文本类型重定向到字符串类型
        return this.createStringCard(name, value as string);
      case 'list':
        // 将列表类型重定向到数组类型
        return this.createArrayCard(name, value as string[]);
      case 'array':
        return this.createArrayCard(name, value as any[]);
      case 'boolean':
        return this.createBooleanCard(name, value as boolean);
      case 'number':
        return this.createNumberCard(name, value as number);
      case 'object':
        return this.createObjectCard(name, value as object);
      case 'string':
        return this.createStringCard(name, value as string);
      default:
        // 默认返回字符串变量卡片（包括处理null和undefined值）
        return this.createStringCard(name, String(value));
    }
  }

  /**
   * 创建数组变量卡片
   * @param name 变量名称
   * @param items 数组项
   * @returns 数组变量卡片jQuery对象
   */
  private createArrayCard(name: string, items: any[]): JQuery<HTMLElement> {
    // 创建基本卡片
    const card = $(`
      <div class="variable-card" data-type="array">
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
            ${this.generateArrayItems(items)}
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
        // 处理排序后的更新逻辑将由Controller负责
      },
    });

    return card;
  }

  /**
   * 生成数组项HTML
   * @param items 数组项
   * @returns 数组项HTML字符串
   */
  private generateArrayItems(items: any[]): string {
    if (!items || items.length === 0) {
      return '';
    }

    return items
      .map(
        item => `
      <div class="list-item">
        <span class="drag-handle">☰</span>
        <textarea class="variable-content-input">${String(item)}</textarea>
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
  private createBooleanCard(name: string, value: boolean): JQuery<HTMLElement> {
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
          <div class="boolean-input-container">
            <div class="boolean-buttons-container">
              <button class="boolean-btn ${value ? 'active' : ''}" data-value="true">True</button>
              <button class="boolean-btn ${!value ? 'active' : ''}" data-value="false">False</button>
            </div>
          </div>
        </div>
      </div>
    `);

    // 添加按钮点击事件，更新显示值
    card.find('.boolean-btn').on('click', function () {
      // 更新按钮状态
      card.find('.boolean-btn').removeClass('active');
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
  private createNumberCard(name: string, value: number): JQuery<HTMLElement> {
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
          <input type="number" class="number-input variable-content-input" value="${value}" step="any">
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
  private createObjectCard(name: string, value: object): JQuery<HTMLElement> {
    // 将对象转换为格式化的JSON字符串
    const jsonString = JSON.stringify(value, null, 2);

    const card = $(`
      <div class="variable-card" data-type="object">
        <div class="variable-card-header">
          <div class="variable-title-container">
            <i class="fa-solid fa-code"></i>
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
          <textarea class="json-input variable-content-input" placeholder="输入JSON对象">${jsonString}</textarea>
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
  private createStringCard(name: string, value: string): JQuery<HTMLElement> {
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
          <textarea class="string-input variable-content-input" placeholder="输入字符串值">${value}</textarea>
        </div>
      </div>
    `);

    return card;
  }
}
