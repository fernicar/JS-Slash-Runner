import { getSortableDelay } from '@sillytavern/scripts/utils';

import { VariableDataType, VariableItem, VariableType } from '@/component/script_repository/variable_manager/types';
import { VariableCardFactory } from '@/component/script_repository/variable_manager/variable_card';
import { POPUP_TYPE, callGenericPopup } from '@sillytavern/scripts/popup';
import { IDomUpdater } from './variable_sync';

/**
 * 控制器接口，避免循环依赖
 */
export interface IController {
  cleanup(): void;
}

/**
 * 变量视图类，负责UI渲染和交互
 */
export class VariableView implements IDomUpdater {
  /**
   * 最小浮窗宽度（像素）
   */
  private static readonly MIN_DIALOG_WIDTH = 350;

  /**
   * 最小浮窗高度（像素）
   */
  private static readonly MIN_DIALOG_HEIGHT = 250;

  /**
   * UI容器
   */
  private container: JQuery<HTMLElement>;

  /**
   * 变量卡片
   */
  private cardFactory: VariableCardFactory;

  /**
   * 浮窗元素
   */
  private dialog: JQuery<HTMLElement> | null = null;

  /**
   * 控制器引用
   */
  private controller: IController | null = null;

  /**
   * 构造函数
   * @param container 变量管理器容器
   */
  constructor(container: JQuery<HTMLElement>) {
    this.container = container;
    this.cardFactory = new VariableCardFactory();
  }

  /**
   * 设置控制器引用
   * @param controller 变量控制器
   */
  public setController(controller: IController): void {
    this.controller = controller;
  }

  /**
   * 初始化UI
   */
  public initUI(): void {
    console.log('[VariableView] 初始化UI');

    // 初始化标签页
    this.container.find('#global-tab').addClass('active');
    this.container.find('#global-content').addClass('active');

    // 为每个标签页内容区域创建变量列表元素
    const tabContentIds = ['global-content', 'character-content', 'chat-content', 'message-content'];
    tabContentIds.forEach(contentId => {
      const $content = this.container.find(`#${contentId}`);
      // 检查是否已存在变量列表
      if ($content.find('.variable-list').length === 0) {
        console.log(`[VariableView] 为 #${contentId} 创建变量列表元素`);
        const $variableList = $('<div class="variable-list"></div>');
        $content.append($variableList);
      }
    });

    // 初始化可排序功能
    this.initSortable();

    console.log('[VariableView] UI初始化完成');
  }

  /**
   * 初始化可排序功能
   */
  private initSortable(): void {
    this.container.find('.list-items-container').sortable({
      delay: getSortableDelay(),
      handle: '.drag-handle',
      // stop回调将由Controller处理
      stop: function (event, ui) {
        // 获取包含排序项的列表容器
        const listContainer = $(ui.item).closest('.list-items-container');

        // 获取变量卡片元素
        const card = listContainer.closest('.variable-card');

        // 获取所有排序后的列表项值
        const items: string[] = [];
        listContainer.find('.variable-content-input').each(function () {
          items.push($(this).val() as string);
        });

        // 使用lodash进行数组排序和处理
        // 注意：这里我们使用lodash的原生方法而不是重新排序，因为用户手动排序的顺序应该被保留
        // 但我们可以使用lodash处理一些特殊情况，比如去除重复值
        const processedItems = _.uniqBy(items, item => item.trim().toLowerCase());

        // 如果处理后的数组与原数组不同（比如有重复值被移除），则更新UI
        if (!_.isEqual(items, processedItems)) {
          // 清空列表容器并重建项目
          listContainer.empty();
          processedItems.forEach(item => {
            const itemHtml = `
              <div class="list-item">
                <span class="drag-handle">☰</span>
                <textarea class="variable-content-input">${item}</textarea>
                <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
              </div>
            `;
            listContainer.append(itemHtml);
          });
        }

        // 触发自定义事件，通知Controller处理排序修改
        listContainer.trigger('sortupdate');
      },
    });
  }

  /**
   * 设置活动标签页
   * @param type 要激活的变量类型
   */
  public setActiveTab(type: VariableType): void {
    console.log(`[VariableView] 设置活动标签页为: ${type}`);
    // 移除所有标签项和内容区域的 active 类
    this.container.find('.tab-item').removeClass('active');
    this.container.find('.tab-content').removeClass('active');

    // 为目标标签项和内容区域添加 active 类
    this.container.find(`#${type}-tab`).addClass('active');
    this.container.find(`#${type}-content`).addClass('active');
  }

  /**
   * 刷新变量卡片
   * @param type 变量类型
   * @param variables 过滤后的变量列表
   * @param totalCount 总变量数量
   */
  public refreshVariableCards(type: VariableType, variables: VariableItem[], totalCount: number): void {
    console.log(`[VariableView] 开始刷新${type}变量卡片，显示${variables.length}/${totalCount}个变量`);

    // 更新UI元素中的类型标签
    this.container.find('.variable-type-label').text(`${type}变量`);

    // 获取活动标签页的内容区域
    const activeContent = this.container.find(`#${type}-content`);

    // 获取活动标签页中的变量列表
    let $variableList = activeContent.find('.variable-list');

    // 如果找不到变量列表元素，动态创建一个
    if ($variableList.length === 0) {
      console.log(`[VariableView] 未找到${type}标签页的变量列表，动态创建一个`);
      const newVariableList = $('<div class="variable-list"></div>');
      activeContent.append(newVariableList);
      // 重新获取变量列表引用
      $variableList = activeContent.find('.variable-list');
    }

    // 创建变量名到变量对象的映射，用于快速查找
    const variableMap = new Map(variables.map(v => [v.name, v]));

    // 收集现有卡片的信息，用于判断是否需要更新或删除
    const existingCards = new Map<string, JQuery<HTMLElement>>();
    $variableList.find('.variable-card').each(function () {
      const $card = $(this);
      const cardName = $card.attr('data-name');
      if (cardName) {
        existingCards.set(cardName, $card);
      }
    });

    // 如果变量列表为空，显示"没有找到变量"提示并返回
    if (variables.length === 0) {
      return;
    }

    // 移除所有不在当前变量列表中的卡片
    existingCards.forEach(($card, cardName) => {
      if (!variableMap.has(cardName)) {
        // 检查是否是正在进行重命名的卡片（已通过data-original-name更新但data-name还未更新）
        const originalName = $card.attr('data-original-name');
        if (originalName !== cardName) {
          // 这可能是正在进行重命名的卡片，检查原始名称是否在新变量列表中
          const renamed = variables.some(v => v.name === originalName);
          if (!renamed) {
            console.log(`[VariableView] 移除不在当前列表中的卡片: ${cardName}`);
            $card.remove();
          }
        } else {
          console.log(`[VariableView] 移除不在当前列表中的卡片: ${cardName}`);
          $card.remove();
        }
      }
    });

    // 处理每个变量：更新现有卡片或创建新卡片
    variables.forEach(variable => {
      // 检查是否已有同名卡片
      if (existingCards.has(variable.name)) {
        // 更新现有卡片
        const $card = existingCards.get(variable.name)!;
      } else {
        const card = this.cardFactory.createCard(variable.type, variable.name, variable.value);

        // 确保卡片有正确的data-name属性
        card.attr('data-name', variable.name);
        // 设置原始名称属性，用于跟踪重命名
        card.attr('data-original-name', variable.name);

        $variableList.append(card);
      }
    });

    console.log(`[VariableView] 变量卡片刷新完成`);
  }

  /**
   * 创建新变量卡片
   * @param type 变量类型
   * @param dataType 数据类型
   */
  public createNewVariableCard(type: VariableType, dataType: VariableDataType): void {
    const $content = this.container.find(`#${type}-content`);
    let $variableList = $content.find('.variable-list');

    // 如果列表不存在，则创建
    if ($variableList.length === 0) {
      $variableList = $('<div class="variable-list"></div>');
      $content.append($variableList);
      // 可能需要重新初始化 sortable
      // this.initSortableForList($variableList); // 注释掉，因为 initSortable 可能处理所有列表
    }

    // 移除空状态提示
    $content.find('.empty-state').remove();

    // 创建默认值
    let defaultValue: any;
    switch (dataType) {
      case 'array':
        defaultValue = [];
        break;
      case 'boolean':
        defaultValue = false;
        break;
      case 'number':
        defaultValue = 0;
        break;
      case 'object':
        defaultValue = {};
        break;
      case 'string':
        defaultValue = '';
        break;
      case 'text':
        defaultValue = '';
        break;
      case 'list':
        defaultValue = [];
        break;
      default:
        defaultValue = '';
    }

    // 创建新卡片
    const defaultName = 'new_variable';
    const newCard = this.cardFactory.createCard(dataType, defaultName, defaultValue);
    newCard.attr('data-name', defaultName);
    newCard.attr('data-original-name', defaultName);

    $variableList.append(newCard);
    console.log(`[VariableView] 创建了新的 ${dataType} 类型变量卡片，名称为 ${defaultName}`);

    // 触发编辑模式或其他后续操作
    // this.triggerEditMode(newCard);
  }

  /**
   * 更新特定变量卡片
   * @param name 变量名称
   * @param value 变量新值
   * @returns 是否找到并更新了卡片
   */
  public updateVariableCard(name: string, value: any): boolean {
    console.log(`[VariableView] 尝试更新变量卡片: ${name} = ${JSON.stringify(value)}`);

    try {
      // 查找指定变量的卡片
      const card = this.container.find(`.variable-card[data-name="${name}"]`);
      console.log(`[VariableView] 查找卡片结果: 找到${card.length}个匹配卡片`);

      // 如果找不到卡片，尝试创建新卡片
      if (card.length === 0) {
        console.log(`[VariableView] 未找到变量卡片"${name}"，创建新卡片`);

        // 推断数据类型
        let dataType: VariableDataType = 'string';
        if (Array.isArray(value)) {
          dataType = 'array';
        } else if (typeof value === 'boolean') {
          dataType = 'boolean';
        } else if (typeof value === 'number') {
          dataType = 'number';
        } else if (typeof value === 'object' && value !== null) {
          dataType = 'object';
        }

        // 创建新卡片并添加到容器
        const activeType =
          (this.container.find('.tab-item.active').attr('id')?.replace('-tab', '') as VariableType) || 'chat';
        const newCard = this.cardFactory.createCard(dataType, name, value);

        // 确保卡片有正确的data-name属性
        newCard.attr('data-name', name);
        // 设置原始名称属性，用于跟踪重命名
        newCard.attr('data-original-name', name);

        // 获取活动标签页内容区域
        const activeContent = this.container.find(`#${activeType}-content`);

        // 获取变量列表元素
        let variableList = activeContent.find('.variable-list');

        // 如果找不到变量列表，创建一个
        if (variableList.length === 0) {
          console.log(`[VariableView] 未找到${activeType}标签页的变量列表，动态创建一个`);
          variableList = $('<div class="variable-list"></div>');
          activeContent.append(variableList);
        }
        // 添加新卡片
        variableList.append(newCard);
        console.log(`[VariableView] 已创建并添加新变量卡片: ${name}`);

        return true;
      }

      // 获取当前卡片的值
      const currentValue = card.attr('data-value');
      const newValueString = JSON.stringify(value);

      // 检查值是否发生变化
      if (currentValue === newValueString) {
        console.log(`[VariableView] 变量卡片"${name}"的值未发生变化，跳过更新`);
        return true;
      }

      console.log(`[VariableView] 变量卡片"${name}"的值已变化: ${currentValue} -> ${newValueString}`);

      // 准备显示值
      let displayValue = JSON.stringify(value);
      // 限制显示长度
      if (displayValue.length > 100) {
        displayValue = displayValue.substring(0, 100) + '...';
      }

      // 获取卡片类型
      const cardType = card.attr('data-type') as VariableDataType;
      console.log(`[VariableView] 变量卡片"${name}"的类型为: ${cardType}`);

      // 声明可能在case中使用的变量
      let listContainer;
      let jsonString;
      let inputElement;

      // 根据不同的卡片类型更新相应的输入元素
      switch (cardType) {
        case 'string':
          card.find('.string-input').val(value);
          break;
        case 'number':
          card.find('.number-input').val(value);
          break;
        case 'boolean':
          // 更新布尔按钮状态
          card.find('.boolean-btn').removeClass('active');
          card.find(`.boolean-btn[data-value="${value}"]`).addClass('active');
          break;
        case 'array':
          // 更新数组项
          listContainer = card.find('.list-items-container');
          listContainer.empty();
          if (Array.isArray(value) && value.length > 0) {
            const itemsHtml = value
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
            listContainer.html(itemsHtml);
          }
          break;
        case 'object':
          // 更新对象的JSON字符串表示
          jsonString = JSON.stringify(value, null, 2);
          card.find('.json-input').val(jsonString);
          break;
        default:
          // 尝试通用更新方法
          console.log(`[VariableView] 使用通用方法更新未知类型的变量卡片: ${cardType}`);
          inputElement = card.find('.variable-content-input');
          if (inputElement.length > 0) {
            inputElement.val(typeof value === 'object' ? JSON.stringify(value) : value);
          } else {
            console.warn(`[VariableView] 无法找到输入元素来更新变量值: ${name}`);
          }
      }

      // 更新卡片中隐藏的完整值属性
      card.attr('data-value', newValueString);

      // 添加变更动画类
      card.addClass('variable-changed');

      // 强制DOM重绘
      void card[0].offsetHeight; // 触发重排

      // 使用requestAnimationFrame确保视觉更新
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log(`[VariableView] 已强制重绘变量卡片: ${name}`);
        });
      });

      // 先移除之前可能存在的动画结束监听器，避免重复添加
      card.off('animationend.variableChanged');

      // 监听动画结束，移除动画类
      card.on('animationend.variableChanged', function () {
        $(this).removeClass('variable-changed');
        // 动画结束后解绑事件，防止内存泄漏
        $(this).off('animationend.variableChanged');
        console.log(`[VariableView] 变量卡片"${name}"动画结束，移除动画类`);
      });

      console.log(`[VariableView] 已更新变量卡片: ${name}`);
      return true;
    } catch (error) {
      console.error(`[VariableView] 更新变量卡片"${name}"失败:`, error);
      return false;
    }
  }

  /**
   * 获取变量卡片值
   * @param card 卡片元素
   * @returns 卡片中的变量值
   */
  public getVariableCardValue(card: JQuery<HTMLElement>): any {
    const dataType = card.attr('data-type') as VariableDataType;

    switch (dataType) {
      case 'array':
      case 'list': {
        const items: string[] = [];
        card.find('.list-item textarea').each(function () {
          items.push($(this).val() as string);
        });
        return items;
      }
      case 'boolean': {
        // 获取当前激活的按钮的值
        const activeBtn = card.find('.boolean-btn.active');
        return activeBtn.attr('data-value') === 'true';
      }
      case 'number': {
        return Number(card.find('.number-input').val());
      }
      case 'object': {
        try {
          return JSON.parse(card.find('.json-input').val() as string);
        } catch (error) {
          console.error('JSON解析错误:', error);
          return {};
        }
      }
      case 'string':
      case 'text': {
        return card.find('.string-input, .variable-content-input').val();
      }
      default:
        return null;
    }
  }

  /**
   * 获取变量卡片名称
   * @param card 卡片元素
   * @returns 卡片中的变量名称
   */
  public getVariableCardName(card: JQuery<HTMLElement>): string {
    return card.find('.variable-title').val() as string;
  }

  /**
   * 显示添加变量选择对话框
   * @param callback 选择后的回调函数
   */
  public async showAddVariableDialog(callback: (dataType: VariableDataType) => void): Promise<void> {
    const content = $(`
      <div>
        <h3>选择变量类型</h3>
        <div class="variable-type-options">
          <div data-type="string"><i class="fa-solid fa-font"></i> 字符串</div>
          <div data-type="number"><i class="fa-solid fa-hashtag"></i> 数字</div>
          <div data-type="boolean"><i class="fa-solid fa-toggle-on"></i> 布尔值</div>
          <div data-type="array"><i class="fa-solid fa-list"></i> 数组</div>
          <div data-type="object"><i class="fa-solid fa-code"></i> 对象</div>
        </div>
      </div>
    `);

    // 添加点击事件处理，点击按钮时直接调用回调并关闭对话框
    content.find('.variable-type-options div').on('click', function () {
      const dataType = $(this).attr('data-type') as VariableDataType;

      // 关闭弹窗 (使用类选择器直接查找并关闭)
      $('.popup_close_button').trigger('click');

      // 调用回调函数创建变量
      callback(dataType);
    });

    // 打开显示类型的弹框，无需确认/取消按钮
    await callGenericPopup(content, POPUP_TYPE.DISPLAY);
  }

  /**
   * 显示确认对话框
   * @param message 确认信息
   * @param callback 确认后的回调
   */
  public async showConfirmDialog(message: string, callback: (confirmed: boolean) => void): Promise<void> {
    const result = await callGenericPopup(message, POPUP_TYPE.CONFIRM, '', {
      okButton: '确认',
      cancelButton: '取消',
    });

    callback(!!result);
  }

  /**
   * 渲染变量管理器浮窗
   * 创建可拖动、可调整大小的浮窗
   */
  public render(): void {
    // 如果已经有浮窗，先移除
    this.unrender();

    // 创建浮窗容器
    this.dialog = $(`
      <div class="variable-manager-dialog">
        <div class="dialog-header">
          <div class="dialog-title">变量管理器</div>
          <div class="dialog-controls">
            <button class="dialog-toggle-btn" title="折叠/展开内容"><i class="fa-solid fa-chevron-up"></i></button>
            <button class="dialog-close-btn"><i class="fa-solid fa-times"></i></button>
          </div>
        </div>
        <div class="dialog-content"></div>
        <div class="dialog-resize-handle"></div>
      </div>
    `);

    // 将变量管理器内容添加到浮窗
    this.dialog.find('.dialog-content').append(this.container);

    // 添加关闭按钮事件
    this.dialog.find('.dialog-close-btn').on('click', () => {
      this.unrender();
    });

    // 添加折叠按钮事件
    this.dialog.find('.dialog-toggle-btn').on('click', () => {
      // 获取内容区域和折叠按钮
      const $content = this.dialog!.find('.dialog-content');
      const $toggleBtn = this.dialog!.find('.dialog-toggle-btn i');

      // 切换内容区域的显示状态
      $content.slideToggle(300, () => {
        // 切换按钮图标，反映当前状态
        if ($content.is(':visible')) {
          $toggleBtn.removeClass('fa-chevron-down').addClass('fa-chevron-up');
          // 内容显示时允许调整大小
          this.dialog!.find('.dialog-resize-handle').show();
        } else {
          $toggleBtn.removeClass('fa-chevron-up').addClass('fa-chevron-down');
          // 内容隐藏时禁用调整大小
          this.dialog!.find('.dialog-resize-handle').hide();
        }
      });

      // 添加折叠/展开类，用于CSS样式调整
      this.dialog!.toggleClass('content-collapsed');
    });

    // 添加到文档
    $('body').append(this.dialog);

    // 初始化拖动和调整大小功能
    this.initDraggableDialog();

    // 显示浮窗并设置初始位置（居中）
    this.centerDialog();

    // 显示变量管理器内容
    this.container.show();
  }

  /**
   * 关闭并清理变量管理器浮窗
   */
  public unrender(): void {
    if (this.dialog) {
      // 从DOM中移除浮窗，但保留容器内容
      this.container.detach();
      this.dialog.remove();
      this.dialog = null;

      // 调用控制器的清理方法
      if (this.controller) {
        console.log('[VariableView] 调用控制器清理方法');
        this.controller.cleanup();
      }
    }
  }

  /**
   * 初始化浮窗的拖动和调整大小功能
   */
  private initDraggableDialog(): void {
    if (!this.dialog) return;

    // 使浮窗可拖动（仅通过标题栏）
    (this.dialog as any).draggable({
      handle: '.dialog-header',
      containment: 'window',
      start: () => {
        this.dialog?.addClass('dragging');
      },
      stop: () => {
        this.dialog?.removeClass('dragging');
      },
    });

    // 使浮窗可调整大小
    (this.dialog as any).resizable({
      handles: 'se',
      minHeight: VariableView.MIN_DIALOG_HEIGHT,
      minWidth: VariableView.MIN_DIALOG_WIDTH,
      start: () => {
        this.dialog?.addClass('resizing');
      },
      stop: () => {
        this.dialog?.removeClass('resizing');
      },
    });
  }

  /**
   * 将浮窗居中显示
   */
  private centerDialog(): void {
    if (!this.dialog) return;

    // 获取窗口尺寸
    const windowWidth = $(window).width() || 0;
    const windowHeight = $(window).height() || 0;

    // 获取浮窗尺寸
    const dialogWidth = this.dialog.outerWidth() || VariableView.MIN_DIALOG_WIDTH;
    const dialogHeight = this.dialog.outerHeight() || VariableView.MIN_DIALOG_HEIGHT;

    // 计算居中位置
    const left = Math.max(0, (windowWidth - dialogWidth) / 2);
    const top = Math.max(0, (windowHeight - dialogHeight) / 2);

    // 设置浮窗位置
    this.dialog.css({
      left: `${left}px`,
      top: `${top}px`,
      position: 'fixed',
    });
  }

  // 添加：实现 IDomUpdater 接口中确实缺失的方法
  public addVariableCard(name: string, value: any): void {
    console.log(`[VariableView (IDomUpdater)] 尝试添加卡片: ${name}`, value);

    try {
      // 推断数据类型
      let dataType: VariableDataType = 'string';
      if (Array.isArray(value)) {
        dataType = 'array';
      } else if (typeof value === 'boolean') {
        dataType = 'boolean';
      } else if (typeof value === 'number') {
        dataType = 'number';
      } else if (typeof value === 'object' && value !== null) {
        dataType = 'object';
      }

      // 获取当前活动标签页类型
      const activeType =
        (this.container.find('.tab-item.active').attr('id')?.replace('-tab', '') as VariableType) || 'chat';

      // 获取活动标签页内容区域
      const activeContent = this.container.find(`#${activeType}-content`);

      // 获取变量列表元素
      let variableList = activeContent.find('.variable-list');

      // 如果找不到变量列表，创建一个
      if (variableList.length === 0) {
        console.log(`[VariableView] 未找到${activeType}标签页的变量列表，动态创建一个`);
        variableList = $('<div class="variable-list"></div>');
        activeContent.append(variableList);
      }

      // 创建新卡片
      const newCard = this.cardFactory.createCard(dataType, name, value);

      // 确保卡片有正确的data-name属性
      newCard.attr('data-name', name);
      // 设置原始名称属性，用于跟踪重命名
      newCard.attr('data-original-name', name);
      // 设置数据值属性
      newCard.attr('data-value', JSON.stringify(value));

      // 添加新卡片
      variableList.append(newCard);

      // 添加添加动画类
      newCard.addClass('variable-added');

      // 强制DOM重绘
      void newCard[0].offsetHeight; // 触发重排

      // 使用requestAnimationFrame确保视觉更新
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log(`[VariableView] 已强制重绘新增变量卡片: ${name}`);
        });
      });

      // 先移除之前可能存在的动画结束监听器，避免重复添加
      newCard.off('animationend.variableAdded');

      // 监听动画结束，移除动画类
      newCard.on('animationend.variableAdded', function () {
        $(this).removeClass('variable-added');
        // 动画结束后解绑事件，防止内存泄漏
        $(this).off('animationend.variableAdded');
        console.log(`[VariableView] 变量卡片"${name}"添加动画结束，移除动画类`);
      });

      console.log(`[VariableView (IDomUpdater)] 成功添加了卡片: ${name}`);
    } catch (error) {
      console.error(`[VariableView (IDomUpdater)] 添加卡片"${name}"失败:`, error);
    }
  }

  // 添加：实现 IDomUpdater 接口中确实缺失的方法
  public removeVariableCard(name: string): void {
    console.log(`[VariableView (IDomUpdater)] 尝试移除卡片: ${name}`);

    try {
      // 查找要删除的卡片
      const $card = this.container.find(`.variable-card[data-name="${name}"]`);

      if ($card.length > 0) {
        // 添加删除动画类
        $card.addClass('variable-deleted');

        // 强制DOM重绘
        void $card[0].offsetHeight; // 触发重排

        // 使用requestAnimationFrame确保视觉更新
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            console.log(`[VariableView] 已强制重绘删除变量卡片: ${name}`);
          });
        });

        // 先移除之前可能存在的动画结束监听器，避免重复添加
        $card.off('animationend.variableDeleted');

        // 监听动画结束，然后移除元素
        $card.on('animationend.variableDeleted', function () {
          // 动画结束后解绑事件，防止内存泄漏
          $(this).off('animationend.variableDeleted');
          // 移除卡片元素
          $(this).remove();
          console.log(`[VariableView] 变量卡片"${name}"删除动画结束，卡片已移除`);
        });

        console.log(`[VariableView (IDomUpdater)] 卡片"${name}"已添加删除动画，将在动画结束后移除`);
      } else {
        console.warn(`[VariableView (IDomUpdater)] 未找到要移除的卡片: ${name}`);
      }
    } catch (error) {
      console.error(`[VariableView (IDomUpdater)] 移除卡片"${name}"失败:`, error);
      // 出错时，尝试直接移除卡片作为降级处理
      const $card = this.container.find(`.variable-card[data-name="${name}"]`);
      if ($card.length > 0) {
        $card.remove();
        console.log(`[VariableView (IDomUpdater)] 移除卡片失败后直接移除: ${name}`);
      }
    }
  }
}
