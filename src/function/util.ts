import { substituteParamsExtended } from '@sillytavern/script';

export function substitudeMacros(text: string): string {
  const text_demacroed = substituteParamsExtended(text);

  console.info(`替换字符串中的宏, 字符串: '${text}', 结果: '${text_demacroed}'`);
  return text_demacroed;
}

export function getLastMessageId(): number {
  const result = substitudeMacros('{{lastMessageId}}');
  if (result === '') {
    throw Error('未找到任何消息楼层');
  }
  return parseInt(result);
}

export function errorCatched<T extends any[], U>(fn: (...args: T) => U): (...args: T) => U {
  const onError = (error: Error) => {
    toastr.error(`${error.stack ? error.stack : error.name + ': ' + error.message}`);
    throw error;
  };
  return (...args: T): U => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch(error => {
          onError(error);
        }) as U;
      }
      return result;
    } catch (error) {
      return onError(error as Error);
    }
  };
}
