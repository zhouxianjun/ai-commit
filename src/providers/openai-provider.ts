import OpenAI from 'openai';
import {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam
} from 'openai/resources';
import { AIProvider, ChatMessage, ModelConfig, ServerConfig } from './types';

export class OpenAIProvider implements AIProvider<ChatCompletion> {
  readonly type = 'openai';
  private client: OpenAI;

  constructor(private config: ServerConfig) {
    const clientConfig: {
      apiKey: string;
      baseURL?: string;
      defaultQuery?: { 'api-version': string };
      defaultHeaders?: { 'api-key': string };
    } = {
      apiKey: config.apiKey
    };

    if (config.baseURL) {
      clientConfig.baseURL = config.baseURL;
    }

    if (config.type === 'azure' && config.apiVersion) {
      clientConfig.defaultQuery = { 'api-version': config.apiVersion };
      clientConfig.defaultHeaders = { 'api-key': config.apiKey };
    }

    this.client = new OpenAI(clientConfig);
  }

  async chatCompletion(
    messages: ChatMessage[],
    modelConfig: ModelConfig,
    signal?: AbortSignal
  ): Promise<ChatCompletion> {
    const openaiMessages = messages.map(
      (msg) =>
        ({
          role: msg.role,
          content: msg.content
        }) as ChatCompletionMessageParam
    );

    const requestParams: ChatCompletionCreateParamsNonStreaming = {
      model: modelConfig.name,
      messages: openaiMessages,
      temperature: modelConfig.temperature,
      max_tokens: modelConfig.maxTokens,
      reasoning_effort: modelConfig.reasoningEffort
    };

    if (modelConfig.options) {
      Object.assign(requestParams, modelConfig.options);
    }

    return this.client.chat.completions.create(requestParams, { signal });
  }

  extractText(response: ChatCompletion): string {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }
    return content;
  }
}
