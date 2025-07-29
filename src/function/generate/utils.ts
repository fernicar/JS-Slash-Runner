import {
  activateSendButtons,
  eventSource,
  extension_prompt_roles,
  extension_prompt_types,
  saveChatConditional,
  setExtensionPrompt,
  setGenerationProgress,
  showSwipeButtons,
} from '@sillytavern/script';
import { getContext } from '@sillytavern/scripts/extensions';
import { getRegexedString, regex_placement } from '@sillytavern/scripts/extensions/regex/engine';
import { oai_settings } from '@sillytavern/scripts/openai';
import { flushEphemeralStoppingStrings } from '@sillytavern/scripts/power-user';
import { getBase64Async, isDataURL } from '@sillytavern/scripts/utils';
import log from 'loglevel';

/**
 * Convert file to base64
 * @param img File or image url
 * @returns base64 string
 */
export async function convertFileToBase64(img: File | string): Promise<string | undefined> {
  const isDataUrl = typeof img === 'string' && isDataURL(img);
  let processedImg;

  if (!isDataUrl) {
    try {
      if (typeof img === 'string') {
        const response = await fetch(img, { method: 'GET', cache: 'force-cache' });
        if (!response.ok) throw new Error('Failed to fetch image');
        const blob = await response.blob();
        processedImg = await getBase64Async(blob);
      } else {
        processedImg = await getBase64Async(img);
      }
    } catch (error) {
      log.error('[Generate:Image Array Processing] Image processing failed:', error);
    }
  }
  return processedImg;
}

/**
 * Extract message from response data
 * @param data Response data
 * @returns Extracted message string
 */
export function extractMessageFromData(data: any): string {
  if (typeof data === 'string') {
    return data;
  }

  return (
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    data?.text ??
    data?.message?.content?.[0]?.text ??
    data?.message?.tool_plan ??
    ''
  );
}

/**
 * Parse dialogue examples
 * @param examplesStr Dialogue example string
 * @returns Processed dialogue example array
 */
export function parseMesExamples(examplesStr: string): string[] {
  if (examplesStr.length === 0 || examplesStr === '<START>') {
    return [];
  }

  if (!examplesStr.startsWith('<START>')) {
    examplesStr = '<START>\n' + examplesStr.trim();
  }
  const blockHeading = '<START>\n';
  const splitExamples = examplesStr
    .split(/<START>/gi)
    .slice(1)
    .map(block => `${blockHeading}${block.trim()}\n`);

  return splitExamples;
}

/**
 * Process user input
 * @param user_input User input
 * @returns Processed user input
 */
export function processUserInput(user_input: string): string {
  if (user_input === '') {
    user_input = oai_settings.send_if_empty.trim();
  }
  return getRegexedString(user_input, regex_placement.USER_INPUT, {
    isPrompt: true,
    depth: 0,
  });
}

/**
 * Get prompt role
 * @param role Role number
 * @returns Role string
 */
export function getPromptRole(role: number): 'system' | 'user' | 'assistant' {
  switch (role) {
    case extension_prompt_roles.SYSTEM:
      return 'system';
    case extension_prompt_roles.USER:
      return 'user';
    case extension_prompt_roles.ASSISTANT:
      return 'assistant';
    default:
      return 'system';
  }
}

/**
 * Check if the prompt is filtered
 * @param promptId Prompt ID
 * @param config Configuration object
 * @returns Whether it is filtered
 */
export function isPromptFiltered(promptId: string, config: { overrides?: any }): boolean {
  if (!config.overrides) {
    return false;
  }

  if (promptId === 'with_depth_entries') {
    return config.overrides.with_depth_entries === false;
  }

  // Special handling for chat_history
  if (promptId === 'chat_history') {
    const prompts = config.overrides.chat_history;
    return prompts !== undefined && prompts.length === 0;
  }

  // For normal prompts, it is filtered only when it exists in overrides and is an empty string
  const override = config.overrides[promptId as keyof any];
  return override !== undefined && override === '';
}

/**
 * Add a temporary user message
 * @param userContent User content
 */
export function addTemporaryUserMessage(userContent: string): void {
  setExtensionPrompt('TEMP_USER_MESSAGE', userContent, extension_prompt_types.IN_PROMPT, 0, true, 1);
}

/**
 * Remove the temporary user message
 */
export function removeTemporaryUserMessage(): void {
  setExtensionPrompt('TEMP_USER_MESSAGE', '', extension_prompt_types.IN_PROMPT, 0, true, 1);
}

/**
 * Unblock the generation state
 */
export function unblockGeneration(): void {
  activateSendButtons();
  showSwipeButtons();
  setGenerationProgress(0);
  flushEphemeralStoppingStrings();
}

/**
 * Clear injection prompts
 * @param prefixes Prefix array
 */
export async function clearInjectionPrompts(prefixes: string[]): Promise<void> {
  const prompts: Record<string, any> = getContext().extensionPrompts;
  Object.keys(prompts)
    .filter(key => prefixes.some(prefix => key.startsWith(prefix)))
    .forEach(key => delete prompts[key]);

  await saveChatConditional();
}

/**
 * Directly process the image array and convert it to prompt format
 * @param processedUserInput Processed user input
 * @param image Image array parameters
 * @returns Array format containing text and image content
 */
export async function processImageArrayDirectly(
  processedUserInput: string,
  image: (File | string)[],
): Promise<{ type: string; text?: string; image_url?: { url: string; detail: string } }[]> {
  const quality = oai_settings.inline_image_quality || 'low';

  const imageContents = await Promise.all(
    image.map(async img => {
      try {
        const processedImg = await convertFileToBase64(img);
        if (!processedImg) {
          log.warn('[Generate:Image Array Processing] Image processing failed, skipping this image');
          return null;
        }
        return {
          type: 'image_url',
          image_url: { url: processedImg, detail: quality },
        };
      } catch (imgError) {
        log.error('[Generate:Image Array Processing] Single image processing failed:', imgError);
        return null;
      }
    }),
  );

  const validImageContents = imageContents.filter(content => content !== null);
  const textContent = {
    type: 'text',
    text: processedUserInput,
  };

  log.info('[Generate:Image Array Processing] Successfully processed', validImageContents.length, 'images');
  return [textContent, ...validImageContents];
}

/**
 * Set up image array processing logic (for event listening)
 * @param processedUserInput Processed user input
 * @param image Image array parameters
 * @returns An object containing user input with a marker and a Promise resolver
 */
export async function setupImageArrayProcessing(
  processedUserInput: string,
  image: (File | string)[],
): {
  userInputWithMarker: string;
  imageProcessingPromise: Promise<void>;
  resolveImageProcessing: () => void;
  rejectImageProcessing: (reason?: any) => void;
  cleanup: () => void;
} {
  const imageMarker = `__IMG_ARRAY_MARKER_`;
  const userInputWithMarker = processedUserInput + imageMarker;

  let resolveImageProcessing: () => void;
  let rejectImageProcessing: (reason?: any) => void;

  const imageProcessingPromise = new Promise<void>((resolve, reject) => {
    resolveImageProcessing = resolve;
    rejectImageProcessing = reject;
  });

  let timeoutId: NodeJS.Timeout | null = null;
  let isHandlerRegistered = true;

  const imageArrayHandler = async (eventData: { chat: { role: string; content: string | any[] }[] }) => {
    log.debug('[Generate:Image Array Processing] imageArrayHandler called');

    try {
      // Add timeout protection
      timeoutId = setTimeout(() => {
        log.warn('[Generate:Image Array Processing] Image processing timed out');
        rejectImageProcessing(new Error('Image processing timed out'));
      }, 30000); 

      for (let i = eventData.chat.length - 1; i >= 0; i--) {
        const message = eventData.chat[i];
        const contentStr = typeof message.content === 'string' ? message.content : '';

        if (message.role === 'user' && contentStr.includes(imageMarker)) {
          try {
            const quality = oai_settings.inline_image_quality || 'low';

            const imageContents = await Promise.all(
              image.map(async img => {
                try {
                  const processedImg = await convertFileToBase64(img);
                  if (!processedImg) {
                    log.warn('[Generate:Image Array Processing] Image processing failed, skipping this image');
                    return null;
                  }
                  return {
                    type: 'image_url',
                    image_url: { url: processedImg, detail: quality },
                  };
                } catch (imgError) {
                  log.error('[Generate:Image Array Processing] Single image processing failed:', imgError);
                  return null;
                }
              }),
            );

            const validImageContents = imageContents.filter(content => content !== null);
            const cleanContent = contentStr.replace(imageMarker, '');
            const textContent = {
              type: 'text',
              text: cleanContent,
            };

            message.content = [textContent, ...validImageContents] as any;

            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            log.info('[Generate:Image Array Processing] Successfully inserted', validImageContents.length, 'images into user message');
            resolveImageProcessing();
            return;
          } catch (error) {
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            log.error('[Generate:Image Array Processing] Error processing images:', error);
            rejectImageProcessing(error);
            return;
          }
        }
      }

      log.warn('[Generate:Image Array Processing] Could not find user message with image marker');
      resolveImageProcessing();
    } catch (error) {
      log.error('[Generate:Image Array Processing] imageArrayHandler exception:', error);
      rejectImageProcessing(error);
    }
  };

  eventSource.once('chat_completion_prompt_ready', imageArrayHandler);

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (isHandlerRegistered) {
      try {
        eventSource.removeListener('chat_completion_prompt_ready', imageArrayHandler);
        isHandlerRegistered = false;
        log.debug('[Generate:Image Array Processing] Cleaned up event listener');
      } catch (error) {
        log.warn('[Generate:Image Array Processing] Error cleaning up event listener:', error);
      }
    }
  };

  return {
    userInputWithMarker,
    imageProcessingPromise,
    resolveImageProcessing: resolveImageProcessing!,
    rejectImageProcessing: rejectImageProcessing!,
    cleanup,
  };
}
