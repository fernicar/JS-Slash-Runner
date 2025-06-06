import { VariableDataType, VariableItem } from '@/component/variable_manager/types';
import { VariableManagerUtil } from '@/component/variable_manager/util';
import { getSortableDelay } from '@sillytavern/scripts/utils';

interface CardConfig {
  type: VariableDataType;
  name: string;
  icon: string;
  extraActions?: string;
  contentHtml: string;
  setupCallback?: (card: JQuery<HTMLElement>) => void;
}

export class VariableCardFactory {
  private defaultTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>;

  /**
   * 构造函数
   * @param defaultTypeDialogCallback 默认的类型选择对话框回调函数
   */
  constructor(defaultTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>) {
    this.defaultTypeDialogCallback = defaultTypeDialogCallback;
  }

  /**
   * 创建变量卡片
   * @param variable 变量
   * @param isNested 是否为嵌套卡片
   * @param showTypeDialogCallback 显示类型选择对话框的回调函数（仅用于对象类型）
   * @returns 变量卡片jQuery对象
   */
  public createCard(
    variable: VariableItem,
    isNested?: boolean,
    showTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>,
  ): JQuery<HTMLElement> {
    let card: JQuery<HTMLElement>;
    const { name, value, dataType, id } = variable;
    if (isNested) {
      card = $(`<div class="variable-card nested-card" data-type="${dataType}">
        <div class="variable-card-header">
          <div class="variable-title-container">
            <i></i>
            <input type="text" class="nested-card-key-input" value="${name}" title="点击编辑键名">
          </div>
          <div class="variable-actions">
            <button class="variable-action-btn object-save-btn" title="保存">
              <i class="fa-regular fa-save"></i>
            </button>
            <button class="variable-action-btn object-delete-btn" title="删除">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
        <div class="variable-card-content">
        </div>
      </div>`);
    } else {
      card = $(`
      <div class="variable-card" data-type="${dataType}" data-variable-id="${id}">
        <div class="variable-card-header">
          <div class="variable-title-container">
            <i></i>
            <input type="text" class="variable-title" value="${name}" placeholder="变量名称">
          </div>
          <div class="variable-actions">
            ${extraActions}
            <button class="variable-action-btn save-btn" title="保存">
              <i class="fa-regular fa-save"></i>
            </button>
            <button class="variable-action-btn delete-btn" title="删除">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
        <div class="variable-card-content">
          
        </div>
      </div>
    `);
    }
    switch (dataType) {
      case 'array':
        card
          .find('.variable-title-container i')
          .addClass('fa-solid fa-list')
          .end()
          .find('.variable-card-content')
          .append(
            `<div class="list-items-container">${this.generateArrayItems(
              value,
            )}</div><button class="add-list-item"><i class="fa-solid fa-plus"></i> 添加项目</button>`,
          );

        {
          const listContainer = card.find('.list-items-container');
          listContainer.sortable({
            delay: getSortableDelay(),
            handle: '.drag-handle',
            // 此处只记录排序事件，实际保存由保存按钮触发
          });
        }
        break;
      case 'object':
        card.find('.variable-title-container i').addClass('fa-regular fa-code');
        this.setupObjectCard(card, variable, isNested, showTypeDialogCallback);
        break;
      case 'boolean':
        card
          .find('.variable-title-container i')
          .addClass('fa-regular fa-toggle-on')
          .end()
          .find('.variable-card-content')
          .append(
            `
              <div class="boolean-input-container">
                <div class="boolean-buttons-container">
                  <button class="boolean-btn ${value ? 'active' : ''}" data-value="true">True</button>
                  <button class="boolean-btn ${!value ? 'active' : ''}" data-value="false">False</button>
                </div>
              </div>
            `,
          )
          .find('.boolean-btn')
          .on('click', function () {
            card.find('.boolean-btn').removeClass('active');
            $(this).addClass('active');
          });
        break;
      case 'number':
        card
          .find('.variable-title-container i')
          .addClass('fa-solid fa-hashtag')
          .end()
          .find('.variable-card-content')
          .append(`<input type="number" class="number-input variable-content-input" value="${value}" step="any">`);
        break;
      case 'string':
        card
          .find('.variable-title-container i')
          .addClass('fa-solid fa-font')
          .end()
          .find('.variable-card-content')
          .append(
            `<textarea class="string-input variable-content-input" placeholder="输入字符串值">${value}</textarea>`,
          );
        break;
    }
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
      .map((item, index) => {
        // 检查是否为对象类型，如果是则创建嵌套卡片结构
        if (item !== null && typeof item === 'object') {
          return `
      <div class="list-item list-item-object" style="display: flex; align-items: flex-start; width: 100%;">
        <span class="drag-handle">☰</span>
        <div class="nested-object-container" data-value='${JSON.stringify(item)}' style="flex: 1; width: 100%;"></div>
        <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
      </div>
    `;
        } else {
          // 非对象类型仍使用textarea显示
          const displayValue = String(item);
          return `
      <div class="list-item">
        <span class="drag-handle">☰</span>
        <textarea class="variable-content-input">${displayValue}</textarea>
        <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
      </div>
    `;
        }
      })
      .join('');
  }

  /**
   * 从卡片获取变量信息
   * @param card 变量卡片
   * @returns 变量信息
   */
  public getVariableFromCard(card: JQuery<HTMLElement>): VariableItem | null {
    const id = card.attr('data-variable-id') || '';
    const name = card.find('.variable-title').val() as string;
    const dataType = card.attr('data-type') as VariableDataType;

    let value: any;

    switch (dataType) {
      case 'string':
        value = card.find('.string-input').val() as string;
        break;
      case 'number': {
        const numberValue = card.find('.number-input').val() as string;
        value = numberValue ? parseFloat(numberValue) : 0;
        break;
      }
      case 'boolean':
        value = card.find('.boolean-btn.active').attr('data-value') === 'true';
        break;
      case 'array': {
        const arrayItems: any[] = [];
        card.find('.list-item .variable-content-input').each((_, elem) => {
          const itemValue = $(elem).val() as string;
          try {
            arrayItems.push(JSON.parse(itemValue));
          } catch {
            arrayItems.push(itemValue);
          }
        });
        value = arrayItems;
        break;
      }
      case 'object': {
        const jsonValue = card.find('.json-input').val() as string;
        if (jsonValue) {
          try {
            value = JSON.parse(jsonValue);
          } catch (e) {
            console.error('JSON解析错误:', e);
            toastr.error('JSON解析错误');
            break;
          }
        } else {
          value = this.buildObjectFromNestedCards(card);
        }
        break;
      }
      default:
        value = card.find('.variable-content-input').val() as string;
    }

    return {
      id,
      name,
      dataType,
      value,
    };
  }

  /**
   * 从嵌套卡片构建对象值
   * @param card 对象卡片
   * @returns 构建的对象值
   */
  private buildObjectFromNestedCards(card: JQuery<HTMLElement>): Record<string, any> {
    const result: Record<string, any> = {};

    card.find('.nested-cards-container .nested-card').each((_index, element) => {
      const $nestedCard = $(element);
      const key = $nestedCard.find('.nested-card-key-input').val() as string;
      const nestedDataType = $nestedCard.attr('data-type') as VariableDataType;

      let nestedValue: any;
      switch (nestedDataType) {
        case 'string':
          nestedValue = $nestedCard.find('.string-input').val();
          break;
        case 'number':
          nestedValue = parseFloat($nestedCard.find('.number-input').val() as string);
          break;
        case 'boolean':
          nestedValue = $nestedCard.find('.boolean-btn.active').attr('data-value') === 'true';
          break;
        case 'array': {
          const arrayItems: any[] = [];
          $nestedCard.find('.list-item .variable-content-input').each((_, elem) => {
            const itemValue = $(elem).val() as string;
            try {
              arrayItems.push(JSON.parse(itemValue));
            } catch {
              arrayItems.push(itemValue);
            }
          });
          nestedValue = arrayItems;
          break;
        }
        case 'object':
          nestedValue = this.buildObjectFromNestedCards($nestedCard);
          break;
        default:
          nestedValue = $nestedCard.find('.variable-content-input').val();
      }

      if (key) {
        result[key] = nestedValue;
      }
    });

    return result;
  }

  /**
   * 渲染对象卡片的卡片视图
   * @param card 对象卡片jQuery对象
   * @param variable 对象变量
   * @param showTypeDialogCallback 显示类型选择对话框的回调函数
   */
  private renderObjectCardView(
    card: JQuery<HTMLElement>,
    variable: VariableItem,
    showTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>,
  ): void {
    const $container = card.find('.nested-cards-container');
    $container.empty();

    if (!variable.value || typeof variable.value !== 'object') {
      return;
    }

    // 遍历对象的每个属性
    Object.entries(variable.value).forEach(([key, propertyValue]) => {
      // 确定属性的数据类型
      const dataType: VariableDataType = VariableManagerUtil.inferDataType(propertyValue);

      // 构造 VariableItem 对象
      const propertyVariable: VariableItem = {
        name: key,
        dataType: dataType,
        value: propertyValue,
        id: '', // 嵌套卡片不使用id
      };

      // 创建对应类型的嵌套卡片（createCard方法会自动处理对象类型的递归）
      const nestedCard = this.createCard(propertyVariable, true, showTypeDialogCallback);

      $container.append(nestedCard);

      // 绑定保存事件
      nestedCard.find('.variable-action-btn.object-save-btn').on('click', () => {
        this.saveNestedCardValue(card);
      });

      // 绑定删除事件
      nestedCard.find('.variable-action-btn.object-delete-btn').on('click', () => {
        this.deleteNestedCardValue(card, nestedCard);
      });
    });
  }

  /**
   * 触发嵌套卡片保存事件（只触发事件，不处理数据）
   * @param parentCard 父级卡片
   * @param nestedCard 嵌套卡片
   * @param propertyKey 属性键名
   */
  private saveNestedCardValue(parentCard: JQuery<HTMLElement>): void {
    this.syncCardViewToJsonInput(parentCard);

    const topLevelCard = this.findTopLevelCard(parentCard);
    if (topLevelCard) {
      topLevelCard.trigger('nested-card:changed');
    }
  }

  /**
   * 找到顶级对象卡片
   * @param card 当前卡片
   * @returns 顶级卡片或null
   */
  private findTopLevelCard(card: JQuery<HTMLElement>): JQuery<HTMLElement> | null {
    if (card.hasClass('variable-card') && !card.hasClass('nested-card')) {
      return card;
    }

    // 向上查找顶级卡片
    const topLevelCard = card.closest('.variable-card:not(.nested-card)');
    return topLevelCard.length > 0 ? topLevelCard : null;
  }

  /**
   * 删除嵌套卡片（只处理视图，不处理数据）
   * @param parentCard 父级卡片
   * @param nestedCard 嵌套卡片
   */
  private deleteNestedCardValue(parentCard: JQuery<HTMLElement>, nestedCard: JQuery<HTMLElement>): void {
    // 从DOM中移除嵌套卡片
    nestedCard.remove();

    // 同步视图数据
    this.syncCardViewToJsonInput(parentCard);

    // 触发变更事件，让controller处理业务逻辑
    const topLevelCard = this.findTopLevelCard(parentCard);
    if (topLevelCard) {
      topLevelCard.trigger('nested-card:changed');
    }
  }

  /**
   * 为对象卡片添加新的键值对（统一处理顶级和嵌套对象卡片）
   * @param card 对象卡片（顶级或嵌套）
   * @param dataType 新键值对的数据类型
   * @param showTypeDialogCallback 显示类型选择对话框的回调函数
   */
  private addObjectKey(
    card: JQuery<HTMLElement>,
    newDataType: VariableDataType,
    showTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>,
  ): void {
    const defaultValue = VariableManagerUtil.getDefaultValueForType(newDataType);
    const isNestedCard = card.hasClass('nested-card');

    // 获取现有键名
    const existingKeys = new Set<string>();

    if (isNestedCard) {
      // 嵌套卡片：从子卡片中获取现有键名
      card.find('.nested-cards-container .nested-card').each((_, element) => {
        const key = $(element).find('.nested-card-key-input').val() as string;
        if (key) {
          existingKeys.add(key);
        }
      });
    } else {
      // 顶级卡片：从变量值中获取现有键名
      const currentVariable = this.getVariableFromCard(card);
      if (!currentVariable) {
        console.error('找不到当前变量');
        return;
      }
      if (currentVariable.value && typeof currentVariable.value === 'object') {
        Object.keys(currentVariable.value).forEach(key => existingKeys.add(key));
      }
    }

    const newKey = VariableManagerUtil.generateUniqueKey(existingKeys);

    if (isNestedCard) {
      // 嵌套卡片处理逻辑
      const newVariable: VariableItem = {
        name: newKey,
        dataType: newDataType,
        value: defaultValue,
        id: '', // 嵌套卡片不使用id
      };

      // 创建新的嵌套卡片
      const newNestedCard = this.createCard(newVariable, true, showTypeDialogCallback);

      // 添加到容器中的最上方
      const $container = card.find('.nested-cards-container');
      $container.prepend(newNestedCard);

      // 绑定保存事件
      newNestedCard.find('.variable-action-btn.object-save-btn').on('click', () => {
        this.saveNestedCardValue(card);
      });

      // 绑定删除事件
      newNestedCard.find('.variable-action-btn.object-delete-btn').on('click', () => {
        this.deleteNestedCardValue(card, newNestedCard);
      });

      // 自动聚焦到键名输入框
      newNestedCard.find('.nested-card-key-input').focus().select();

      // 同步视图数据，但不触发自动保存
      this.syncCardViewToJsonInput(card);
    } else {
      // 顶级卡片处理逻辑：只处理视图，不处理数据
      const newVariable: VariableItem = {
        name: newKey,
        dataType: newDataType,
        value: defaultValue,
        id: '', // 嵌套卡片不使用id
      };

      const newNestedCard = this.createCard(newVariable, true, showTypeDialogCallback);
      const $container = card.find('.nested-cards-container');
      $container.prepend(newNestedCard);

      // 绑定保存事件
      newNestedCard.find('.variable-action-btn.object-save-btn').on('click', () => {
        this.saveNestedCardValue(card);
      });

      // 绑定删除事件
      newNestedCard.find('.variable-action-btn.object-delete-btn').on('click', () => {
        this.deleteNestedCardValue(card, newNestedCard);
      });

      // 自动聚焦到键名输入框
      newNestedCard.find('.nested-card-key-input').focus().select();

      // 只同步视图数据，不触发自动保存
      this.syncCardViewToJsonInput(card);
    }
  }

  /**
   * 设置对象卡片（统一处理嵌套和非嵌套对象卡片）
   * @param card 对象卡片
   * @param variable 变量对象
   * @param isNested 是否为嵌套卡片
   * @param showTypeDialogCallback 显示类型选择对话框的回调函数
   */
  private setupObjectCard(
    card: JQuery<HTMLElement>,
    variable: VariableItem,
    isNested?: boolean,
    showTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>,
  ): void {
    if (isNested) {
      // 嵌套对象卡片：简化的布局，只有卡片视图
      card.find('.variable-card-content').append(`
        <div class="nested-object-container">
          <div class="nested-cards-container"></div>
        </div>
      `);

      // 为嵌套卡片添加添加键值对按钮
      card.find('.variable-actions .object-save-btn').before(`
        <button class="variable-action-btn add-nested-key-btn" title="添加键值对">
          <i class="fa-regular fa-plus"></i>
        </button>
      `);

      // 嵌套卡片的添加键值对按钮事件
      card.find('.add-nested-key-btn').on('click', async () => {
        const dialogCallback = showTypeDialogCallback || this.defaultTypeDialogCallback;
        if (dialogCallback) {
          await dialogCallback((dataType: VariableDataType) => {
            const $card = card.closest('.nested-card');
            $card.trigger('object:addKey', [dataType]);
          });
        } else {
          console.error('添加卡片出错');
          toastr.error('添加卡片出错');
        }
      });
    } else {
      // 非嵌套对象卡片：包含JSON视图和卡片视图切换功能
      card.find('.variable-card-content').append(`
        <textarea class="json-input variable-content-input" placeholder="输入JSON对象" style="display: none;"></textarea>
            <div class="object-card-view">
              <div class="nested-cards-container"></div>
            </div>
          </div>
      `);

      // 为非嵌套卡片添加切换视图和添加键值对按钮
      card.find('.variable-actions .save-btn').before(`
        <button class="variable-action-btn toggle-view-btn" title="切换到JSON视图">
          <i class="fa-regular fa-list"></i>
        </button>
        <button class="variable-action-btn add-key-btn" title="添加键值对">
          <i class="fa-regular fa-plus"></i>
        </button>
      `);

      // 首先填充JSON输入框的内容并设置初始视图模式为卡片视图（与DOM初始状态保持一致）
      card.find('.json-input').val(JSON.stringify(variable.value, null, 2)).end().attr('data-view-mode', 'card');

      // 为JSON输入框添加变更监听，实现实时同步
      card.find('.json-input').on('blur change', () => {
        const currentMode = card.attr('data-view-mode') || 'card';
        // 只有在卡片视图模式下才需要实时同步
        if (currentMode === 'card') {
          this.syncJsonInputToCardView(card, showTypeDialogCallback);
        }
      });

      // 添加切换视图按钮事件
      card.find('.toggle-view-btn').on('click', () => {
        const $card = card;
        const currentMode = $card.attr('data-view-mode') || 'card';

        const newMode = currentMode === 'json' ? 'card' : 'json';
        $card.attr('data-view-mode', newMode);

        // 更新按钮图标
        if (newMode === 'json') {
          $card
            .find('.toggle-view-btn i')
            .removeClass('fa-list')
            .addClass('fa-eye')
            .end()
            .attr('title', '切换到卡片视图');

          // 显示JSON输入框，隐藏卡片视图
          $card.find('.json-input').show().end().find('.object-card-view').hide();

          // 同步卡片视图到JSON输入框
          this.syncCardViewToJsonInput($card);
        } else {
          $card
            .find('.toggle-view-btn i')
            .removeClass('fa-eye')
            .addClass('fa-list')
            .end()
            .attr('title', '切换到JSON视图');

          // 隐藏JSON输入框，显示卡片视图
          $card.find('.json-input').hide().end().find('.object-card-view').show();

          // 同步JSON输入框到卡片视图
          this.syncJsonInputToCardView($card, showTypeDialogCallback);
        }
      });

      // 非嵌套卡片的添加键值对按钮事件
      card.find('.add-key-btn').on('click', async () => {
        const dialogCallback = showTypeDialogCallback || this.defaultTypeDialogCallback;
        if (dialogCallback) {
          await dialogCallback((dataType: VariableDataType) => {
            const $card = card.closest('.variable-card');
            $card.trigger('object:addKey', [dataType]);
          });
        } else {
          console.error('未提供类型选择对话框回调函数');
          toastr.error('未提供类型选择对话框回调函数');
        }
      });
    }

    // 监听添加键值对事件（嵌套和非嵌套都需要）
    card.on('object:addKey', (event, dataType: VariableDataType) => {
      event.stopPropagation();
      this.addObjectKey(card, dataType, showTypeDialogCallback);
    });

    // 渲染初始卡片视图（嵌套和非嵌套都需要）
    try {
      this.renderObjectCardView(card, variable, showTypeDialogCallback);
    } catch (e) {
      console.error('渲染初始对象卡片视图错误:', e);
      toastr.error('渲染对象卡片视图错误');
    }
  }

  /**
   * 同步卡片视图到JSON输入框
   * @param card 对象卡片
   */
  private syncCardViewToJsonInput(card: JQuery<HTMLElement>): void {
    if (card.hasClass('nested-card')) {
      return;
    }

    const objectValue = this.buildObjectFromNestedCards(card);
    card.find('.json-input').val(JSON.stringify(objectValue, null, 2));
  }

  /**
   * 同步JSON输入框到卡片视图
   * @param card 对象卡片
   * @param showTypeDialogCallback 显示类型选择对话框的回调函数
   */
  private syncJsonInputToCardView(
    card: JQuery<HTMLElement>,
    showTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>,
  ): void {
    if (card.hasClass('nested-card')) {
      return;
    }

    try {
      const jsonValue = card.find('.json-input').val() as string;
      if (jsonValue && jsonValue.trim()) {
        const objectValue = JSON.parse(jsonValue);
        const tempVariable: VariableItem = {
          id: card.attr('data-variable-id') || '',
          name: card.find('.variable-title').val() as string,
          dataType: 'object',
          value: objectValue,
        };
        this.renderObjectCardView(card, tempVariable, showTypeDialogCallback);
      }
    } catch (parseError) {
      console.error('JSON解析错误:', parseError);
      toastr.error('JSON格式错误，无法同步到卡片视图');
    }
  }
}
