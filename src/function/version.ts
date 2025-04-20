import {
  getCurrentVersion,
  updateTavernHelper as updateTavernHelperImpl,
  VERSION_FILE_PATH,
} from '@/util/check_update';

/**
 * 获取酒馆助手版本号
 */
export async function getTavernHelperVersion(): Promise<string> {
  const currentVersion = await getCurrentVersion(VERSION_FILE_PATH);
  if (typeof currentVersion !== 'string') {
    throw new Error('获取的版本号无效');
  }
  return currentVersion;
}

/**
 * 更新酒馆助手
 */
export async function updateTavernHelper() {
  return updateTavernHelperImpl();
}
