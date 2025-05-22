import { VariableDataType } from '@/component/variable_manager/types';
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
  /**
   * 从值推断变量数据类型
   * @param value 要推断类型的值
   * @returns 推断出的变量数据类型
   */
  public inferDataType(value: any): VariableDataType {
    if (Array.isArray(value)) {
      return 'array';
    } else if (typeof value === 'boolean') {
      return 'boolean';
    } else if (typeof value === 'number') {
      return 'number';
    } else if (typeof value === 'object' && value !== null) {
      return 'object';
    }
    return 'string';
  }

  /**
   * 设置变量卡片的数据属性
   * @param card 变量卡片jQuery对象
   * @param name 变量名称
   * @param value 变量值
   * @returns 设置了属性的变量卡片jQuery对象
   */
  public setCardDataAttributes(card: JQuery<HTMLElement>, name: string, value: any): JQuery<HTMLElement> {
    card.attr('data-name', name);
    card.attr('data-original-name', name);
    card.attr('data-value', JSON.stringify(value));
    return card;
  }

  /**
   * 创建变量卡片
   * @param type 变量数据类型
   * @param name 变量名称
   * @param value 变量值
   * @param showTypeDialogCallback 显示类型选择对话框的回调函数（仅用于对象类型）
   * @returns 变量卡片jQuery对象
   */
  public createCard(
    type: VariableDataType,
    name: string,
    value: any,
    showTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>,
  ): JQuery<HTMLElement> {
    let card: JQuery<HTMLElement>;
    switch (type) {
      case 'array':
        card = this.createArrayCard(name, value as any[]);
        break;
      case 'boolean':
        card = this.createBooleanCard(name, value as boolean);
        break;
      case 'number':
        card = this.createNumberCard(name, value as number);
        break;
      case 'object':
        card = this.createObjectCard(name, value as object, showTypeDialogCallback);
        break;
      case 'string':
        card = this.createStringCard(name, String(value));
        break;
      default:
        // 默认返回字符串变量卡片（包括处理null和undefined值）
        card = this.createStringCard(name, String(value));
    }

    return this.setCardDataAttributes(card, name, value);
  }

  /**
   * 创建基础卡片模板
   * @param config 卡片配置
   * @returns 卡片jQuery对象
   */
  private createBaseCard(config: CardConfig): JQuery<HTMLElement> {
    const extraActions = config.extraActions || '';
    const card = $(`
      <div class="variable-card" data-type="${config.type}" data-name="${config.name}">
        <div class="variable-card-header">
          <div class="variable-title-container">
            <i class="${config.icon}"></i>
            <input type="text" class="variable-title" value="${config.name}" placeholder="变量名称">
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
          ${config.contentHtml}
        </div>
      </div>
    `);

    if (config.setupCallback) {
      config.setupCallback(card);
    }

    return card;
  }

  /**
   * 创建数组变量卡片
   * @param name 变量名称
   * @param items 数组项
   * @returns 数组变量卡片jQuery对象
   */
  private createArrayCard(name: string, items: any[]): JQuery<HTMLElement> {
    const self = this; // 保存this引用，以便在回调中使用

    const card = this.createBaseCard({
      type: 'array',
      name: name,
      icon: 'fa-solid fa-list',
      contentHtml: `
        <div class="list-items-container">
          ${this.generateArrayItems(items)}
        </div>
        <button class="add-list-item"><i class="fa-solid fa-plus"></i> 添加项目</button>
        <div class="array-item-type-buttons" style="display: none;">
          <button class="add-type-btn add-text-item"><i class="fa-solid fa-font"></i> 文本</button>
          <button class="add-type-btn add-number-item"><i class="fa-solid fa-hashtag"></i> 数字</button>
          <button class="add-type-btn add-boolean-item"><i class="fa-solid fa-toggle-on"></i> 布尔值</button>
          <button class="add-type-btn add-object-item"><i class="fa-solid fa-code"></i> 对象</button>
          <button class="add-type-btn add-array-item"><i class="fa-solid fa-list"></i> 数组</button>
          <button class="add-type-btn cancel-add-item"><i class="fa-solid fa-times"></i> 取消</button>
        </div>
      `,
      setupCallback: cardElement => {
        // 为列表添加拖拽功能
        const listContainer = cardElement.find('.list-items-container');
        listContainer.sortable({
          delay: getSortableDelay(),
          handle: '.drag-handle',
          // 此处只记录排序事件，实际保存由保存按钮触发
        });

        // 处理嵌套对象容器
        cardElement.find('.nested-object-container').each(function (index) {
          const $container = $(this);
          const objectValue = JSON.parse($container.attr('data-value') || '{}');
          const type = self.inferDataType(objectValue);
          const itemName = `[${index}]`;
          // 创建嵌套卡片
          const nestedCard = self.createCard(type, itemName, objectValue);

          // 调整嵌套卡片外观
          nestedCard.addClass('array-nested-card');

          // 不要完全隐藏标题，而是保留显示索引
          nestedCard.find('.variable-title-container').addClass('array-item-title');
          // 对每个子对象的第一个title添加disabled
          nestedCard.find('.variable-title:first').prop('readonly', true);

          // 隐藏操作按钮
          nestedCard.find('.variable-actions').hide();

          // 添加全宽样式
          nestedCard.css({
            width: '100%',
            margin: '5px 0',
          });

          // 将嵌套卡片添加到容器
          $container
            .css({
              width: '100%',
              padding: '0',
            })
            .append(nestedCard);
        });

        // 添加项目按钮点击事件
        cardElement.find('.add-list-item').on('click', function () {
          cardElement.find('.array-item-type-buttons').show();
          $(this).hide();
        });

        // 取消添加按钮点击事件
        cardElement.find('.cancel-add-item').on('click', function () {
          cardElement.find('.array-item-type-buttons').hide();
          cardElement.find('.add-list-item').show();
        });

        // 添加文本项按钮点击事件
        cardElement.find('.add-text-item').on('click', function () {
          const newItem = $(`
            <div class="list-item">
              <span class="drag-handle">☰</span>
              <textarea class="variable-content-input"></textarea>
              <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
            </div>
          `);
          cardElement.find('.list-items-container').append(newItem);
          cardElement.find('.array-item-type-buttons').hide();
          cardElement.find('.add-list-item').show();
        });

        // 添加数字项按钮点击事件
        cardElement.find('.add-number-item').on('click', function () {
          const newItem = $(`
            <div class="list-item">
              <span class="drag-handle">☰</span>
              <input type="number" class="variable-content-input" value="0" step="any">
              <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
            </div>
          `);
          cardElement.find('.list-items-container').append(newItem);
          cardElement.find('.array-item-type-buttons').hide();
          cardElement.find('.add-list-item').show();
        });

        // 添加布尔项按钮点击事件
        cardElement.find('.add-boolean-item').on('click', function () {
          const booleanItem = $(`
            <div class="list-item">
              <span class="drag-handle">☰</span>
              <div class="boolean-input-container">
                <div class="boolean-buttons-container">
                  <button class="boolean-btn active" data-value="true">True</button>
                  <button class="boolean-btn" data-value="false">False</button>
                </div>
              </div>
              <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
            </div>
          `);

          booleanItem.find('.boolean-btn').on('click', function () {
            booleanItem.find('.boolean-btn').removeClass('active');
            $(this).addClass('active');
          });

          cardElement.find('.list-items-container').append(booleanItem);
          cardElement.find('.array-item-type-buttons').hide();
          cardElement.find('.add-list-item').show();
        });

        // 添加对象项按钮点击事件
        cardElement.find('.add-object-item').on('click', function () {
          // 获取当前项目数量作为索引
          const itemCount = cardElement.find('.list-item').length;
          const itemName = `[${itemCount}]`;
          const objectItem = $(`
            <div class="list-item list-item-object">
              <span class="drag-handle">☰</span>
              <div class="nested-object-container" data-value='{}'></div>
              <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
            </div>
          `);

          const $container = objectItem.find('.nested-object-container');
          const nestedCard = self.createCard('object', itemName, {});

          // 调整嵌套卡片外观
          nestedCard.addClass('array-nested-card');

          // 不要完全隐藏标题，而是保留显示索引
          nestedCard.find('.variable-title-container').addClass('array-item-title');
          nestedCard.find('.variable-title:first').prop('readonly', true);

          // 隐藏操作按钮
          nestedCard.find('.variable-actions').hide();

          // 添加全宽样式
          nestedCard.css({
            width: '100%',
            margin: '5px 0',
          });

          $container
            .css({
              width: '100%',
              padding: '0',
            })
            .append(nestedCard);

          cardElement.find('.list-items-container').append(objectItem);
          cardElement.find('.array-item-type-buttons').hide();
          cardElement.find('.add-list-item').show();
        });

        // 添加数组项按钮点击事件
        cardElement.find('.add-array-item').on('click', function () {
          // 获取当前项目数量作为索引
          const itemCount = cardElement.find('.list-item').length;
          const itemName = `[${itemCount}]`;
          const arrayItem = $(`
            <div class="list-item list-item-object">
              <span class="drag-handle">☰</span>
              <div class="nested-object-container" data-value='[]'></div>
              <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
            </div>
          `);

          const $container = arrayItem.find('.nested-object-container');
          const nestedCard = self.createCard('array', itemName, []);

          // 调整嵌套卡片外观
          nestedCard.addClass('array-nested-card');

          nestedCard.find('.variable-title-container').addClass('array-item-title');
          nestedCard.find('.variable-title:first').prop('readonly', true);
          // 隐藏操作按钮
          nestedCard.find('.variable-actions').hide();

          // 添加全宽样式
          nestedCard.css({
            width: '100%',
            margin: '5px 0',
          });

          $container
            .css({
              width: '100%',
              padding: '0',
            })
            .append(nestedCard);

          cardElement.find('.list-items-container').append(arrayItem);
          cardElement.find('.array-item-type-buttons').hide();
          cardElement.find('.add-list-item').show();
        });

        // 删除项目按钮点击事件
        cardElement.on('click', '.list-item-delete', function () {
          $(this).closest('.list-item').remove();
        });
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
   * 创建布尔变量卡片
   * @param name 变量名称
   * @param value 布尔值
   * @returns 布尔变量卡片jQuery对象
   */
  private createBooleanCard(name: string, value: boolean): JQuery<HTMLElement> {
    const card = this.createBaseCard({
      type: 'boolean',
      name: name,
      icon: 'fa-regular fa-toggle-on',
      contentHtml: `
        <div class="boolean-input-container">
          <div class="boolean-buttons-container">
            <button class="boolean-btn ${value ? 'active' : ''}" data-value="true">True</button>
            <button class="boolean-btn ${!value ? 'active' : ''}" data-value="false">False</button>
          </div>
        </div>
      `,
      setupCallback: cardElement => {
        cardElement.find('.boolean-btn').on('click', function () {
          cardElement.find('.boolean-btn').removeClass('active');
          $(this).addClass('active');
        });
      },
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
    return this.createBaseCard({
      type: 'number',
      name: name,
      icon: 'fa-solid fa-hashtag',
      contentHtml: `<input type="number" class="number-input variable-content-input" value="${value}" step="any">`,
    });
  }

  /**
   * 创建对象变量卡片
   * @param name 变量名称
   * @param value 对象值
   * @param showTypeDialogCallback 显示类型选择对话框的回调函数
   * @returns 对象变量卡片jQuery对象
   */
  private createObjectCard(
    name: string,
    value: object,
    showTypeDialogCallback?: (callback: (dataType: VariableDataType) => void) => Promise<void>,
  ): JQuery<HTMLElement> {
    const jsonString = JSON.stringify(value, null, 2);
    const self = this; // 保存this引用，以便在回调中使用

    const card = this.createBaseCard({
      type: 'object',
      name: name,
      icon: 'fa-regular fa-code',
      extraActions: `
        <button class="variable-action-btn toggle-view-btn" title="切换到JSON视图">
          <i class="fa-regular fa-list"></i>
        </button>
        <button class="variable-action-btn add-key-btn" title="添加键值对">
          <i class="fa-regular fa-plus"></i>
        </button>
      `,
      contentHtml: `
        <textarea class="json-input variable-content-input" placeholder="输入JSON对象" style="display: none;">${jsonString}</textarea>
        <div class="object-card-view">
          <div class="nested-cards-container"></div>
        </div>
      `,
      setupCallback: cardElement => {
        // 设置数据视图模式属性
        cardElement.attr('data-view-mode', 'card');

        // 监听JSON输入框变更，更新卡片视图
        cardElement.find('.json-input').on('change', () => {
          try {
            const jsonValue = JSON.parse(cardElement.find('.json-input').val() as string);

            // 如果当前是卡片视图模式，需要更新卡片视图
            if (cardElement.attr('data-view-mode') === 'card') {
              self.renderObjectCardView(cardElement, jsonValue);
            }

            // 更新数据属性
            cardElement.attr('data-value', JSON.stringify(jsonValue));
          } catch (e) {
            console.error('JSON解析错误:', e);
          }
        });

        // 添加切换视图按钮事件
        cardElement.find('.toggle-view-btn').on('click', () => {
          const currentMode = cardElement.attr('data-view-mode') || 'json';

          // 切换模式
          const newMode = currentMode === 'json' ? 'card' : 'json';
          cardElement.attr('data-view-mode', newMode);

          // 从卡片的data-value属性获取最新数据
          let latestData;
          try {
            latestData = JSON.parse(cardElement.attr('data-value') || '{}');
          } catch (e) {
            console.error('获取最新数据失败:', e);
            latestData = {};
          }

          // 更新按钮图标
          const $icon = cardElement.find('.toggle-view-btn i');
          if (newMode === 'json') {
            $icon.removeClass('fa-list').addClass('fa-eye');
            cardElement.find('.toggle-view-btn').attr('title', '切换到卡片视图');

            // 显示JSON输入框，隐藏卡片视图
            cardElement.find('.json-input').show();
            cardElement.find('.object-card-view').hide();

            // 更新JSON输入框内容为最新数据
            cardElement.find('.json-input').val(JSON.stringify(latestData, null, 2));
          } else {
            $icon.removeClass('fa-eye').addClass('fa-list');
            cardElement.find('.toggle-view-btn').attr('title', '切换到JSON视图');

            // 隐藏JSON输入框，显示卡片视图
            cardElement.find('.json-input').hide();
            cardElement.find('.object-card-view').show();

            try {
              // 渲染卡片视图
              self.renderObjectCardView(cardElement, latestData);
            } catch (e) {
              console.error('渲染卡片视图错误:', e);

              // 解析错误时回退到JSON视图
              cardElement.attr('data-view-mode', 'json');
              cardElement.find('.json-input').show();
              cardElement.find('.object-card-view').hide();
              $icon.removeClass('fa-list').addClass('fa-eye');
              cardElement.find('.toggle-view-btn').attr('title', '切换到卡片视图');
            }
          }
        });

        // 添加键值对按钮事件
        cardElement.find('.add-key-btn').on('click', function () {
          if (showTypeDialogCallback) {
            // 使用回调函数显示类型选择对话框
            showTypeDialogCallback(async (dataType: VariableDataType) => {
              const $card = $(this).closest('.variable-card');
              $card.trigger('object:addKey', [dataType]);
            });
          } else {
            console.log('未提供类型选择对话框回调函数');
          }
        });

        // 在返回卡片之前渲染初始卡片视图
        try {
          const jsonValue = JSON.parse(jsonString);
          self.renderObjectCardView(cardElement, jsonValue);
        } catch (e) {
          console.error('JSON解析错误:', e);
          // 解析错误时回退到JSON视图
          cardElement.attr('data-view-mode', 'json');
          cardElement.find('.json-input').show();
          cardElement.find('.object-card-view').hide();
          cardElement.find('.toggle-view-btn i').removeClass('fa-list').addClass('fa-eye');
          cardElement.find('.toggle-view-btn').attr('title', '切换到卡片视图');
        }
      },
    });

    return card;
  }

  /**
   * 渲染对象卡片的卡片视图
   * @param card 对象卡片jQuery对象
   * @param value 对象值
   */
  private renderObjectCardView(card: JQuery<HTMLElement>, value: Record<string, any>): void {
    const $container = card.find('.nested-cards-container');
    $container.empty();

    // 遍历对象的所有键值对，为每个键值对创建卡片
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const propertyValue = value[key];
        const type = this.inferDataType(propertyValue);

        // 创建嵌套卡片的容器
        const $nestedCardWrapper = $(`
          <div class="nested-card-wrapper" data-key="${key}">
            <div class="nested-card-content"></div>
          </div>
        `);

        // 创建对应类型的卡片
        const nestedCard = this.createCard(type, key, propertyValue);

        // 简化嵌套卡片的外观
        const titleInput = nestedCard.find('.variable-title-container input');
        titleInput.attr('title', '点击编辑键名');
        titleInput.addClass('nested-card-key-input');

        // 把嵌套卡片中的save-btn和delete-btn分别改为object-save-btn和object-delete-btn
        nestedCard.find('.variable-action-btn.save-btn').removeClass('save-btn').addClass('object-save-btn');
        nestedCard.find('.variable-action-btn.delete-btn').removeClass('delete-btn').addClass('object-delete-btn');

        // 移除直接绑定的事件，让事件可以冒泡到控制器
        // 将以前需要的数据作为属性添加到按钮元素上，以便控制器可以读取
        const objectDeleteBtn = nestedCard.find('.variable-action-btn.object-delete-btn');
        objectDeleteBtn.attr('data-nested-key', $nestedCardWrapper.attr('data-key') || '');
        objectDeleteBtn.attr('data-parent-card-id', card.attr('id') || '');

        // 将卡片添加到容器中
        $nestedCardWrapper.find('.nested-card-content').append(nestedCard);
        $container.append($nestedCardWrapper);

        // 添加键名点击编辑功能
        titleInput.on('input', function () {
          const $input = $(this);
          const oldKey = $nestedCardWrapper.attr('data-key') || '';
          const newKey = $input.val() as string;

          if (newKey && newKey !== oldKey && oldKey) {
            // 更新键名
            $nestedCardWrapper.attr('data-key', newKey);

            // 获取对象值并更新键名
            const objValue = JSON.parse(card.attr('data-value') || '{}') as Record<string, any>;
            if (objValue[oldKey] !== undefined) {
              objValue[newKey] = objValue[oldKey];
              delete objValue[oldKey];

              // 更新对象卡片的值
              const jsonString = JSON.stringify(objValue, null, 2);
              card.find('.json-input').val(jsonString);
              card.attr('data-value', JSON.stringify(objValue));
            }
          }
        });

        // 添加保存按钮点击事件 - 使用一个特殊的事件名称避免级联触发
        nestedCard.find('.variable-action-btn.object-save-btn').on('click', () => {
          // 获取当前嵌套卡片的键和值
          const currentKey = $nestedCardWrapper.attr('data-key') || '';

          // 根据卡片类型获取最新值
          let nestedValue;
          const nestedCardType = nestedCard.attr('data-type');

          switch (nestedCardType) {
            case 'string':
              nestedValue = nestedCard.find('.string-input').val();
              break;
            case 'number':
              nestedValue = parseFloat(nestedCard.find('.number-input').val() as string);
              break;
            case 'boolean':
              nestedValue = nestedCard.find('.boolean-btn.active').attr('data-value') === 'true';
              break;
            case 'array':
              nestedValue = [];
              nestedCard.find('.list-item .variable-content-input').each(function () {
                let elementValue = $(this).val() as string;

                // 尝试解析可能的JSON字符串
                if (typeof elementValue === 'string') {
                  elementValue = elementValue.trim();
                  // 检查是否为可能的对象或数组格式
                  if (
                    (elementValue.startsWith('{') && elementValue.endsWith('}')) ||
                    (elementValue.startsWith('[') && elementValue.endsWith(']'))
                  ) {
                    try {
                      // 尝试解析JSON字符串
                      const parsedValue = JSON.parse(elementValue);
                      nestedValue.push(parsedValue);
                      return; // 提前返回，避免重复添加
                    } catch (error) {
                      console.log('JSON字符串解析失败，保留原始字符串:', elementValue);
                    }
                  }
                }

                // 如果不是JSON或解析失败，保留原始值
                nestedValue.push(elementValue);
              });
              break;
            case 'object':
              nestedValue = JSON.parse(nestedCard.attr('data-value') || '{}');
              break;
            default:
              nestedValue = nestedCard.find('.variable-content-input').val();
          }

          // 更新父对象中对应键的值
          const parentObjValue = JSON.parse(card.attr('data-value') || '{}') as Record<string, any>;
          parentObjValue[currentKey] = nestedValue;

          // 更新父对象卡片的值
          const updatedJsonString = JSON.stringify(parentObjValue, null, 2);
          card.find('.json-input').val(updatedJsonString);
          card.attr('data-value', JSON.stringify(parentObjValue));

          // 更新嵌套卡片的值属性
          nestedCard.attr('data-value', JSON.stringify(nestedValue));

          card.trigger('save:fromNestedCard');

          if (!card.data('saving')) {
            card.data('saving', true);
            try {
              const topCard = card.closest('.variable-card');
              topCard.find('> .variable-card-header .object-save-btn').trigger('click');
            } finally {
              setTimeout(() => {
                card.data('saving', false);
              }, 100);
            }
          }
        });
      }
    }
  }

  /**
   * 创建字符串变量卡片
   * @param name 变量名称
   * @param value 字符串值
   * @returns 字符串变量卡片jQuery对象
   */
  private createStringCard(name: string, value: string): JQuery<HTMLElement> {
    return this.createBaseCard({
      type: 'string',
      name: name,
      icon: 'fa-solid fa-font',
      contentHtml: `<textarea class="string-input variable-content-input" placeholder="输入字符串值">${value}</textarea>`,
    });
  }

  /**
   * 从数组卡片中提取数组值
   * @param card 数组卡片jQuery对象
   * @returns 提取的数组值
   */
  public extractArrayValue(card: JQuery<HTMLElement>): any[] {
    const arrayValue: any[] = [];
    const self = this;

    card.find('.list-item').each(function () {
      const $item = $(this);

      if ($item.hasClass('list-item-object')) {
        // 处理对象或数组类型项
        const $nestedCard = $item.find('.array-nested-card');
        if ($nestedCard.length > 0) {
          const dataType = $nestedCard.attr('data-type');
          let itemValue;

          switch (dataType) {
            case 'object':
              itemValue = JSON.parse($nestedCard.attr('data-value') || '{}');
              break;
            case 'array': {
              // 递归提取嵌套数组的值
              itemValue = self.extractArrayValue($nestedCard);
              break;
            }
            default:
              itemValue = {};
          }
          arrayValue.push(itemValue);
        }
      } else {
        // 处理基本类型项
        const $input = $item.find('.variable-content-input');
        if ($input.length > 0) {
          if ($input.is('input[type="number"]')) {
            // 处理数字类型
            arrayValue.push(parseFloat($input.val() as string));
          } else if ($item.find('.boolean-buttons-container').length > 0) {
            // 处理布尔类型
            const isTrue = $item.find('.boolean-btn.active').attr('data-value') === 'true';
            arrayValue.push(isTrue);
          } else {
            // 处理字符串类型
            arrayValue.push($input.val());
          }
        }
      }
    });

    return arrayValue;
  }
}
