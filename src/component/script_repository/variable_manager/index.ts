import { extensionFolderPath } from '@/util/extension_variables';

import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';
import { callGenericPopup, POPUP_TYPE } from '@sillytavern/scripts/popup';
import { getSortableDelay, loadFileToDocument } from '@sillytavern/scripts/utils';

// 导入变量管理器模块
import { getActiveVariableType, initStore, loadVariables, updateFilterState, updateSearchKeyword } from './store';
import { initSync, registerChangeListeners } from './sync';
import { VariableDataType } from './types';
import { createNewVariableCard, initUI, refreshVariableCards } from './ui';

const templatePath = `${extensionFolderPath}/src/component/script_repository/variable_manager`;

/**
 * 初始化变量管理器
 * 加载模板、绑定事件、初始化各模块
 */
export async function initVariableManager() {
  // 加载CSS
  await loadFileToDocument(`/scripts/extensions/${templatePath}/style.css`, 'css');

  // 渲染HTML模板
  const $variableManagerContainer = $(await renderExtensionTemplateAsync(`${templatePath}`, 'index'));

  // 初始化各模块
  initStore();
  initUI($variableManagerContainer);
  initSync();

  // 绑定标签页切换事件
  $variableManagerContainer.find('.tab-item').on('click', handleTabChange);

  // 默认显示全局变量页
  $variableManagerContainer.find('#global-tab').addClass('active');
  $variableManagerContainer.find('#global-content').addClass('active');

  // 绑定添加列表项按钮事件
  $variableManagerContainer.on('click', '.add-list-item', handleAddListItem);

  // 绑定删除列表项按钮事件
  $variableManagerContainer.on('click', '.list-item-delete', handleDeleteListItem);

  // 绑定删除变量卡片按钮事件
  $variableManagerContainer.on('click', '.delete-btn', handleDeleteVariableCard);

  // 绑定保存变量卡片按钮事件
  $variableManagerContainer.on('click', '.save-btn', handleSaveVariableCard);

  // 绑定新建变量按钮事件
  $variableManagerContainer.on('click', '#add-variable', handleAddVariable);

  // 绑定清空全部按钮事件
  $variableManagerContainer.on('click', '#clear-all', event => {
    try {
      handleClearAll(event);
    } catch (error) {
      toastr.error;
    }
  });

  // 绑定筛选图标点击事件
  $variableManagerContainer.on('click', '#filter-icon', handleFilterIconClick);

  // 绑定筛选选项变更事件
  $variableManagerContainer.on('change', '.filter-checkbox', handleFilterOptionChange);

  // 绑定搜索框输入事件
  $variableManagerContainer.on('input', '#variable-search', handleVariableSearch);

  // 初始化拖拽排序
  initSortable($variableManagerContainer);

  // 加载初始变量数据
  await loadVariables('global');

  // 注册实时变化监听
  registerChangeListeners();

  // 显示变量管理器弹窗
  await callGenericPopup($variableManagerContainer, POPUP_TYPE.DISPLAY, '', { large: true });
}

/**
 * 初始化拖拽排序
 * @param container 容器元素
 */
function initSortable(container: JQuery<HTMLElement>) {
  // 为每个列表项容器添加拖拽功能
  container.find('.list-items-container').sortable({
    delay: getSortableDelay(),
    handle: '.drag-handle',
    stop: function () {
      // 当排序停止时，更新变量存储中的顺序
      // 这里只添加方法声明，实际实现在其他文件中
    },
  });
}

/**
 * 处理标签页切换事件
 * @param event 点击事件
 */
function handleTabChange(event: JQuery.ClickEvent) {
  const target = $(event.currentTarget);
  const tabId = target.attr('id');

  if (!tabId) return;

  const contentId = tabId.replace('-tab', '-content');
  const type = tabId.replace('-tab', '') as 'global' | 'character' | 'chat';

  // 移除所有active类
  $('.tab-item').removeClass('active');
  $('.tab-content').removeClass('active');

  // 添加active类到当前选中的标签和内容
  target.addClass('active');
  $(`#${contentId}`).addClass('active');

  // 加载对应类型的变量
  loadVariables(type);

  // 刷新变量卡片
  refreshVariableCards(type);
}

/**
 * 处理添加列表项事件
 * @param event 点击事件
 */
function handleAddListItem(event: JQuery.ClickEvent) {
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
 * 处理删除列表项事件
 * @param event 点击事件
 */
function handleDeleteListItem(event: JQuery.ClickEvent) {
  const button = $(event.currentTarget);
  const listItem = button.closest('.list-item');

  listItem.fadeOut(200, function () {
    $(this).remove();
  });
}

/**
 * 处理删除变量卡片事件
 * @param event 点击事件
 */
function handleDeleteVariableCard(event: JQuery.ClickEvent) {
  const button = $(event.currentTarget);
  const card = button.closest('.variable-card');

  // 可以添加确认对话框
  if (confirm('确定要删除这个变量吗？')) {
    card.fadeOut(300, function () {
      $(this).remove();
    });
  }
}

/**
 * 处理保存变量卡片事件
 * @param event 点击事件
 */
function handleSaveVariableCard(event: JQuery.ClickEvent) {
  const button = $(event.currentTarget);
  const card = button.closest('.variable-card');

  // 获取当前变量类型(全局/角色/聊天)
  const tabContent = card.closest('.tab-content');
  const tabType = tabContent.attr('id')?.replace('-content', '') as 'global' | 'character' | 'chat';

  // 获取变量名和值
  const variableName = card.find('.variable-title').val() as string;
  const variableType = card.attr('data-type') as 'text' | 'list';

  // 调用store中的保存方法(实际实现在store.ts中)
  // saveVariableData(tabType, variableName, variableType, card);

  // 显示保存成功的提示
  button.html('<i class="fa-solid fa-check"></i>');

  // 1秒后恢复按钮状态
  setTimeout(() => {
    button.html('<i class="fa-regular fa-save"></i>');
  }, 1000);
}

/**
 * 处理新建变量事件
 * @param event 点击事件
 */
function handleAddVariable(event: JQuery.ClickEvent) {
  // 创建变量类型选择对话框
  const variableTypeDialog = $(`
    <div class="variable-type-selector">
      <div class="selector-title">选择变量类型</div>
      <div class="selector-options">
        <div class="selector-section">
          <div class="selector-option" data-type="array">
            <i class="fa-solid fa-list-ol"></i>
            <span>数组(Array)</span>
          </div>
          <div class="selector-option" data-type="boolean">
            <i class="fa-solid fa-toggle-on"></i>
            <span>布尔值(Boolean)</span>
          </div>
          <div class="selector-option" data-type="number">
            <i class="fa-solid fa-hashtag"></i>
            <span>数字(Number)</span>
          </div>
          <div class="selector-option" data-type="object">
            <i class="fa-solid fa-cube"></i>
            <span>对象(Object)</span>
          </div>
          <div class="selector-option" data-type="string">
            <i class="fa-solid fa-font"></i>
            <span>字符串(String)</span>
          </div>
        </div>
      </div>
    </div>
  `);

  // 处理选项点击事件
  variableTypeDialog.find('.selector-option').on('click', function () {
    let type = $(this).data('type') as 'text' | 'list' | 'array' | 'boolean' | 'number' | 'object' | 'string';

    // 类型重定向
    if (type === 'text') type = 'string';
    if (type === 'list') type = 'array';

    // 获取当前活动的标签页类型
    const activeTabId = $('.tab-item.active').attr('id');
    const tabType = activeTabId?.replace('-tab', '') as 'global' | 'character' | 'chat';

    // 创建新变量
    createNewVariableCard(tabType, type);

    // 关闭对话框
    $('.dialogue_popup_close_button').trigger('click');
  });

  // 显示对话框
  callGenericPopup(variableTypeDialog, POPUP_TYPE.DISPLAY);
}

/**
 * 处理清空全部事件
 * @param event 点击事件
 */
async function handleClearAll(event: JQuery.ClickEvent) {
  // 获取当前激活的内容区域
  const activeContent = $('.tab-content.active');
  const tabId = activeContent.attr('id');
  const tabType = tabId?.replace('-content', '') as 'global' | 'character' | 'chat';
  const result = await callGenericPopup('确定要清空当前标签页中的所有变量吗？', POPUP_TYPE.CONFIRM);
  // 确认对话框
  if (result) {
    activeContent.find('.variable-card').fadeOut(300, function () {
      $(this).remove();
    });

    // 清空存储的变量(实际实现在store.ts中)
    // clearAllVariables(tabType);
  }
}

/**
 * 处理筛选图标点击事件
 * @param event 点击事件
 */
function handleFilterIconClick(event: JQuery.ClickEvent) {
  const $filterIcon = $(event.currentTarget);
  const $filterOptions = $('#filter-options');

  $filterIcon.toggleClass('active');

  if ($filterOptions.is(':visible')) {
    $filterOptions.slideUp(200);
  } else {
    $filterOptions.slideDown(200);
  }
}

/**
 * 处理筛选选项变更事件
 * @param event 变更事件
 */
function handleFilterOptionChange(event: JQuery.ChangeEvent) {
  const $checkbox = $(event.currentTarget);
  const type = $checkbox.data('type') as VariableDataType;
  const checked = $checkbox.prop('checked');

  // 更新筛选状态
  updateFilterState(type, checked);

  // 刷新变量卡片
  refreshVariableCards(getActiveVariableType());
}

/**
 * 处理变量搜索事件
 * @param event 输入事件
 */
function handleVariableSearch(event: JQuery.TriggeredEvent) {
  const $searchInput = $(event.currentTarget);
  const searchText = $searchInput.val() as string;

  // 更新搜索关键词
  updateSearchKeyword(searchText);

  // 刷新变量卡片
  refreshVariableCards(getActiveVariableType());
}
