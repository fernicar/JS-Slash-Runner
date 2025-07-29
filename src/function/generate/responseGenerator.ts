import {
  cleanUpMessage,
  countOccurrences,
  deactivateSendButtons,
  eventSource,
  isOdd,
  saveChatConditional,
  saveSettingsDebounced,
} from '@sillytavern/script';
import { t } from '@sillytavern/scripts/i18n';
import { oai_settings, sendOpenAIRequest } from '@sillytavern/scripts/openai';
import { power_user } from '@sillytavern/scripts/power-user';
import { Stopwatch } from '@sillytavern/scripts/utils';

import log from 'loglevel';
// @ts-ignore
declare const toastr: any;

import { clearInjectionPrompts, extractMessageFromData, setupImageArrayProcessing, unblockGeneration } from '@/function/generate/utils';

const type = 'quiet';

/**
 * Streaming processor class
 * Handles streaming generated response data
 */
class StreamingProcessor {
  public generator: () => AsyncGenerator<{ text: string }, void, void>;
  public stoppingStrings?: any;
  public result: string;
  public isStopped: boolean;
  public isFinished: boolean;
  public abortController: AbortController;
  private messageBuffer: string;

  constructor() {
    this.result = '';
    this.messageBuffer = '';
    this.isStopped = false;
    this.isFinished = false;
    this.generator = this.nullStreamingGeneration;
    this.abortController = new AbortController();
  }

  onProgressStreaming(text: string, isFinal: boolean) {
    // Calculate incremental text
    const newText = text.slice(this.messageBuffer.length);
    this.messageBuffer = text;
    // Compatible with old versions
    // @ts-ignore
    let processedText = cleanUpMessage(newText, false, false, !isFinal, this.stoppingStrings);

    const charsToBalance = ['*', '"', '```'];
    for (const char of charsToBalance) {
      if (!isFinal && isOdd(countOccurrences(processedText, char))) {
        const separator = char.length > 1 ? '\n' : '';
        processedText = processedText.trimEnd() + separator + char;
      }
    }

    eventSource.emit('js_stream_token_received_fully', text);
    eventSource.emit('js_stream_token_received_incrementally', processedText);

    if (isFinal) {
      // Compatible with old versions
      // @ts-ignore
      const fullText = cleanUpMessage(text, false, false, false, this.stoppingStrings);
      eventSource.emit('js_generation_ended', fullText);
    }
  }

  onErrorStreaming() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isStopped = true;
    unblockGeneration();
    saveChatConditional();
  }

  // eslint-disable-next-line require-yield
  async *nullStreamingGeneration(): AsyncGenerator<{ text: string }, void, void> {
    throw Error('Generation function for streaming is not hooked up');
  }

  async generate() {
    try {
      const sw = new Stopwatch(1000 / power_user.streaming_fps);
      const timestamps = [];

      for await (const { text } of this.generator()) {
        timestamps.push(Date.now());
        if (this.isStopped) {
          this.messageBuffer = '';
          return;
        }

        this.result = text;
        await sw.tick(() => this.onProgressStreaming(text, false));
      }

      if (!this.isStopped) {
        this.onProgressStreaming(this.result, true);
      } else {
        this.messageBuffer = '';
      }

      const seconds = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
      log.warn(
        `Stream stats: ${timestamps.length} tokens, ${seconds.toFixed(2)} seconds, rate: ${Number(
          timestamps.length / seconds,
        ).toFixed(2)} TPS`,
      );
    } catch (err) {
      if (!this.isFinished) {
        this.onErrorStreaming();
        throw Error(`Generate method error: ${err}`);
      }
      this.messageBuffer = '';
      return this.result;
    }

    this.isFinished = true;
    return this.result;
  }
}

/**
 * Handle non-streaming responses
 * @param response API response object
 * @returns Extracted message text
 */
async function handleResponse(response: any) {
  if (!response) {
    throw Error(`No response received`);
  }
  if (response.error) {
    if (response?.response) {
      toastr.error(response.response, t`API Error`, {
        preventDuplicates: true,
      });
    }
    throw Error(response?.response);
  }
  const message: string = extractMessageFromData(response);
  eventSource.emit('js_generation_ended', message);
  return message;
}

/**
 * Generate response
 * @param generate_data Generation data
 * @param useStream Whether to use streaming
 * @param imageProcessingSetup Image array processing settings, including Promise and parser
 * @param abortController Abort controller
 * @returns Generated response text
 */
export async function generateResponse(
  generate_data: any,
  useStream = false,
  imageProcessingSetup: ReturnType<typeof setupImageArrayProcessing> | undefined = undefined,
  abortController: AbortController,
): Promise<string> {
  let result = '';
  try {
    deactivateSendButtons();

    // If there is image processing, wait for the image processing to complete
    if (imageProcessingSetup) {
      try {
        await imageProcessingSetup.imageProcessingPromise;
        log.debug('[Generate:Image Array Processing] Image processing completed, continue generation process');
      } catch (imageError: any) {
        log.error('[Generate:Image Array Processing] Image processing failed:', imageError);
        // Image processing failure should not block the entire generation process, but an error needs to be recorded
        throw new Error(`Image processing failed: ${imageError?.message || 'Unknown error'}`);
      }
    }

    if (useStream) {
      const originalStreamSetting = oai_settings.stream_openai;
      if (!originalStreamSetting) {
        oai_settings.stream_openai = true;
        saveSettingsDebounced();
      }
      const streamingProcessor = new StreamingProcessor();
      // @ts-ignore
      streamingProcessor.generator = await sendOpenAIRequest('normal', generate_data.prompt, abortController.signal);
      result = (await streamingProcessor.generate()) as string;
      if (originalStreamSetting !== oai_settings.stream_openai) {
        oai_settings.stream_openai = originalStreamSetting;
        saveSettingsDebounced();
      }
    } else {
      eventSource.emit('js_generation_started');
      const response = await sendOpenAIRequest(type, generate_data.prompt, abortController.signal);
      result = await handleResponse(response);
    }
  } catch (error) {
    // If there is an image processing setting but the generation fails, make sure to reject the Promise
    if (imageProcessingSetup) {
      imageProcessingSetup.rejectImageProcessing(error);
    }
    log.error(error);
    throw error;
  } finally {
    unblockGeneration();
    await clearInjectionPrompts(['INJECTION']);
  }
  return result;
}
