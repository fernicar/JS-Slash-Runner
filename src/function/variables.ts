import { getCharacterScriptVariables, replaceCharacterScriptVariables } from '@/component/script_repository/script_repository';
import { chat, chat_metadata, saveMetadata, saveSettings } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { getChatMessages, setChatMessage } from './chat_message';

interface VariableOption {
  /**
   * 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
   */
  type?: 'message' | 'chat' | 'character' | 'global';

  /**
   * 当 `type` 为 `'message'` 时, 该参数指定要获取变量的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
   */
  message_id?: number | 'latest';
}

function getVariablesByType({ type = 'chat', message_id = 'latest' }: VariableOption): Record<string, any> {
  switch (type) {
    case 'message': {
      if (message_id !== 'latest' && (message_id < -chat.length || message_id >= chat.length)) {
        throw Error(`提供的 message_id(${message_id}) 超出了聊天消息楼层号范围`);
      }
      message_id = message_id === 'latest' ? -1 : message_id;
      return getChatMessages(message_id)[0].data;
    }
    case 'chat': {
      const metadata = chat_metadata as {
        variables: Record<string, any> | undefined;
      };
      if (!metadata.variables) {
        metadata.variables = {};
      }
      return metadata.variables;
    }
    case 'character': {
      return getCharacterScriptVariables();
    }
    case 'global':
      return extension_settings.variables.global;
  }
}

/**
 * 获取变量表
 *
 * @param option 可选选项
 *   - `type?:number|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *
 * @returns 变量表
 *
 * @example
 * // 获取所有聊天变量并弹窗输出结果
 * const variables = getVariables({type: 'chat'});
 * alert(variables);
 *
 * @example
 * // 获取所有全局变量
 * const variables = getVariables({type: 'global'});
 * // 酒馆助手内置了 lodash 库, 你能用它做很多事, 比如查询某个变量是否存在
 * if (_.has(variables, "神乐光.好感度")) {
 *   ...
 * }
 *
 * @example
 * // 获取倒数第二楼层的聊天变量
 * const variables = getVariables({type: 'message', message_id: -2});
 */
export function getVariables({ type = 'chat', message_id = 'latest' }: VariableOption = {}): Record<string, any> {
  const result = getVariablesByType({ type, message_id });

  console.info(`获取${type == 'chat' ? `聊天` : `全局`}变量表:\n${JSON.stringify(result, undefined, 2)}`);
  return result;
}

/**
 * 完全替换变量表为 `variables`
 *
 * 之所以提供这么直接的函数, 是因为酒馆助手内置了 lodash 库:
 *   `insertOrAssignVariables` 等函数其实就是先 `getVariables` 获取变量表, 用 lodash 库处理, 再 `replaceVariables` 替换变量表.
 *
 * @param variables 要用于替换的变量表
 * @param option 可选选项
 *   - `type?:number|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *
 * @example
 * // 执行前的聊天变量: `{爱城华恋: {好感度: 5}}`
 * await replaceVariables({神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后的聊天变量: `{神乐光: {好感度: 5, 认知度: 0}}`
 *
 * @example
 * // 删除 `{神乐光: {好感度: 5}}` 变量
 * let variables = getVariables();
 * _.unset(variables, "神乐光.好感度");
 * await replaceVariables(variables);
 */
export async function replaceVariables(
  variables: Record<string, any>,
  { type = 'chat', message_id = 'latest' }: VariableOption = {},
): Promise<void> {
  switch (type) {
    case 'message':
      if (message_id !== 'latest' && (message_id < -chat.length || message_id >= chat.length)) {
        throw Error(`提供的 message_id(${message_id}) 超出了聊天消息楼层号范围`);
      }
      message_id = message_id === 'latest' ? -1 : message_id;
      await setChatMessage({ data: variables }, message_id, { refresh: 'none' });
      return;
    case 'chat':
      (chat_metadata as { variables: Object }).variables = variables;
      await saveMetadata();
      break;
    case 'character':
      await replaceCharacterScriptVariables(variables);
      break;
    case 'global':
      extension_settings.variables.global = variables;
      await saveSettings();
      break;
  }

  console.info(`将${type == 'chat' ? `聊天` : `全局`}变量表替换为:\n${JSON.stringify(variables, undefined, 2)}`);
}

type VariablesUpdater =
  | ((variables: Record<string, any>) => Record<string, any>)
  | ((variables: Record<string, any>) => Promise<Record<string, any>>);

/**
 * 用 `updater` 函数更新变量表
 *
 * @param updater 用于更新变量表的函数. 它应该接收变量表作为参数, 并返回更新后的变量表.
 * @param option 可选选项
 *   - `type?:number|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *
 * @returns 更新后的变量表
 *
 * @example
 * // 删除 `{神乐光: {好感度: 5}}` 变量
 * await updateVariablesWith(variables => {_.unset(variables, "神乐光.好感度"); return variables;});
 *
 * @example
 * // 更新 "爱城华恋.好感度" 为原来的 2 倍, 如果该变量不存在则设置为 0
 * await updateVariablesWith(variables => _.update(variables, "爱城华恋.好感度", value => value ? value * 2 : 0));
 */
export async function updateVariablesWith(
  updater: VariablesUpdater,
  { type = 'chat', message_id = 'latest' }: VariableOption = {},
): Promise<Record<string, any>> {
  let variables = getVariables({ type, message_id });
  variables = await updater(variables);
  console.info(`对${type === 'chat' ? `聊天` : `全局`}变量表进行更新`);
  replaceVariables(variables, { type });
  return variables;
}

/**
 * 插入或修改变量值, 取决于变量是否存在.
 *
 * @param variables 要更新的变量
 *   - 如果变量不存在, 则新增该变量
 *   - 如果变量已经存在, 则修改该变量的值
 * @param option 可选选项
 *   - `type?:number|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await insertOrAssignVariables({爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后变量: `{爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}}`
 */
export async function insertOrAssignVariables(
  variables: Record<string, any>,
  { type = 'chat', message_id = 'latest' }: VariableOption = {},
): Promise<void> {
  await updateVariablesWith(old_variables => _.merge(old_variables, variables), { type, message_id });
}

/**
 * 插入新变量, 如果变量已经存在则什么也不做
 *
 * @param variables 要插入的变量
 *   - 如果变量不存在, 则新增该变量
 *   - 如果变量已经存在, 则什么也不做
 * @param option 可选选项
 *   - `type?:number|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await insertVariables({爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后变量: `{爱城华恋: {好感度: 5}, 神乐光: {好感度: 5, 认知度: 0}}`
 */
export async function insertVariables(
  variables: Record<string, any>,
  { type = 'chat', message_id = 'latest' }: VariableOption = {},
): Promise<void> {
  await updateVariablesWith(old_variables => _.defaultsDeep(old_variables, variables), { type, message_id });
}

/**
 * 删除变量, 如果变量不存在则什么也不做
 *
 * @param variable_path 要删除的变量路径
 *   - 如果变量不存在, 则什么也不做
 *   - 如果变量已经存在, 则删除该变量
 * @param option 可选选项
 *   - `type?:number|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *
 * @returns 是否成功删除变量
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await deleteVariable("爱城华恋.好感度");
 * // 执行后变量: `{爱城华恋: {}}`
 */
export async function deleteVariable(
  variable_path: string,
  { type = 'chat', message_id = 'latest' }: VariableOption = {},
): Promise<boolean> {
  let result: boolean = false;
  await updateVariablesWith(
    old_variables => {
      result = _.unset(old_variables, variable_path);
      return old_variables;
    },
    { type, message_id },
  );
  return result;
}
