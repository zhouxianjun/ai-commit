import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';
import { AIProvider, ChatMessage, ModelConfig, ServerConfig } from './types';

export class GeminiProvider implements AIProvider<GenerateContentResult> {
  readonly type = 'gemini';
  private client: GoogleGenerativeAI;

  beforeChatCompletion?: (messages: ChatMessage[], modelConfig: ModelConfig) => ChatMessage[];
  afterChatCompletion?: (response: GenerateContentResult, modelConfig: ModelConfig) => void;

  constructor(private config: ServerConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async chatCompletion(
    messages: ChatMessage[],
    modelConfig: ModelConfig,
    signal?: AbortSignal
  ): Promise<GenerateContentResult> {
    const generationConfig: {
      temperature: number;
      thinkingConfig: { thinkingBudget: number };
      maxOutputTokens?: number;
    } = {
      temperature: modelConfig.temperature,
      thinkingConfig: { thinkingBudget: 0 }
    };
    if (modelConfig.maxTokens) {
      generationConfig.maxOutputTokens = modelConfig.maxTokens;
    }

    const model = this.client.getGenerativeModel({ model: modelConfig.name });
    const contents = messages.map((msg) => msg.content);

    const chat = model.startChat({ generationConfig });
    const sendPromise = chat.sendMessage(contents);

    return signal ? this.withAbort(sendPromise, signal) : sendPromise;
  }

  extractText(response: GenerateContentResult): string {
    const text = response.response.text();
    if (!text) {
      throw new Error('Gemini returned empty response');
    }
    return text;
  }

  private withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error('Request aborted'));
        return;
      }

      const onAbort = () => {
        reject(new Error('Request timeout'));
      };
      signal.addEventListener('abort', onAbort, { once: true });

      promise.then(
        (value) => {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        (err) => {
          signal.removeEventListener('abort', onAbort);
          reject(err);
        }
      );
    });
  }
}
