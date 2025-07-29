/**
 * Character types (copied from @sillytavern/script to avoid dependency)
 */
export const extension_prompt_roles = {
  SYSTEM: 0,
  USER: 1,
  ASSISTANT: 2,
} as const;

/**
 * Generation configuration interface (with presets)
 */
export interface GenerateConfig {
  user_input?: string;
  image?: File | string | (File | string)[];
  should_stream?: boolean;
  overrides?: Overrides;
  injects?: InjectionPrompt[];
  max_chat_history?: 'all' | number;
}

/**
 * Raw generation configuration interface (without presets)
 */
export interface GenerateRawConfig {
  user_input?: string;
  image?: File | string | (File | string)[];
  should_stream?: boolean;
  overrides?: Overrides;
  injects?: InjectionRawPrompt[];
  ordered_prompts?: (BuiltinPrompt | RolePrompt)[];
  max_chat_history?: 'all' | number;
}

/**
 * Role prompt interface
 */
export interface RolePrompt {
  role: 'system' | 'assistant' | 'user';
  content: string;
  image?: File | string | (File | string)[];
}

/**
 * Injection prompt interface
 */
export interface InjectionPrompt {
  role: 'system' | 'assistant' | 'user';
  content: string;
  position: 'before_prompt' | 'in_chat' | 'after_prompt' | 'none';
  depth: number;
  should_scan: boolean;
}

/**
 * Raw injection prompt interface
 */
export interface InjectionRawPrompt {
  role: 'system' | 'assistant' | 'user';
  content: string;
  position: 'in_chat' | 'none';
  depth: number;
  should_scan: boolean;
}

/**
 * Override configuration interface
 */
export interface Overrides {
  world_info_before?: string; // World info (before character definition)
  persona_description?: string; // User description
  char_description?: string; // Character description
  char_personality?: string; // Character personality
  scenario?: string; // Scenario
  world_info_after?: string; // World info (after character definition)
  dialogue_examples?: string; // Dialogue examples
  chat_history?: {
    with_depth_entries?: boolean;
    author_note?: string;
    prompts?: RolePrompt[];
  };
}

/**
 * Built-in prompt types
 */
export type BuiltinPrompt =
  | 'world_info_before'
  | 'persona_description'
  | 'char_description'
  | 'char_personality'
  | 'scenario'
  | 'world_info_after'
  | 'dialogue_examples'
  | 'chat_history'
  | 'user_input';

/**
 * Default built-in prompt order
 */
export const builtin_prompt_default_order: BuiltinPrompt[] = [
  'world_info_before',
  'persona_description',
  'char_description',
  'char_personality',
  'scenario',
  'world_info_after',
  'dialogue_examples',
  'chat_history',
  'user_input',
];

/**
 * Base data interface
 */
export interface BaseData {
  characterInfo: {
    description: string;
    personality: string;
    persona: string;
    scenario: string;
    system: string;
    jailbreak: string;
  };
  chatContext: {
    oaiMessages: RolePrompt[];
    oaiMessageExamples: string[];
    promptBias: string[];
  };
  worldInfo: {
    worldInfoAfter: Array<string>;
    worldInfoBefore: Array<string>;
    worldInfoDepth: Array<{ entries: string; depth: number; role: number }>;
    worldInfoExamples: Array<string>;
    worldInfoString: Array<string>;
  };
}

/**
 * Detailed configuration namespace
 */
export namespace detail {
  export interface CustomPrompt {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  // Override configuration type
  export interface OverrideConfig {
    world_info_before?: string; // World info (before character definition)
    persona_description?: string; // User description
    char_description?: string; // Character description
    char_personality?: string; // Character advanced definition - personality
    scenario?: string; // Scenario
    world_info_after?: string; // World info (after character definition)
    dialogue_examples?: string; // Character advanced definition - dialogue examples

    with_depth_entries?: boolean; // World info depth
    author_note?: string; // Author's note
    chat_history?: RolePrompt[]; // Chat history
  }

  // Built-in prompt entry types
  export type BuiltinPromptEntry =
    | 'world_info_before' // World info (before character definition)
    | 'persona_description' // User description
    | 'char_description' // Character description
    | 'char_personality' // Character personality
    | 'scenario' // Scenario
    | 'world_info_after' // World info (after character definition)
    | 'dialogue_examples' // Dialogue examples
    | 'chat_history' // Chat history
    | 'user_input'; // User input

  // Generation parameters type
  export interface GenerateParams {
    user_input?: string;
    use_preset?: boolean;
    image?: File | string | (File | string)[];
    stream?: boolean;
    overrides?: OverrideConfig;
    max_chat_history?: number;
    inject?: InjectionPrompt[];
    order?: Array<BuiltinPromptEntry | CustomPrompt>;
  }
}

/**
 * Role type mapping
 */
export const roleTypes: Record<
  'system' | 'user' | 'assistant',
  (typeof extension_prompt_roles)[keyof typeof extension_prompt_roles]
> = {
  system: extension_prompt_roles.SYSTEM,
  user: extension_prompt_roles.USER,
  assistant: extension_prompt_roles.ASSISTANT,
};

/**
 * Default prompt order
 */
export const default_order: detail.BuiltinPromptEntry[] = [
  'world_info_before',
  'persona_description',
  'char_description',
  'char_personality',
  'scenario',
  'world_info_after',
  'dialogue_examples',
  'chat_history',
  'user_input',
];

/**
 * Character name behavior constants
 */
export const character_names_behavior = {
  NONE: -1,
  DEFAULT: 0,
  COMPLETION: 1,
  CONTENT: 2,
};
