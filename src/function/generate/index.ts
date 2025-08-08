import { stopGeneration } from '@sillytavern/script';
import { GenerateConfig, GenerateRawConfig, InjectionPrompt, Overrides, detail } from './types';

import log from 'loglevel';

import { prepareAndOverrideData } from '@/function/generate/dataProcessor';
import { handlePresetPath } from '@/function/generate/generate';
import { handleCustomPath } from '@/function/generate/generateRaw';
import { processUserInputWithImages } from '@/function/generate/inputProcessor';
import { generateResponse } from '@/function/generate/responseGenerator';
import { setupImageArrayProcessing, unblockGeneration } from '@/function/generate/utils';

declare const $: any;

let abortController = new AbortController();

let currentImageProcessingSetup: ReturnType<typeof setupImageArrayProcessing> | undefined = undefined;

/**
 * Clean up image processing related listeners and Promises
 */
function cleanupImageProcessing(): void {
  if (currentImageProcessingSetup) {
    try {
      currentImageProcessingSetup.cleanup();
      
      currentImageProcessingSetup.rejectImageProcessing(new Error('Generation stopped by user'));
      
      log.info('[Generate:Stop] Cleaned up image processing related logic');
    } catch (error) {
      log.warn('[Generate:Stop] Error cleaning up image processing:', error);
    }
    currentImageProcessingSetup = undefined;
  }
}

/**
 * Convert from Overrides to detail.OverrideConfig
 * @param overrides Override configuration
 * @returns detail.OverrideConfig
 */
export function fromOverrides(overrides: Overrides): detail.OverrideConfig {
  return {
    world_info_before: overrides.world_info_before,
    persona_description: overrides.persona_description,
    char_description: overrides.char_description,
    char_personality: overrides.char_personality,
    scenario: overrides.scenario,
    world_info_after: overrides.world_info_after,
    dialogue_examples: overrides.dialogue_examples,

    with_depth_entries: overrides.chat_history?.with_depth_entries,
    author_note: overrides.chat_history?.author_note,
    chat_history: overrides.chat_history?.prompts,
  };
}

/**
 * Convert from InjectionPrompt to InjectionPrompt
 * @param inject Injection prompt
 * @returns InjectionPrompt
 */
export function fromInjectionPrompt(inject: InjectionPrompt): InjectionPrompt {
  const position_map = {
    before_prompt: 'before_prompt',
    in_chat: 'in_chat',
    after_prompt: 'after_prompt',
    none: 'none',
  } as const;
  return {
    role: inject.role,
    content: inject.content,
    position: position_map[inject.position] as 'before_prompt' | 'in_chat' | 'after_prompt' | 'none',
    depth: inject.depth,
    should_scan: inject.should_scan,
  };
}

/**
 * Convert from GenerateConfig to detail.GenerateParams
 * @param config Generation configuration
 * @returns detail.GenerateParams
 */
export function fromGenerateConfig(config: GenerateConfig): detail.GenerateParams {
  return {
    user_input: config.user_input,
    use_preset: true,
    image: config.image,
    stream: config.should_stream ?? false,
    overrides: config.overrides !== undefined ? fromOverrides(config.overrides) : undefined,
    inject: config.injects !== undefined ? config.injects.map(fromInjectionPrompt) : undefined,
    max_chat_history: typeof config.max_chat_history === 'number' ? config.max_chat_history : undefined,
  };
}

/**
 * Convert from GenerateRawConfig to detail.GenerateParams
 * @param config Raw generation configuration
 * @returns detail.GenerateParams
 */
export function fromGenerateRawConfig(config: GenerateRawConfig): detail.GenerateParams {
  return {
    user_input: config.user_input,
    use_preset: false,
    image: config.image,
    stream: config.should_stream ?? false,
    max_chat_history: typeof config.max_chat_history === 'number' ? config.max_chat_history : undefined,
    overrides: config.overrides ? fromOverrides(config.overrides) : undefined,
    inject: config.injects ? config.injects.map(fromInjectionPrompt) : undefined,
    order: config.ordered_prompts,
  };
}

/**
 * The core function for generating AI responses
 * @param config Generation configuration parameters
 * @param config.user_input User input text
 * @param config.use_preset Whether to use presets
 * @param config.image Image parameters, can be a single image (File|string) or an array of images (File|string)[]
 * @param config.overrides Override configuration
 * @param config.max_chat_history Maximum number of chat history
 * @param config.inject Injected prompts
 * @param config.order Prompt order
 * @param config.stream Whether to enable streaming
 * @returns Promise<string> Generated response text
 */
async function iframeGenerate({
  user_input = '',
  use_preset = true,
  image = undefined,
  overrides = undefined,
  max_chat_history = undefined,
  inject = [],
  order = undefined,
  stream = false,
}: detail.GenerateParams = {}): Promise<string> {
  abortController = new AbortController();

  // 1. Process user input and images (regex, macros, image arrays)
  const inputResult = await processUserInputWithImages(user_input, use_preset, image);
  const { processedUserInput, imageProcessingSetup, processedImageArray } = inputResult;
  
  currentImageProcessingSetup = imageProcessingSetup;

  // 2. Prepare filtered base data
  const baseData = await prepareAndOverrideData(
    {
      overrides,
      max_chat_history,
      inject,
      order,
    },
    processedUserInput,
  );

  // 3. Handle based on use_preset
  const generate_data = use_preset
    ? await handlePresetPath(baseData, processedUserInput, {
        image,
        overrides,
        max_chat_history,
        inject,
        order,
      })
    : await handleCustomPath(
        baseData,
        {
          image,
          overrides,
          max_chat_history,
          inject,
          order,
          processedImageArray, 
        },
        processedUserInput,
      );

  try {
    // 4. Decide the generation method based on the stream parameter
    log.info('[Generate:Sending prompt]', generate_data);
    const result = await generateResponse(generate_data, stream, imageProcessingSetup, abortController);
    
    currentImageProcessingSetup = undefined;
    
    return result;
  } catch (error) {
    if (imageProcessingSetup) {
      imageProcessingSetup.rejectImageProcessing(error);
    }
    
    currentImageProcessingSetup = undefined;
    
    throw error;
  }
}

export async function generate(config: GenerateConfig) {
  const converted_config = fromGenerateConfig(config);
  return await iframeGenerate(converted_config);
}

export async function generateRaw(config: GenerateRawConfig) {
  const converted_config = fromGenerateRawConfig(config);
  return await iframeGenerate(converted_config);
}

/**
 * Logic when the stop button is clicked
 */
$(document).on('click', '#mes_stop', function () {
  const wasStopped = stopGeneration();
  if (wasStopped) {
    if (abortController) {
      abortController.abort('Clicked stop button');
    }
    
    cleanupImageProcessing();
    
    unblockGeneration();
  }
});
