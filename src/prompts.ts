import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigKeys, ConfigurationManager } from './config';
import { ChatMessage } from './providers/types';

const PROMPT_DIR = path.join(__dirname, '..', 'prompt');

function loadPromptTemplate(fileName: string): string {
  const filePath = path.join(PROMPT_DIR, fileName);
  return fs.readFileSync(filePath, 'utf-8');
}

function buildPrompt(language: string, useGitmoji: boolean): string {
  const customPrompt = ConfigurationManager.getInstance().getConfig<string>(ConfigKeys.SYSTEM_PROMPT);
  if (customPrompt) {
    return customPrompt;
  }

  const template = loadPromptTemplate(useGitmoji ? 'with_gitmoji.md' : 'without_gitmoji.md');
  return template.replace(/\$\{language\}/g, language);
}

export const getMainCommitPrompt = async (): Promise<ChatMessage[]> => {
  const configManager = ConfigurationManager.getInstance();
  const language = configManager.getConfig<string>(ConfigKeys.AI_COMMIT_LANGUAGE, 'English');
  const useGitmoji = configManager.getConfig<boolean>(ConfigKeys.USE_GITMOJI, true);

  return [{
    role: 'system',
    content: buildPrompt(language, useGitmoji)
  }];
};
