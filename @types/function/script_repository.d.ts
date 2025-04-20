/**
 * 获取脚本库局部变量
 * @returns 局部变量
 */
function getCharacterScriptVariables(): Record<string, any>;

/**
 * 替换角色脚本变量
 * @param variables 变量
 */
async function replaceCharacterScriptVariables(variables: Record<string, any>): Promise<void>;
