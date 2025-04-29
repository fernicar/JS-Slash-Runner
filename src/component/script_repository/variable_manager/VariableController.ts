import { getVariables } from '@/function/variables';
import { VariableDataType, VariableType } from './types';
import { VariableModel } from './VariableModel';
import { VariableSyncService } from './VariableSyncService';
import { VariableView } from './VariableView';

/**
 * 变量控制器类，负责协调Model和View
 */
export class VariableController {
  /**
   * 变量数据模型
   */
  private model: VariableModel;

  /**
   * 变量视图
   */
  private view: VariableView;

  /**
   * 变量同步服务
   */
  private syncService: VariableSyncService;

  /**
   * 构造函数
   * @param model 数据模型
   * @param view 视图
   * @param syncService 同步服务
   */
  constructor(model: VariableModel, view: VariableView, syncService: VariableSyncService) {
    this.model = model;
    this.view = view;
    this.syncService = syncService;
  }

  /**
   * 初始化控制器
   * @param container UI容器
   */
  public async init(container: JQuery<HTMLElement>): Promise<void> {
    // 初始化视图
    this.view.initUI();

    // 设置视图关闭回调
    this.view.setOnCloseCallback(() => {
      // 浮窗关闭时，移除所有类型的监听器
      const type = this.model.getActiveVariableType();
      this.removeVariableListener(type);
    });

    // 初始化同步服务
    this.syncService.init();

    // 注册为变量变更监听器
    this.syncService.registerChangeListener(this.handleVariableChange.bind(this));

    // 绑定UI事件处理
    this.bindEvents(container);

    // 默认注册全局变量的事件监听
    this.registerVariableListener('global');

    // 加载初始变量数据（默认加载全局变量）
    await this.loadVariables('global');
  }

  /**
   * 绑定UI事件
   * @param container UI容器
   */
  private bindEvents(container: JQuery<HTMLElement>): void {
    // 绑定标签页切换事件
    container.find('.tab-item').on('click', this.handleTabChange.bind(this));

    // 绑定添加列表项按钮事件
    container.on('click', '.add-list-item', this.handleAddListItem.bind(this));

    // 绑定删除列表项按钮事件
    container.on('click', '.list-item-delete', this.handleDeleteListItem.bind(this));

    // 绑定删除变量卡片按钮事件
    container.on('click', '.delete-btn', this.handleDeleteVariableCard.bind(this));

    // 绑定保存变量卡片按钮事件
    container.on('click', '.save-btn', this.handleSaveVariableCard.bind(this));

    // 绑定新建变量按钮事件
    container.on('click', '#add-variable', this.handleAddVariable.bind(this));

    // 绑定清空全部按钮事件
    container.on('click', '#clear-all', this.handleClearAll.bind(this));

    // 绑定筛选图标点击事件
    container.on('click', '#filter-icon', this.handleFilterIconClick.bind(this));

    // 绑定筛选选项变更事件
    container.on('change', '.filter-checkbox', this.handleFilterOptionChange.bind(this));

    // 绑定搜索框输入事件
    container.on('input', '#variable-search', this.handleVariableSearch.bind(this));

    // 绑定拖拽排序停止事件
    container.on('sortupdate', '.list-items-container', this.handleListSortUpdate.bind(this));
  }

  /**
   * 加载变量
   * @param type 变量类型
   */
  public async loadVariables(type: VariableType): Promise<void> {
    console.log(`[VariableController] 开始加载${type}变量数据`);

    // 先加载变量数据到模型
    await this.model.loadVariables(type);

    // 使用setTimeout确保DOM已完全准备好后再刷新UI
    // 这有助于解决初始加载时DOM可能未完全初始化的问题
    setTimeout(() => {
      console.log(`[VariableController] DOM准备就绪，刷新${type}变量卡片`);
      this.refreshVariableCards();

      // 加载完后再次强制刷新一次，确保变量监听器和缓存是最新的
      setTimeout(() => this.forceRefresh(), 200);
    }, 50);
  }

  /**
   * 强制刷新当前活动变量
   */
  public forceRefresh(): void {
    const type = this.model.getActiveVariableType();

    // 先强制刷新同步服务的缓存
    this.syncService.forceRefreshVariables(type);

    // 然后重新加载变量到模型和视图
    setTimeout(() => {
      this.refreshVariableCards();
    }, 100);
  }

  /**
   * 刷新变量卡片
   */
  private refreshVariableCards(): void {
    const type = this.model.getActiveVariableType();

    // 确保使用最新变量数据（避免缓存问题）
    const currentVariables = getVariables({ type });

    // 如果当前模型数据与系统实际数据不一致，更新模型数据
    if (JSON.stringify(this.model.getCurrentVariables()) !== JSON.stringify(currentVariables)) {
      // 直接更新模型中的变量
      Object.assign(this.model.getCurrentVariables(), currentVariables);
    }

    const filteredVariables = this.model.filterVariables();
    const totalVariables = this.model.formatVariablesForUI().length;

    this.view.refreshVariableCards(type, filteredVariables, totalVariables);
  }

  /**
   * 处理标签页切换
   * @param event 点击事件
   */
  private async handleTabChange(event: JQuery.ClickEvent): Promise<void> {
    const target = $(event.currentTarget);
    const tabId = target.attr('id');

    if (!tabId) return;

    const contentId = tabId.replace('-tab', '-content');
    const type = tabId.replace('-tab', '') as VariableType;
    const currentType = this.model.getActiveVariableType();

    // 如果当前已经是这个标签页，不做任何处理
    if (type === currentType) return;

    // 移除所有active类
    $('.tab-item').removeClass('active');
    $('.tab-content').removeClass('active');

    // 添加active类到当前选中的标签和内容
    target.addClass('active');
    $(`#${contentId}`).addClass('active');

    // 移除旧标签页的监听
    this.removeVariableListener(currentType);

    // 注册新标签页的监听
    this.registerVariableListener(type);

    // 加载对应类型的变量
    await this.loadVariables(type);
  }

  /**
   * 注册特定类型变量的监听器
   * @param type 变量类型
   */
  private registerVariableListener(type: VariableType): void {
    switch (type) {
      case 'global':
        this.syncService.registerGlobalVariablesListener();
        break;
      case 'character':
        this.syncService.registerCharacterVariablesListener();
        break;
      case 'chat':
        this.syncService.registerChatVariablesListener();
        break;
      case 'message':
        this.syncService.registerMessageVariablesListener();
        break;
    }
  }

  /**
   * 移除特定类型变量的监听器
   * @param type 变量类型
   */
  private removeVariableListener(type: VariableType): void {
    switch (type) {
      case 'global':
        this.syncService.removeGlobalVariablesListener();
        break;
      case 'character':
        this.syncService.removeCharacterVariablesListener();
        break;
      case 'chat':
        this.syncService.removeChatVariablesListener();
        break;
      case 'message':
        this.syncService.removeMessageVariablesListener();
        break;
    }
  }

  /**
   * 处理添加列表项
   * @param event 点击事件
   */
  private handleAddListItem(event: JQuery.ClickEvent): void {
    const button = $(event.currentTarget);
    const listContainer = button.siblings('.list-items-container');

    const newItem = $(`
      <div class="list-item">
        <span class="drag-handle">☰</span>
        <textarea class="variable-content-input" placeholder="输入变量内容"></textarea>
        <button class="list-item-delete"><i class="fa-solid fa-times"></i></button>
      </div>
    `);

    listContainer.append(newItem);
    newItem.find('textarea').focus();
  }

  /**
   * 处理删除列表项
   * @param event 点击事件
   */
  private handleDeleteListItem(event: JQuery.ClickEvent): void {
    const button = $(event.currentTarget);
    const listItem = button.closest('.list-item');

    listItem.fadeOut(200, function () {
      $(this).remove();
    });
  }

  /**
   * 处理删除变量卡片
   * @param event 点击事件
   */
  private handleDeleteVariableCard(event: JQuery.ClickEvent): void {
    const button = $(event.currentTarget);
    const card = button.closest('.variable-card');
    const variableName = this.view.getVariableCardName(card);
    const type = this.model.getActiveVariableType();

    // 弹出确认对话框
    this.view.showConfirmDialog(`确定要删除变量 "${variableName}" 吗？`, async confirmed => {
      if (confirmed) {
        await this.model.deleteVariableData(type, variableName);

        // 从UI中移除卡片
        card.fadeOut(300, () => {
          card.remove();

          // 检查是否需要显示"暂无变量"提示
          const remainingCards = $(`#${type}-content`).find('.variable-card').length;
          if (remainingCards === 0) {
            this.refreshVariableCards();
          }
        });

        // 通知变量已删除
        this.syncService.notifyVariableUpdate(type, variableName, undefined);
      }
    });
  }

  /**
   * 处理保存变量卡片
   * @param event 点击事件
   */
  private async handleSaveVariableCard(event: JQuery.ClickEvent): Promise<void> {
    const button = $(event.currentTarget);
    const card = button.closest('.variable-card');
    const dataType = card.attr('data-type') as VariableDataType;
    const oldName = card.attr('data-original-name');
    const newName = this.view.getVariableCardName(card);
    const value = this.view.getVariableCardValue(card);
    const type = this.model.getActiveVariableType();

    // 验证变量名
    if (!newName || newName.trim() === '') {
      alert('变量名不能为空');
      return;
    }

    try {
      // 处理变量保存
      if (oldName && oldName !== newName) {
        // 重命名变量（单个事务）
        await this.model.renameVariable(type, oldName, newName, value);
      } else {
        // 正常保存变量
        await this.model.saveVariableData(type, newName, dataType, value);
      }

      // 更新卡片属性
      card.attr('data-original-name', newName);

      // 显示保存成功
      button.html('<i class="fa-solid fa-check"></i>');
      setTimeout(() => {
        button.html('<i class="fa-regular fa-save"></i>');
      }, 1000);

      // 通知变量已更新
      this.syncService.notifyVariableUpdate(type, newName, value);
    } catch (error) {
      console.error('保存变量失败:', error);
      alert(`保存失败: ${error}`);
    }
  }

  /**
   * 处理添加变量
   * @param event 点击事件
   */
  private async handleAddVariable(event: JQuery.ClickEvent): Promise<void> {
    const type = this.model.getActiveVariableType();

    // 显示变量类型选择对话框
    await this.view.showAddVariableDialog(dataType => {
      // 创建新变量卡片
      this.view.createNewVariableCard(type, dataType);
    });
  }

  /**
   * 处理清空全部变量
   * @param event 点击事件
   */
  private async handleClearAll(event: JQuery.ClickEvent): Promise<void> {
    const type = this.model.getActiveVariableType();
    let typeName: string;

    switch (type) {
      case 'global':
        typeName = '全局';
        break;
      case 'character':
        typeName = '角色';
        break;
      case 'chat':
        typeName = '聊天';
        break;
      case 'message':
        typeName = '消息';
        break;
      default:
        typeName = '所有';
    }

    // 显示确认对话框
    this.view.showConfirmDialog(`确定要清空所有${typeName}变量吗？此操作不可撤销！`, async confirmed => {
      if (confirmed) {
        try {
          await this.model.clearAllVariables(type);
          this.refreshVariableCards();
          // 通知变量已清空
          this.syncService.notifyVariableUpdate(type, '*', {});
        } catch (error) {
          console.error('清空变量失败:', error);
          alert(`清空失败: ${error}`);
        }
      }
    });
  }

  /**
   * 处理筛选图标点击
   * @param event 点击事件
   */
  private handleFilterIconClick(event: JQuery.ClickEvent): void {
    const filterPanel = $('#filter-options');

    if (filterPanel.is(':visible')) {
      filterPanel.slideUp(200);
    } else {
      filterPanel.slideDown(200);
    }
  }

  /**
   * 处理筛选选项变更
   * @param event 变更事件
   */
  private handleFilterOptionChange(event: JQuery.ChangeEvent): void {
    const checkbox = $(event.currentTarget);
    const type = checkbox.attr('data-type') as VariableDataType;
    const checked = checkbox.is(':checked');

    this.model.updateFilterState(type, checked);
    this.refreshVariableCards();
  }

  /**
   * 处理变量搜索
   * @param event 输入事件
   */
  private handleVariableSearch(event: JQuery.TriggeredEvent): void {
    const input = $(event.currentTarget);
    const keyword = input.val() as string;

    this.model.updateSearchKeyword(keyword);
    this.refreshVariableCards();
  }

  /**
   * 处理列表排序更新
   * @param event 排序更新事件
   */
  private async handleListSortUpdate(event: JQuery.TriggeredEvent): Promise<void> {
    const listContainer = $(event.currentTarget);
    const card = listContainer.closest('.variable-card');
    const variableName = this.view.getVariableCardName(card);
    const type = this.model.getActiveVariableType();

    // 获取新的排序
    const items: string[] = [];
    listContainer.find('.variable-content-input').each(function () {
      items.push($(this).val() as string);
    });

    // 更新排序
    await this.model.updateListOrder(type, variableName, items);

    // 通知列表排序已更新
    this.syncService.applyListOrderChange(type, variableName, items);
  }

  /**
   * 处理变量变更
   * @param type 变量类型
   * @param name 变量名称
   * @param value 变量值
   */
  private handleVariableChange(type: VariableType, name: string, value: any): void {
    console.log(`[VariableController] 处理变量变更: type=${type}, name=${name}, value=${JSON.stringify(value)}`);

    // 如果是当前活动类型，更新UI
    if (type === this.model.getActiveVariableType()) {
      console.log(`[VariableController] 变量${name}属于当前活动类型${type}，需更新UI`);

      // 更新模型中的变量(确保模型数据与实际一致)
      if (value !== undefined) {
        this.model.getCurrentVariables()[name] = value;
        console.log(`[VariableController] 已更新模型中的变量: ${name}`);
      } else {
        // 变量被删除，从模型中移除
        delete this.model.getCurrentVariables()[name];
        console.log(`[VariableController] 已从模型中删除变量: ${name}`);
      }

      // 始终刷新整个列表以确保UI与数据同步
      // 这解决了变量更新时DOM可能不会更新的问题
      console.log(`[VariableController] 刷新整个变量列表以确保同步`);
      this.refreshVariableCards();
    } else {
      console.log(`[VariableController] 变量${name}不属于当前活动类型，无需更新UI`);
    }
  }
}
