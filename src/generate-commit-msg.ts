import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { getDiffStaged } from './git-utils';
import { chatCompletion } from './ai-service';
import { getMainCommitPrompt } from './prompts';
import { ProgressHandler } from './utils';
import { ChatMessage } from './providers/types';

/**
 * Generates a chat completion prompt for the commit message based on the provided diff.
 */
const generateCommitMessageChatCompletionPrompt = async (
  diff: string,
  additionalContext?: string
): Promise<ChatMessage[]> => {
  const initMessages = await getMainCommitPrompt();
  const messages: ChatMessage[] = [...initMessages];

  if (additionalContext) {
    messages.push({
      role: 'user',
      content: `Additional context for the changes:\n${additionalContext}`
    });
  }

  messages.push({
    role: 'user',
    content: diff
  });
  return messages;
};

/**
 * Retrieves the repository associated with the provided argument.
 */
export async function getRepo(arg) {
  const gitApi = vscode.extensions.getExtension('vscode.git')?.exports.getAPI(1);
  if (!gitApi) {
    throw new Error('Git extension not found');
  }

  if (typeof arg === 'object' && arg.rootUri) {
    const resourceUri = arg.rootUri;
    const realResourcePath: string = fs.realpathSync(resourceUri!.fsPath);
    for (let i = 0; i < gitApi.repositories.length; i++) {
      const repo = gitApi.repositories[i];
      if (realResourcePath.startsWith(repo.rootUri.fsPath)) {
        return repo;
      }
    }
  }
  return gitApi.repositories[0];
}

/**
 * Generates a commit message based on the changes staged in the repository.
 */
export async function generateCommitMsg(arg) {
  return ProgressHandler.withProgress('', async (progress) => {
    const repo = await getRepo(arg);

    progress.report({ message: 'Getting staged changes...' });
    const { diff, error } = await getDiffStaged(repo);

    if (error) {
      throw new Error(`Failed to get staged changes: ${error}`);
    }

    if (!diff || diff === 'No changes staged.') {
      throw new Error('No changes staged for commit');
    }

    const scmInputBox = repo.inputBox;
    if (!scmInputBox) {
      throw new Error('Unable to find the SCM input box');
    }

    const additionalContext = scmInputBox.value.trim();

    progress.report({
      message: additionalContext
        ? 'Analyzing changes with additional context...'
        : 'Analyzing changes...'
    });
    const messages = await generateCommitMessageChatCompletionPrompt(
      diff,
      additionalContext
    );

    progress.report({
      message: additionalContext
        ? 'Generating commit message with additional context...'
        : 'Generating commit message...'
    });

    const commitMessage = await chatCompletion(messages);

    if (commitMessage) {
      scmInputBox.value = commitMessage;
    } else {
      throw new Error('Failed to generate commit message');
    }
  });
}
