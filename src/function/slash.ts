import { executeSlashCommandsWithOptions } from '@sillytavern/scripts/slash-commands';

import log from 'loglevel';

export async function triggerSlash(command: string): Promise<string> {
  const result = await executeSlashCommandsWithOptions(command);
  if (result.isError) {
    throw Error(`Error running Slash command '${command}': ${result.errorMessage}`);
  }

  log.info(`Running Slash command: ${command}`);
  return result.pipe;
}
