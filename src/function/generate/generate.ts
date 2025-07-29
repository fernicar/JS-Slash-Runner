import { characters, name2, this_chid } from '@sillytavern/script';
import { getContext } from '@sillytavern/scripts/extensions';
import { prepareOpenAIMessages } from '@sillytavern/scripts/openai';

import { detail } from '@/function/generate/types';
import { convertFileToBase64 } from '@/function/generate/utils';

const dryRun = false;

/**
 * Handle preset path
 * @param baseData Base data
 * @param processedUserInput Processed user input
 * @param config Configuration parameters
 * @returns Generation data
 */
export async function handlePresetPath(
  baseData: any,
  processedUserInput: string,
  config: Omit<detail.GenerateParams, 'user_input' | 'use_preset'>,
) {
  // prepareOpenAIMessages will read the scene from the settings, so temporarily override it
  let originalScenario = null;

  try {
    const scenarioOverride = config?.overrides?.scenario;
    // @ts-ignore
    if (scenarioOverride && characters && characters[this_chid]) {
      // Save the original scene
      // @ts-ignore
      originalScenario = characters[this_chid].scenario || null;
      // @ts-ignore
      characters[this_chid].scenario = scenarioOverride;
    }
    // Add user message (one-time)
    const userMessageTemp = {
      role: 'user',
      content: processedUserInput,
      image: config.image,
    };

    if (config.image) {
      if (Array.isArray(config.image)) {
        delete userMessageTemp.image;
      } else {
        userMessageTemp.image = await convertFileToBase64(config.image);
      }
    }

    baseData.chatContext.oaiMessages.unshift(userMessageTemp);

    const messageData = {
      name2,
      charDescription: baseData.characterInfo.description,
      charPersonality: baseData.characterInfo.personality,
      Scenario: baseData.characterInfo.scenario,
      worldInfoBefore: baseData.worldInfo.worldInfoBefore,
      worldInfoAfter: baseData.worldInfo.worldInfoAfter,
      extensionPrompts: getContext().extensionPrompts,
      bias: baseData.chatContext.promptBias,
      type: 'normal',
      quietPrompt: '',
      quietImage: null,
      cyclePrompt: '',
      systemPromptOverride: baseData.characterInfo.system,
      jailbreakPromptOverride: baseData.characterInfo.jailbreak,
      personaDescription: baseData.characterInfo.persona,
      messages: baseData.chatContext.oaiMessages,
      messageExamples: baseData.chatContext.oaiMessageExamples,
    };

    const [prompt] = await prepareOpenAIMessages(messageData as any, dryRun);

    return { prompt };
  } finally {
    // Restore the original scene
    // @ts-ignore
    if (originalScenario !== null && characters && characters[this_chid]) {
      // @ts-ignore
      characters[this_chid].scenario = originalScenario;
    }
  }
}
