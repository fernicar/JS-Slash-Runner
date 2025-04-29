import { getSortableDelay } from '@sillytavern/scripts/utils';

import { VariableDataType, VariableItem, VariableType } from '@/component/script_repository/variable_manager/types';
import { VariableCardFactory } from '@/component/script_repository/variable_manager/VariableCard';
import { POPUP_TYPE, callGenericPopup } from '@sillytavern/scripts/popup';

/**
 * 变量视图类，负责UI渲染和交互
 */
export class VariableView {
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
   * 变量卡片工厂
   */
  private cardFactory: VariableCardFactory;

  /**
   * 浮窗元素
   */
  private dialog: JQuery<HTMLElement> | null = null;

  /**
   * 浮窗关闭事件回调
   */
  private onClose: (() => void) | null = null;

  /**
   * 构造函数
   * @param container 变量管理器容器
   */
  constructor(container: JQuery<HTMLElement>) {
    this.container = container;
    this.cardFactory = new VariableCardFactory();
  }

  /**
   * 设置关闭回调
   * @param callback 关闭时执行的回调函数
   */
  public setOnCloseCallback(callback: () => void): void {
    this.onClose = callback;
  }

  /**
   * 初始化UI
   */
  public initUI(): void {
    console.log('[VariableView] 初始化UI');

    // 初始化标签页
    this.container.find('#global-tab').addClass('active');
    this.container.find('#global-content').addClass('active');

    // 初始化可排序功能
    this.initSortable();

    // 确保有"暂无变量"提示的默认状态
    const $variableList = this.container.find('.variable-list');
    if ($variableList.children().length === 0) {
      console.log('[VariableView] 初始化空状态提示');
      const noVarsElement = $(`<div class="list-group-item text-center text-muted">没有找到变量</div>`);
      $variableList.append(noVarsElement);
    }

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
    });
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

    // 清空变量列表显示
    const $variableList = this.container.find('.variable-list');
    $variableList.empty();

    // 更新过滤信息显示
    const filterInfoText =
      variables.length === totalCount
        ? `显示全部 ${totalCount} 个变量`
        : `显示 ${variables.length}/${totalCount} 个变量`;
    this.container.find('.filter-info').text(filterInfoText);

    // 添加变量卡片到UI
    if (variables.length > 0) {
      console.log(`[VariableView] 添加${variables.length}个变量卡片到UI`);
      variables.forEach(variable => {
        const card = this.cardFactory.createCard(variable.type, variable.name, variable.value);
        $variableList.append(card);
      });
    } else {
      // 无变量时显示提示
      console.log(`[VariableView] 变量列表为空，显示"没有找到变量"提示`);
      const noVarsElement = $(`<div class="list-group-item text-center text-muted">没有找到变量</div>`);
      $variableList.append(noVarsElement);
    }

    console.log(`[VariableView] 变量卡片刷新完成`);
  }

  /**
   * 创建新变量卡片
   * @param type 变量类型
   * @param dataType 数据类型
   */
  public createNewVariableCard(type: VariableType, dataType: VariableDataType): void {
    const $content = this.container.find(`#${type}-content`);

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
    const newCard = this.cardFactory.createCard(dataType, 'new_variable', defaultValue);

    // 设置初始原始名称为空，因为这是新创建的变量
    newCard.attr('data-original-name', '');

    // 高亮卡片并滚动到可见区域
    newCard.addClass('highlight-new');
    $content.append(newCard);

    // 定位到新卡片并聚焦到标题输入框
    const cardTop = newCard.offset()?.top || 0;
    const containerTop = $content.offset()?.top || 0;
    if ($content.length > 0) {
      const currentScrollTop = $content.scrollTop() || 0;
      $content.scrollTop(currentScrollTop + cardTop - containerTop - 20);
    }

    newCard.find('.variable-title').focus().select();

    // 3秒后移除高亮
    setTimeout(() => {
      newCard.removeClass('highlight-new');
    }, 3000);
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

        // 获取变量列表元素
        const variableList = this.container.find('.variable-list');

        // 移除可能存在的"没有找到变量"提示
        variableList.find('.text-muted').remove();

        // 添加新卡片
        variableList.append(newCard);
        console.log(`[VariableView] 已创建并添加新变量卡片: ${name}`);

        return true;
      }

      // 更新值显示
      let displayValue = JSON.stringify(value);

      // 限制显示长度
      if (displayValue.length > 100) {
        displayValue = displayValue.substring(0, 100) + '...';
      }

      // 更新卡片中的值显示
      card.find('.variable-value').text(displayValue);

      // 更新卡片中隐藏的完整值属性
      card.attr('data-value', JSON.stringify(value));

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

      // 调用关闭回调
      if (this.onClose) {
        this.onClose();
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
}
