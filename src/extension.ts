import * as vscode from 'vscode';
import { CommandManager } from './commands';
import { ConfigKeys, ConfigurationManager } from './config';
import { ServerConfig } from './providers/types';

/**
 * Activates the extension and registers commands.
 */
export async function activate(context: vscode.ExtensionContext) {
  try {
    const configManager = ConfigurationManager.getInstance();

    const commandManager = new CommandManager(context);
    commandManager.registerCommands();

    context.subscriptions.push({
      dispose: () => {
        configManager.dispose();
        commandManager.dispose();
      }
    });

    const servers = configManager.getConfig<ServerConfig[]>(ConfigKeys.SERVERS, []);
    if (!servers || servers.length === 0) {
      const result = await vscode.window.showWarningMessage(
        'No AI servers configured. Would you like to configure them now?',
        'Yes',
        'No'
      );

      if (result === 'Yes') {
        await vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'ai-commit.servers'
        );
      }
    }
  } catch (error) {
    console.error('Failed to activate extension:', error);
    throw error;
  }
}

/**
 * Deactivates the extension.
 */
export function deactivate() {}
