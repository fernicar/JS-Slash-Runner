import { defaultAudioSettings, initAudioComponents } from '@/component/audio';
import {
  destroyCharacterLevelOnExtension,
  initializeCharacterLevelOnExtension,
} from '@/component/character_level/index';
import {
  destroyMacroOnExtension,
  initializeMacroOnExtension,
  registerAllMacros,
  unregisterAllMacros,
} from '@/component/macro';
import {
  addCodeToggleButtonsToAllMessages,
  addRenderingOptimizeSettings,
  defaultIframeSettings,
  initIframePanel,
  partialRenderEvents,
  removeRenderingOptimizeSettings,
  renderAllIframes,
  renderMessageAfterDelete,
  renderPartialIframes,
  tampermonkey_script,
  viewport_adjust_script,
} from '@/component/message_iframe';
import { initAutoSettings } from '@/component/script_repository';
import { iframe_client } from '@/iframe_client/index';
import { handleIframe } from '@/iframe_server/index';
import { checkVariablesEvents, clearTempVariables, shouldUpdateVariables } from '@/iframe_server/variables';
import { script_url } from '@/script_url';
import { initSlashEventEmit } from '@/slash_command/event';
import third_party from '@/third_party.html';

import { eventSource, event_types, reloadCurrentChat, saveSettingsDebounced, this_chid } from '@sillytavern/script';
import { extension_settings, renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';
import { executeSlashCommandsWithOptions } from '@sillytavern/scripts/slash-commands';
import { SlashCommandNamedArgument } from '@sillytavern/scripts/slash-commands/SlashCommandArgument';
import { SlashCommandParser } from '@sillytavern/scripts/slash-commands/SlashCommandParser';

export const extensionName = 'JS-Slash-Runner';
export const extensionFolderPath = `third-party/${extensionName}`;

let isScriptLibraryOpen = false;

const defaultSettings = {
  activate_setting: true,
  render: {
    ...defaultIframeSettings,
  },
  audio: {
    ...defaultAudioSettings,
  },
};

const handleChatChanged = () => {
  renderAllIframes();
  if (getSettingValue('render.rendering_optimize')) {
    addCodeToggleButtonsToAllMessages();
  }
};

const handlePartialRender = (mesId: string) => {
  renderPartialIframes(mesId);
};

const handleMessageDeleted = (mesId: string) => {
  clearTempVariables();
  renderMessageAfterDelete(mesId);
  if (getSettingValue('render.rendering_optimize')) {
    addCodeToggleButtonsToAllMessages();
  }
};

const handleVariableUpdated = (mesId: string) => {
  shouldUpdateVariables(mesId);
};

async function onExtensionToggle(userAction: boolean = true) {
  const isEnabled = Boolean($('#activate_setting').prop('checked'));
  if (userAction) {
    extension_settings[extensionName].activate_setting = isEnabled;
  }
  if (isEnabled) {
    script_url.set('iframe_client', iframe_client);
    script_url.set('viewport_adjust_script', viewport_adjust_script);
    script_url.set('tampermonkey_script', tampermonkey_script);

    registerAllMacros();
    initializeMacroOnExtension();
    initializeCharacterLevelOnExtension();

    // 重新注入前端卡优化的样式和设置
    if (userAction && getSettingValue('render.rendering_optimize')) {
      addRenderingOptimizeSettings();
    }

    window.addEventListener('message', handleIframe);

    eventSource.on(event_types.CHAT_CHANGED, handleChatChanged);

    partialRenderEvents.forEach(eventType => {
      eventSource.on(eventType, (mesId: string) => handlePartialRender(mesId));
    });

    checkVariablesEvents.forEach(eventType => {
      eventSource.on(eventType, (mesId: string) => handleVariableUpdated(mesId));
    });
    eventSource.on(event_types.MESSAGE_DELETED, (mesId: string) => handleMessageDeleted(mesId));

    if (userAction) {
      await renderAllIframes();
    }
  } else {
    script_url.delete('iframe_client');
    script_url.delete('viewport_adjust_script');
    script_url.delete('tampermonkey_script');

    unregisterAllMacros();
    destroyMacroOnExtension();
    destroyCharacterLevelOnExtension();

    if (getSettingValue('render.rendering_optimize')) {
      removeRenderingOptimizeSettings();
    }

    window.removeEventListener('message', handleIframe);

    eventSource.removeListener(event_types.CHAT_CHANGED, handleChatChanged);

    partialRenderEvents.forEach(eventType => {
      eventSource.removeListener(eventType, (mesId: string) => handlePartialRender(mesId));
    });
    checkVariablesEvents.forEach(eventType => {
      eventSource.removeListener(eventType, (mesId: string) => handleVariableUpdated(mesId));
    });
    eventSource.removeListener(event_types.MESSAGE_DELETED, (mesId: string) => handleMessageDeleted(mesId));
    if (userAction && this_chid !== undefined) {
      await reloadCurrentChat();
    }
  }
  $('#js_slash_runner_text').text(getSettingValue('activate_setting') ? '关闭前端渲染' : '开启前端渲染');
  saveSettingsDebounced();
}

function formatSlashCommands(): string {
  const cmdList = Object.keys(SlashCommandParser.commands)
    .filter(key => SlashCommandParser.commands[key].name === key) // exclude aliases
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(key => SlashCommandParser.commands[key]);
  const transform_arg = (arg: SlashCommandNamedArgument) => {
    const transformers = {
      name: (value: SlashCommandNamedArgument['name']) => ({ name: value }),
      // description: (value: SlashCommandNamedArgument['description']) => ({ description: value }),
      isRequired: (value: SlashCommandNamedArgument['isRequired']) => ({
        is_required: value,
      }),
      defaultValue: (value: SlashCommandNamedArgument['defaultValue']) =>
        value !== null ? { default_value: value } : {},
      acceptsMultiple: (value: SlashCommandNamedArgument['acceptsMultiple']) => ({ accepts_multiple: value }),
      enumList: (value: SlashCommandNamedArgument['enumList']) =>
        value.length > 0 ? { enum_list: value.map(e => e.value) } : {},
      typeList: (value: SlashCommandNamedArgument['typeList']) => (value.length > 0 ? { type_list: value } : {}),
    };

    return Object.entries(arg)
      .filter(([_, value]) => value !== undefined)
      .reduce(
        (result, [key, value]) => ({
          ...result,
          // @ts-ignore
          ...transformers[key]?.(value),
        }),
        {},
      );
  };
  const transform_help_string = (help_string: string) => {
    const content = $('<span>').html(help_string);
    return content
      .text()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .join(' ');
  };

  return cmdList
    .map(cmd => ({
      name: cmd.name,
      named_args: cmd.namedArgumentList.map(transform_arg) ?? [],
      unnamed_args: cmd.unnamedArgumentList.map(transform_arg) ?? [],
      return_type: cmd.returns ?? 'void',
      help_string: transform_help_string(cmd.helpString) ?? 'NO DETAILS',
    }))
    .map(
      cmd =>
        `/${cmd.name}${cmd.named_args.length > 0 ? ` ` : ``}${cmd.named_args
          .map(
            arg =>
              `[${arg.accepts_multiple ? `...` : ``}${arg.name}=${
                arg.enum_list ? arg.enum_list.join('|') : arg.type_list.join('|')
              }]${arg.is_required ? `` : `?`}${arg.default_value ? `=${arg.default_value}` : ``}`,
          )
          .join(' ')}${cmd.unnamed_args.length > 0 ? ` ` : ``}${cmd.unnamed_args
          .map(
            arg =>
              `(${arg.accepts_multiple ? `...` : ``}${
                arg.enum_list ? arg.enum_list.join('|') : arg.type_list.join('|')
              })${arg.is_required ? `` : `?`}${arg.default_value ? `=${arg.default_value}` : ``}`,
          )
          .join(' ')} // ${cmd.help_string}`,
    )
    .join('\n');
}

/**
 * 获取设置变量的值
 * @returns 设置变量的值
 */
export function getSettingValue(key: string) {
  const keys = key.split('.');
  let value = extension_settings[extensionName];

  for (const k of keys) {
    if (value === undefined || value === null) {
      return undefined;
    }
    value = value[k];
  }

  return value;
}

function addQuickButton() {
  const buttonHtml = $(`
  <div id="js_slash_runner_container" class="list-group-item flex-container flexGap5 interactable">
      <div class="fa-solid fa-puzzle-piece extensionsMenuExtensionButton" /></div>
      <span id="js_slash_runner_text">${getSettingValue('activate_setting') ? '关闭前端渲染' : '开启前端渲染'}</span>
  </div>`);
  buttonHtml.css('display', 'flex');
  $('#extensionsMenu').append(buttonHtml);
  $('#js_slash_runner_container').on('click', function () {
    const currentChecked = $('#activate_setting').prop('checked');
    $('#activate_setting').prop('checked', !currentChecked);
    onExtensionToggle(true);
  });
}
/**
 * 初始化扩展面板
 */
jQuery(async () => {
  const getContainer = () => $(document.getElementById('extensions_settings'));
  const windowHtml = await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'settings');
  getContainer().append(windowHtml);

  extension_settings[extensionName] = extension_settings[extensionName] || {};

  if (
    !extension_settings[extensionName] ||
    !extension_settings[extensionName].render ||
    !extension_settings[extensionName].audio
  ) {
    Object.assign(extension_settings[extensionName], defaultSettings);
    saveSettingsDebounced();
  }

  $('#activate_setting').prop('checked', getSettingValue('activate_setting'));
  $('#activate_setting').on('click', () => onExtensionToggle(true));
  if (getSettingValue('activate_setting')) {
    onExtensionToggle(false);
  }

  addQuickButton();

  $('#scriptLibraryButton')
    .off('click')
    .on('click', function () {
      isScriptLibraryOpen = !isScriptLibraryOpen;
      $('#scriptLibraryPopup').slideToggle(200, 'swing');
    });

  $(document).on('mousedown touchstart', function (e) {
    const clickTarget = $(e.target);

    if (
      isScriptLibraryOpen &&
      clickTarget.closest('#scriptLibraryButton').length === 0 &&
      clickTarget.closest('#scriptLibraryPopup').length === 0
    ) {
      $('#scriptLibraryPopup').slideUp(200, 'swing');
      isScriptLibraryOpen = false;
    }
  });
  $('#copy_third_party_installation').on('pointerup', function () {
    navigator.clipboard.writeText(
      'npm install --save-dev @types/file-saver @types/jquery @types/jqueryui @types/lodash @types/yamljs',
    );
    executeSlashCommandsWithOptions('/echo severity=success 已复制到剪贴板!');
  });
  $('#copy_third_party_tag').on('pointerup', function () {
    navigator.clipboard.writeText(third_party);
    executeSlashCommandsWithOptions('/echo severity=success 已复制到剪贴板!');
  });

  $('#download_slash_commands').on('click', function () {
    const url = URL.createObjectURL(new Blob([formatSlashCommands()], { type: 'text/plain' }));
    $(this).attr('href', url);
    $(this).attr('download', 'slash_command.txt');
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });
  initAutoSettings();
  initAudioComponents();
  initSlashEventEmit();
  initIframePanel();
});
