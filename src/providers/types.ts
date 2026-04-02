import type { ReasoningEffort } from 'openai/resources';

export interface ModelConfig {
  name: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: ReasoningEffort;
  options?: Record<string, unknown>;
}

export interface ServerConfig {
  type: 'openai' | 'gemini' | 'azure';
  baseURL?: string;
  apiKey: string;
  apiVersion?: string;
  timeout?: number;
  models: ModelConfig[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProvider<T = unknown> {
  type: string;
  chatCompletion(messages: ChatMessage[], modelConfig: ModelConfig, signal?: AbortSignal): Promise<T>;
  extractText(response: T): string;
  beforeChatCompletion?: (messages: ChatMessage[], modelConfig: ModelConfig) => ChatMessage[];
  afterChatCompletion?: (response: T, modelConfig: ModelConfig) => void;
}
