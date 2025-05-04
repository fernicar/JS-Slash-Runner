import { VariableDataType, VariableType } from '@/component/script_repository/variable_manager/types';
import { VariableModel } from '@/component/script_repository/variable_manager/variable_model';
import { VariableSyncService } from '@/component/script_repository/variable_manager/variable_sync';
import { VariableView } from '@/component/script_repository/variable_manager/variable_view';
import { getVariables } from '@/function/variables';
import { POPUP_TYPE, callGenericPopup } from '@sillytavern/scripts/popup';

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
    this.view.initUI();
    this.bindEvents(container);
    await this.syncService.setCurrentType('global');
    this.syncService.activateListeners();
    await this.loadVariables('global');
  }

  /**
   * 绑定UI事件
   * @param container UI容器
   */
  private bindEvents(container: JQuery<HTMLElement>): void {
    container.find('.tab-item').on('click', this.handleTabChange.bind(this));
    container.on('click', '.add-list-item', this.handleAddListItem.bind(this));
    container.on('click', '.list-item-delete', this.handleDeleteListItem.bind(this));
    container.on('click', '.delete-btn', this.handleDeleteVariableCard.bind(this));
    container.on('click', '.save-btn', this.handleSaveVariableCard.bind(this));
    container.on('click', '#add-variable', this.handleAddVariable.bind(this));
    container.on('click', '#clear-all', this.handleClearAll.bind(this));
    container.on('click', '#filter-icon', this.handleFilterIconClick.bind(this));
    container.on('change', '.filter-checkbox', this.handleFilterOptionChange.bind(this));
    container.on('input', '#variable-search', this.handleVariableSearch.bind(this));
    container.on('click', '#floor-filter-btn', this.handleFloorRangeFilter.bind(this));
  }

  /**
   * 加载变量
   * @param type 变量类型
   */
  public async loadVariables(type: VariableType): Promise<void> {
    const isListeningActive = this.syncService['_listenersActive'];
    if (isListeningActive) {
      this.syncService.deactivateListeners();
    }

    try {
      await this.model.loadVariables(type);

      if (type === 'message') {
        this.view.getContainer().find('#floor-filter-container').show();
        const [minFloor, maxFloor] = this.model.getFloorRange();
        this.view.updateFloorRangeInputs(minFloor, maxFloor);
      } else {
        this.view.getContainer().find('#floor-filter-container').hide();
      }

      this.refreshVariableCards();
    } finally {
      if (isListeningActive) {
        this.syncService.activateListeners();
      }
    }
  }

  /**
   * 强制刷新当前活动变量
   */
  public forceRefresh(): void {
    const type = this.model.getActiveVariableType();

    try {
      const latestVariables = getVariables({ type });
      Object.assign(this.model.getCurrentVariables(), latestVariables);
      this.refreshVariableCards();
    } catch (error) {
      console.error(`[VariableManager] 强制刷新变量数据失败:`, error);
    }
  }

  /**
   * 刷新变量卡片
   */
  private refreshVariableCards(): void {
    const type = this.model.getActiveVariableType();
    const operationId = Date.now();

    try {
      if (type !== 'message') {
        const currentVariables = getVariables({ type });
        const currentModelVars = this.model.getCurrentVariables();

        let isDifferent = false;
        try {
          isDifferent = JSON.stringify(currentModelVars) !== JSON.stringify(currentVariables);
        } catch (e) {
          isDifferent = true;
        }

        if (isDifferent) {
          Object.assign(currentModelVars, currentVariables);
        }
      }

      const filteredVariables = this.model.filterVariables(operationId);
      this.view.refreshVariableCards(type, filteredVariables);
    } catch (error) {
      console.error(`[VariableManager] 刷新变量卡片失败:`, error);
    }
  }

  /**
   * 处理标签页切换
   * @param event 点击事件
   */
  private async handleTabChange(event: JQuery.ClickEvent): Promise<void> {
    const target = $(event.currentTarget);
    const tabId = target.attr('id');

    if (!tabId) return;

    const type = tabId.replace('-tab', '') as VariableType;
    const currentType = this.model.getActiveVariableType();

    if (type === currentType) return;

    this.view.setActiveTab(type);
    this.syncService.deactivateListeners();
    await this.syncService.setCurrentType(type);
    this.syncService.activateListeners();
    await this.loadVariables(type);
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
    const name = this.view.getVariableCardName(card);
    const type = this.model.getActiveVariableType();

    this.view.showConfirmDialog(`确定要删除变量 "${name}" 吗？`, async confirmed => {
      if (confirmed) {
        try {
          await this.model.deleteVariableData(type, name);
          card.fadeOut(300, function () {
            $(this).remove();
          });
        } catch (error) {
          console.error(`[VariableManager] 删除变量失败:`, error);
        }
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
    const oldName = this.view.getVariableCardName(card);
    const newName = card.find('.variable-name-input').val() as string;
    const type = this.model.getActiveVariableType();
    const value = this.view.getVariableCardValue(card);

    if (!newName || newName.trim() === '') {
      callGenericPopup('变量名不能为空', POPUP_TYPE.TEXT);
      return;
    }

    try {
      if (oldName !== newName) {
        if (this.model.getVariableValue(newName) !== undefined) {
          const userConfirmed = await new Promise<boolean>(resolve => {
            this.view.showConfirmDialog(`变量 "${newName}" 已存在，确定要覆盖吗？`, confirmed => resolve(confirmed));
          });

          if (!userConfirmed) return;
        }

        await this.model.renameVariable(type, oldName, newName, value);
      } else {
        await this.model.saveVariableData(type, newName, value);
      }

      card.removeClass('editing');
      card.find('.variable-actions').show();
      const nameEl = card.find('.variable-name');
      nameEl.text(newName).show();
      card.find('.variable-name-input').hide();

      this.refreshVariableCards();
    } catch (error) {
      console.error(`[VariableManager] 保存变量失败:`, error);
      callGenericPopup('保存变量失败：' + (error as Error).message, POPUP_TYPE.TEXT);
    }
  }

  /**
   * 处理添加变量
   */
  private async handleAddVariable(): Promise<void> {
    this.view.showAddVariableDialog(dataType => {
      this.view.createNewVariableCard(this.model.getActiveVariableType(), dataType);
    });
  }

  /**
   * 处理清空全部变量
   */
  private async handleClearAll(): Promise<void> {
    const type = this.model.getActiveVariableType();
    const typeText = {
      global: '全局',
      character: '角色',
      chat: '聊天',
      message: '消息',
    }[type];

    this.view.showConfirmDialog(`确定要清空所有${typeText}变量吗？此操作不可恢复！`, async confirmed => {
      if (confirmed) {
        try {
          await this.model.clearAllVariables(type);

          const $content = this.view.getContainer().find(`#${type}-content`);
          $content.find('.variable-list').empty();

          callGenericPopup(`已清空所有${typeText}变量`, POPUP_TYPE.TEXT);
        } catch (error) {
          console.error(`[VariableManager] 清空变量失败:`, error);
          callGenericPopup('清空变量失败：' + (error as Error).message, POPUP_TYPE.TEXT);
        }
      }
    });
  }

  /**
   * 处理筛选图标点击
   */
  private handleFilterIconClick(): void {
    const $filterOptions = this.view.getContainer().find('.filter-options');
    $filterOptions.toggle();
  }

  /**
   * 处理筛选选项变更
   * @param event 变更事件
   */
  private handleFilterOptionChange(event: JQuery.ChangeEvent): void {
    const $checkbox = $(event.currentTarget);
    const type = $checkbox.data('type') as VariableDataType;
    const isChecked = $checkbox.is(':checked');

    this.model.updateFilterState(type, isChecked);
    this.refreshVariableCards();
  }

  /**
   * 处理变量搜索
   * @param event 输入事件
   */
  private handleVariableSearch(event: JQuery.TriggeredEvent): void {
    const keyword = $(event.currentTarget).val() as string;
    this.model.updateSearchKeyword(keyword);
    this.refreshVariableCards();
  }

  /**
   * 处理楼层范围筛选
   */
  private handleFloorRangeFilter(): void {
    const $minInput = this.view.getContainer().find('#floor-min');
    const $maxInput = this.view.getContainer().find('#floor-max');

    const minVal = $minInput.val() as string;
    const maxVal = $maxInput.val() as string;

    const min = minVal ? parseInt(minVal) : null;
    const max = maxVal ? parseInt(maxVal) : null;

    if ((min !== null && isNaN(min)) || (max !== null && isNaN(max))) {
      this.view.showFloorFilterError('请输入有效的数字');
      return;
    }

    if (min !== null && max !== null && min > max) {
      this.view.showFloorFilterError('最小值不能大于最大值');
      return;
    }

    this.view.hideFloorFilterError();

    if (min !== null || max !== null) {
      this.applyFloorRangeAndReload(min || 0, max === null ? Infinity : max);
    }
  }

  /**
   * 应用楼层范围并重新加载变量
   * @param min 最小楼层
   * @param max 最大楼层
   */
  private async applyFloorRangeAndReload(min: number, max: number): Promise<void> {
    this.model.updateFloorRange(min, max === Infinity ? null : max);

    this.syncService.deactivateListeners();
    try {
      await this.model.loadVariables('message');
      this.refreshVariableCards();
    } finally {
      this.syncService.activateListeners();
    }
  }

  /**
   * 清理控制器资源
   */
  public cleanup(): void {
    this.view.getContainer().find('.tab-item').off('click');
    this.view.getContainer().off('click', '.add-list-item');
    this.view.getContainer().off('click', '.list-item-delete');
    this.view.getContainer().off('click', '.delete-btn');
    this.view.getContainer().off('click', '.save-btn');
    this.view.getContainer().off('click', '#add-variable');
    this.view.getContainer().off('click', '#clear-all');
    this.view.getContainer().off('click', '#filter-icon');
    this.view.getContainer().off('change', '.filter-checkbox');
    this.view.getContainer().off('input', '#variable-search');
    this.view.getContainer().off('click', '#floor-filter-btn');

    try {
      this.syncService.cleanup();
    } catch (error) {
      console.error(`[VariableManager] 清理同步服务失败:`, error);
    }
  }
}
