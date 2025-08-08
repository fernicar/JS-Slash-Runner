import {
  characters,
  chat_metadata,
  getCurrentChatId,
  getOneCharacter,
  getRequestHeaders,
  saveCharacterDebounced,
  saveMetadata,
  saveSettings,
  saveSettingsDebounced,
  this_chid,
} from '@sillytavern/script';
// @ts-ignore
import { selected_group } from '@sillytavern/scripts/group-chats';
import { ensureImageFormatSupported, findChar, getCharaFilename } from '@sillytavern/scripts/utils';
import {
  createNewWorldInfo,
  deleteWorldInfo,
  getWorldInfoSettings,
  METADATA_KEY,
  selected_world_info,
  setWorldInfoButtonClass,
  world_info,
  world_names,
} from '@sillytavern/scripts/world-info';

import log from 'loglevel';

interface LorebookSettings {
  selected_global_lorebooks: string[];

  scan_depth: number;
  context_percentage: number;
  budget_cap: number; // 0 means disabled
  min_activations: number;
  max_depth: number; // 0 means unlimited
  max_recursion_steps: number;

  insertion_strategy: 'evenly' | 'character_first' | 'global_first';

  include_names: boolean;
  recursive: boolean;
  case_sensitive: boolean;
  match_whole_words: boolean;
  use_group_scoring: boolean;
  overflow_alert: boolean;
}

async function editCurrentCharacter(): Promise<boolean> {
  // @ts-ignore
  $('#rm_info_avatar').html('');
  // @ts-ignore
  const form_data = new FormData(($('#form_create') as JQuery<HTMLFormElement>).get(0));

  const raw_file = form_data.get('avatar');
  if (raw_file instanceof File) {
    const converted_file = await ensureImageFormatSupported(raw_file);
    form_data.set('avatar', converted_file);
  }

  const headers = getRequestHeaders();
  // @ts-ignore
  delete headers['Content-Type'];

  // TODO: This code can be used to modify the first message!
  form_data.delete('alternate_greetings');
  // @ts-ignore
  const chid = $('.open_alternate_greetings').data('chid');
  if (chid && Array.isArray(characters[chid]?.data?.alternate_greetings)) {
    for (const value of characters[chid].data.alternate_greetings) {
      form_data.append('alternate_greetings', value);
    }
  }

  const response = await fetch('/api/characters/edit', {
    method: 'POST',
    headers: headers,
    body: form_data,
    cache: 'no-cache',
  });

  if (!response.ok) {
    return false;
  }

  await getOneCharacter(form_data.get('avatar_url'));
  // @ts-ignore
  $('#add_avatar_button').replaceWith($('#add_avatar_button').val('').clone(true));
  // @ts-ignore
  $('#create_button').attr('value', 'Save');

  return true;
}

function toLorebookSettings(world_info_settings: ReturnType<typeof getWorldInfoSettings>): LorebookSettings {
  return {
    selected_global_lorebooks: (world_info_settings.world_info as { globalSelect: string[] }).globalSelect,

    scan_depth: world_info_settings.world_info_depth,
    context_percentage: world_info_settings.world_info_budget,
    budget_cap: world_info_settings.world_info_budget_cap,
    min_activations: world_info_settings.world_info_min_activations,
    max_depth: world_info_settings.world_info_min_activations_depth_max,
    max_recursion_steps: world_info_settings.world_info_max_recursion_steps,

    insertion_strategy: { 0: 'evenly', 1: 'character_first', 2: 'global_first' }[
      world_info_settings.world_info_character_strategy
    ] as 'evenly' | 'character_first' | 'global_first',

    include_names: world_info_settings.world_info_include_names,
    recursive: world_info_settings.world_info_recursive,
    case_sensitive: world_info_settings.world_info_case_sensitive,
    match_whole_words: world_info_settings.world_info_match_whole_words,
    use_group_scoring: world_info_settings.world_info_use_group_scoring,
    overflow_alert: world_info_settings.world_info_overflow_alert,
  };
}

function assignPartialLorebookSettings(settings: Partial<LorebookSettings>): void {
  const for_eachs = {
    selected_global_lorebooks: (value: LorebookSettings['selected_global_lorebooks']) => {
      // @ts-ignore
      $('#world_info').find('option[value!=""]').remove();
      world_names.forEach((item, i) =>
        // @ts-ignore
        $('#world_info').append(`<option value='${i}'${value.includes(item) ? ' selected' : ''}>${item}</option>`),
      );

      selected_world_info.length = 0;
      selected_world_info.push(...value);
      saveSettings();
    },

    scan_depth: (value: LorebookSettings['scan_depth']) => {
      // @ts-ignore
      $('#world_info_depth').val(value).trigger('input');
    },
    context_percentage: (value: LorebookSettings['context_percentage']) => {
      // @ts-ignore
      $('#world_info_budget').val(value).trigger('input');
    },
    budget_cap: (value: LorebookSettings['budget_cap']) => {
      // @ts-ignore
      $('#world_info_budget_cap').val(value).trigger('input');
    },
    min_activations: (value: LorebookSettings['min_activations']) => {
      // @ts-ignore
      $('#world_info_min_activations').val(value).trigger('input');
    },
    max_depth: (value: LorebookSettings['max_depth']) => {
      // @ts-ignore
      $('#world_info_min_activations_depth_max').val(value).trigger('input');
    },
    max_recursion_steps: (value: LorebookSettings['max_recursion_steps']) => {
      // @ts-ignore
      $('#world_info_max_recursion_steps').val(value).trigger('input');
    },

    insertion_strategy: (value: LorebookSettings['insertion_strategy']) => {
      const converted_value = { evenly: 0, character_first: 1, global_first: 2 }[value];
      // @ts-ignore
      $(`#world_info_character_strategy option[value='${converted_value}']`).prop('selected', true);
      // @ts-ignore
      $('#world_info_character_strategy').val(converted_value).trigger('change');
    },

    include_names: (value: LorebookSettings['include_names']) => {
      // @ts-ignore
      $('#world_info_include_names').prop('checked', value).trigger('input');
    },
    recursive: (value: LorebookSettings['recursive']) => {
      // @ts-ignore
      $('#world_info_recursive').prop('checked', value).trigger('input');
    },
    case_sensitive: (value: LorebookSettings['case_sensitive']) => {
      // @ts-ignore
      $('#world_info_case_sensitive').prop('checked', value).trigger('input');
    },
    match_whole_words: (value: LorebookSettings['match_whole_words']) => {
      // @ts-ignore
      $('#world_info_match_whole_words').prop('checked', value).trigger('input');
    },
    use_group_scoring: (value: LorebookSettings['use_group_scoring']) => {
      // @ts-ignore
      $('#world_info_use_group_scoring').prop('checked', value).trigger('change');
    },
    overflow_alert: (value: LorebookSettings['overflow_alert']) => {
      // @ts-ignore
      $('#world_info_overflow_alert').prop('checked', value).trigger('change');
    },
  };

  Object.entries(settings)
    .filter(([_, value]) => value !== undefined)
    .forEach(([field, value]) => {
      // @ts-ignore
      for_eachs[field]?.(value);
    });
}

interface GetCharLorebooksOption {
  name?: string;
  type?: 'all' | 'primary' | 'additional';
}

export function getLorebookSettings(): LorebookSettings {
  const lorebook_settings = toLorebookSettings(getWorldInfoSettings());

  log.info(`Getting global lorebook settings:\n${JSON.stringify(lorebook_settings)}`);
  return structuredClone(lorebook_settings);
}

export function setLorebookSettings(settings: Partial<LorebookSettings>): void {
  if (settings.selected_global_lorebooks) {
    const inexisting_lorebooks = settings.selected_global_lorebooks.filter(lorebook => !world_names.includes(lorebook));
    if (inexisting_lorebooks.length > 0) {
      throw Error(`Attempted to modify globally enabled worldbooks, but the following worldbooks were not found: ${JSON.stringify(inexisting_lorebooks)}`);
    }
  }

  assignPartialLorebookSettings(settings);

  log.info(`Modifying global lorebook settings:\n${JSON.stringify(settings)}`);
}

export function getLorebooks(): string[] {
  log.info(`Getting worldbook list: ${JSON.stringify(world_names)}`);
  return structuredClone(world_names);
}

export async function deleteLorebook(lorebook: string): Promise<boolean> {
  const success = await deleteWorldInfo(lorebook);

  log.info(`Removing worldbook '${lorebook}' ${success ? 'succeeded' : 'failed'}`);
  return success;
}

export async function createLorebook(lorebook: string): Promise<boolean> {
  const success = await createNewWorldInfo(lorebook, { interactive: false });

  log.info(`Creating new worldbook '${lorebook}' ${success ? 'succeeded' : 'failed'}`);
  return success;
}

interface CharLorebooks {
  primary: string | null;
  additional: string[];
}

export function getCharLorebooks({
  name = (characters as any)[this_chid as string]?.avatar ?? null,
  type = 'all',
}: GetCharLorebooksOption = {}): CharLorebooks {
  // @ts-ignore
  if (selected_group && !name) {
    throw Error(`Do not call this function in a group chat`);
  }
  // @ts-ignore
  const character = findChar({ name });
  if (!character) {
    throw Error(`Could not find character card named '${name}'`);
  }

  const books: CharLorebooks = { primary: null, additional: [] };

  if (character.data?.extensions?.world) {
    books.primary = character.data?.extensions?.world;
  }

  const filename = getCharaFilename(characters.indexOf(character)) as string;
  const extraCharLore = (world_info as { charLore: { name: string; extraBooks: string[] }[] }).charLore?.find(
    e => e.name === filename,
  );
  if (extraCharLore && Array.isArray(extraCharLore.extraBooks)) {
    books.additional = extraCharLore.extraBooks;
  }

  // 根据 type 参数过滤结果
  if (type) {
    switch (type) {
      case 'primary':
        return { primary: books.primary, additional: [] };
      case 'additional':
        return { primary: null, additional: books.additional };
      case 'all':
      default:
        return books;
    }
  }

  log.info(`Getting worldbooks bound to character card, options: ${JSON.stringify({ name, type })}, result: ${JSON.stringify(books)}`);
  return structuredClone(books);
}

export function getCurrentCharPrimaryLorebook(): string | null {
  return getCharLorebooks().primary;
}

export async function setCurrentCharLorebooks(lorebooks: Partial<CharLorebooks>): Promise<void> {
  // @ts-ignore
  if (selected_group) {
    throw Error(`Do not call this function in a group chat`);
  }
  // @ts-ignore
  const filename = getCharaFilename(this_chid);
  if (!filename) {
    throw Error(`No character card is open`);
  }

  const inexisting_lorebooks: string[] = [
    ...(lorebooks.primary && !world_names.includes(lorebooks.primary) ? [lorebooks.primary] : []),
    ...(lorebooks.additional ? lorebooks.additional.filter(lorebook => !world_names.includes(lorebook)) : []),
  ];
  if (inexisting_lorebooks.length > 0) {
    throw Error(`Attempted to modify worldbooks bound to '${filename}', but the following worldbooks were not found: ${inexisting_lorebooks}`);
  }

  if (lorebooks.primary !== undefined) {
    // @ts-ignore
    const previous_primary = String($('#character_world').val());
    // @ts-ignore
    $('#character_world').val(lorebooks.primary ? lorebooks.primary : '');

    // @ts-ignore
    $('.character_world_info_selector')
      .find('option:selected')
      .val(lorebooks.primary ? world_names.indexOf(lorebooks.primary) : '');

    if (previous_primary && !lorebooks.primary) {
      // @ts-ignore
      const data = JSON.parse(String($('#character_json_data').val()));
      if (data?.data?.character_book) {
        data.data.character_book = undefined;
      }
      // @ts-ignore
      $('#character_json_data').val(JSON.stringify(data));
    }

    if (!(await editCurrentCharacter())) {
      throw Error(`Attempted to bind primary worldbook for '${filename}', but an error occurred when accessing the Tavern backend`);
    }

    // @ts-ignore
    setWorldInfoButtonClass(undefined, !!lorebooks.primary);
  }

  if (lorebooks.additional !== undefined) {
    interface CharLoreEntry {
      name: string;
      extraBooks: string[];
    }
    const char_lore = (world_info as { charLore: CharLoreEntry[] }).charLore ?? [];

    const existing_char_index = char_lore.findIndex(entry => entry.name === filename);
    if (existing_char_index === -1) {
      char_lore.push({ name: filename, extraBooks: lorebooks.additional });
    } else if (lorebooks.additional.length === 0) {
      char_lore.splice(existing_char_index, 1);
    } else {
      char_lore[existing_char_index].extraBooks = lorebooks.additional;
    }

    Object.assign(world_info, { charLore: char_lore });
  }

  saveCharacterDebounced();
  saveSettingsDebounced();

  log.info(
    `Modifying worldbooks bound to character card, parts to be modified: ${JSON.stringify(lorebooks)}${
      lorebooks.primary === undefined ? ', primary worldbook remains unchanged' : ''
    }${lorebooks.additional === undefined ? ', additional worldbooks remain unchanged' : ''}`,
  );
}

export async function getChatLorebook(): Promise<string | null> {
  const chat_id = getCurrentChatId();
  if (!chat_id) {
    throw Error(`No chat is open, cannot get chat worldbook`);
  }

  const existing_lorebook = _.get(chat_metadata, METADATA_KEY, '') as string;
  if (world_names.includes(existing_lorebook)) {
    return existing_lorebook;
  }
  _.unset(chat_metadata, METADATA_KEY);
  return null;
}

export async function setChatLorebook(lorebook: string | null): Promise<void> {
  if (lorebook === null) {
    _.unset(chat_metadata, METADATA_KEY);
    $('.chat_lorebook_button').removeClass('world_set');
  } else {
    if (!world_names.includes(lorebook)) {
      throw new Error(`Attempted to bind chat worldbook for character card, but the worldbook '${lorebook}' does not exist`);
    }

    _.set(chat_metadata, METADATA_KEY, lorebook);
    $('.chat_lorebook_button').addClass('world_set');
  }
  await saveMetadata();
}

export async function getOrCreateChatLorebook(lorebook?: string): Promise<string> {
  const existing_lorebook = await getChatLorebook();
  if (existing_lorebook !== null) {
    return existing_lorebook;
  }

  const new_lorebook = (() => {
    if (lorebook) {
      if (world_names.includes(lorebook)) {
        throw new Error(`Attempted to create chat worldbook, but the name '${lorebook}' already exists`);
      }
      return lorebook;
    }

    return `Chat Book ${getCurrentChatId()}`
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 64);
  })();
  await createNewWorldInfo(new_lorebook);

  await setChatLorebook(new_lorebook);
  return new_lorebook;
}
