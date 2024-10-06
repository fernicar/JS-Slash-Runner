import {
  eventSource,
  event_types,
  saveSettingsDebounced,
} from "../../../../script.js";

import {
  extension_settings,
  getContext,
  renderExtensionTemplateAsync,
} from "../../../../scripts/extensions.js";

const events = [
  event_types.CHARACTER_MESSAGE_RENDERED,
  event_types.USER_MESSAGE_RENDERED,
  event_types.CHAT_CHANGED,
  event_types.MESSAGE_SWIPED,
  event_types.MESSAGE_UPDATED,
];

const { executeSlashCommandsWithOptions } = SillyTavern.getContext();

const extensionName = "JS-Slash-Runner";
const extensionFolderPath = `third-party/${extensionName}`;
const defaultSettings = {
  activate_setting: false,
  slash_command_setting: false,
};

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * iframe处理
 */
async function renderMessagesInIframes() {
  const chatContainer = document.getElementById("chat");
  const messages = chatContainer.querySelectorAll(".mes");

  // 获取用户输入的处理深度数
  const processDepth = parseInt($("#process_depth").val(), 10);

  // 计算要处理的消息范围，深度为0时，处理全部消息
  const messagesToProcess =
    processDepth > 0 ? [...messages].slice(-processDepth) : messages;

  // 遍历并处理指定范围内的消息
  messagesToProcess.forEach((message) => {
    const messageId = message.getAttribute("mesid");
    const mesTextContainer = message.querySelector(".mes_text");

    if (!mesTextContainer) {
      console.warn(`未找到 mes_text 容器，跳过消息 mesid: ${messageId}`);
      return;
    }

    // 过滤行内代码块
    const codeElements = mesTextContainer.querySelectorAll("code[class]");
    if (!codeElements.length) {
      return;
    }

    // 遍历每个 <code> 标签
    codeElements.forEach((codeElement, index) => {
      const extractedText = extractTextFromCode(codeElement);

      // 创建 iframe 并插入提取的内容
      const iframe = document.createElement("iframe");
      // 为每个 iframe 生成唯一的 ID，使用 messageId 和 <code> 标签的索引值
      iframe.id = `message-iframe-${messageId}-${index}`;
      iframe.style.width = "100%";
      iframe.style.border = "none";

      // 构建 iframe 内容
      const iframeContent = `
            <html>
                <head>
                    <style>
                        html, body {
                            margin: 0;
                            padding: 0;
                            overflow: hidden;
                        }
                    </style>
                </head>
                <body>
                    ${extractedText}
                    <script>
                        window.addEventListener('load', function() {
                            window.parent.postMessage('loaded', '*');
                        });
                    </script>
                    <script>
                    function triggerSlash(...commands) {
                        const commandText = commands.join('\\n');
                        window.parent.postMessage({ command: commandText }, '*');
                    }
                    </script>
                </body>
            </html>
        `;

      // 加载 iframe 内容
      iframe.onload = function () {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(iframeContent);
        doc.close();
        adjustIframeHeight(iframe);
        setTimeout(() => {
          adjustIframeHeight(iframe);
        }, 300);

        // 监听 iframe 内容变化
        observeIframeContent(iframe);
      };

      // 替换 codeElement
      codeElement.replaceWith(iframe);
    });
  });
}

/**
 * 递归提取 <code> 标签及其子标签中的文本内容
 * @param {HTMLElement} codeElement 要提取文本的 <code> 标签元素
 * @returns {string} 提取的文本内容
 */
function extractTextFromCode(codeElement) {
  let textContent = "";

  codeElement.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      textContent += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      textContent += extractTextFromCode(node);
    }
  });

  return textContent;
}

/**
 * 调整 iframe 的高度
 * @param {HTMLIFrameElement} iframe - 要调整高度的 iframe 元素
 */
function adjustIframeHeight(iframe) {
  if (iframe.contentWindow.document.body) {
    const height = iframe.contentWindow.document.documentElement.scrollHeight;
    iframe.style.height = height + "px";
  }
}

/**
 * 监听 iframe 内容的变化，并在变化时调整 iframe 的高度
 * @param {HTMLIFrameElement} iframe - 要监听的 iframe 元素
 */
function observeIframeContent(iframe) {
  const doc = iframe.contentWindow.document.body;

  const resizeObserver = new ResizeObserver(() => {
    adjustIframeHeight(iframe);
  });

  resizeObserver.observe(doc);
}

/**
 * 斜杠命令
 */
// 执行斜杠命令
async function executeCommand(command) {
  console.log(`Executing command: ${command}`);

  try {
    const executePromise = executeSlashCommandsWithOptions(
      command,
      true,
      null,
      false,
      null,
      null,
      null
    );
    await executePromise;
  } catch (error) {
    console.error("Error executing slash command:", error);
  }
}

// 定义 handleIframeCommand 用于处理从 iframe 传递过来的消息
async function handleIframeCommand(event) {
  if (event.data && event.data.command) {
    const command = event.data.command;
    console.log(`Received command from iframe: ${command}`);

    // 调用 executeCommand 来执行传递的命令
    await executeCommand(command);
  }
}

/**
 * 设置部分
 */
// 加载扩展设置
async function loadSettings() {
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  $("#activate_setting, #slash_command_setting").each(function () {
    const settingId = this.id;
    $(this).prop("checked", extension_settings[extensionName][settingId]);
  });

  $("#process_depth").val(extension_settings[extensionName].process_depth || 0);

  if (extension_settings[extensionName].slash_command_setting) {
    window.addEventListener("message", handleIframeCommand);
  }
}

// 实时监听扩展面板的状态
function onExtensionInput(event) {
  const settingId = event.target.id;
  const context = getContext();

  if (settingId === "activate_setting") {
    const isEnabled = Boolean($(event.target).prop("checked"));
    extension_settings[extensionName].activate_setting = isEnabled;
    if (isEnabled) {
      renderMessagesInIframes();
    } else {
      context.reloadCurrentChat(); 
    }
  } else if (settingId === "slash_command_setting") {
    const isSlashCommandEnabled = Boolean($(event.target).prop("checked"));
    extension_settings[extensionName].slash_command_setting =
      isSlashCommandEnabled;

    if (isSlashCommandEnabled) {
      window.addEventListener("message", handleIframeCommand);
    } else {
      window.removeEventListener("message", handleIframeCommand);
    }
  } else if (settingId === "process_depth") {
    const processDepth = parseInt($(event.target).val(), 10);
    extension_settings[extensionName].process_depth = processDepth;
    context.reloadCurrentChat();
  }

  // 保存设置
  saveSettingsDebounced();
}

// 监听事件
const debouncedHandleEvent = debounce(handleEvent, 100);

function handleEvent() {
  const isChecked = $("#activate_setting").prop("checked");
  if (isChecked) {
    renderMessagesInIframes();
  }
}

events.forEach((eventType) => {
  eventSource.on(eventType, debouncedHandleEvent);
});

// 界面加载
jQuery(async () => {
  const settingsHtml = await renderExtensionTemplateAsync(
    `${extensionFolderPath}`,
    "settings"
  );
  $("#extensions_settings").append(settingsHtml);
  $("#activate_setting").on("input", onExtensionInput);
  $("#slash_command_setting").on("input", onExtensionInput);
  $("#process_depth").on("input", onExtensionInput);

  // 加载设置并初始化
  loadSettings();
});
