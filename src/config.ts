import * as vscode from 'vscode';

export enum ConfigKeys {
  SERVERS = 'servers',
  TIMEOUT = 'timeout',
  TEMPERATURE = 'temperature',
  MAX_TOKENS = 'maxTokens',
  REASONING_EFFORT = 'reasoningEffort',
  AI_COMMIT_LANGUAGE = 'AI_COMMIT_LANGUAGE',
  SYSTEM_PROMPT = 'AI_COMMIT_SYSTEM_PROMPT',
  USE_GITMOJI = 'USE_GITMOJI'
}

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private configCache: Map<string, any> = new Map();
  private disposable: vscode.Disposable;

  private constructor() {
    this.disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('ai-commit')) {
        this.configCache.clear();
      }
    });
  }

  static getInstance(): ConfigurationManager {
    if (!this.instance) {
      this.instance = new ConfigurationManager();
    }
    return this.instance;
  }

  getConfig<T>(key: string, defaultValue?: T): T {
    if (!this.configCache.has(key)) {
      const config = vscode.workspace.getConfiguration('ai-commit');
      this.configCache.set(key, config.get<T>(key, defaultValue));
    }
    return this.configCache.get(key);
  }

  dispose() {
    this.disposable.dispose();
  }
}
