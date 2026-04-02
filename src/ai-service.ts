import { ConfigurationManager, ConfigKeys } from './config';
import { createProvider } from './providers';
import { AIProvider, ChatMessage, ServerConfig, ModelConfig } from './providers/types';

interface ServerModelPair {
  provider: AIProvider<unknown>;
  modelConfig: ModelConfig;
  timeout: number;
  label: string;
}

export function buildServerModelPairs(): ServerModelPair[] {
  const configManager = ConfigurationManager.getInstance();
  const servers = configManager.getConfig<ServerConfig[]>(
    ConfigKeys.SERVERS,
    []
  );
  const globalTimeout = configManager.getConfig<number>(ConfigKeys.TIMEOUT, 60000);
  const globalTemperature = configManager.getConfig<number>(ConfigKeys.TEMPERATURE, 0.7);
  const globalMaxTokens = configManager.getConfig<number | undefined>(ConfigKeys.MAX_TOKENS);
  const globalReasoningEffort = configManager.getConfig<ServerConfig['models'][number]['reasoningEffort']>(ConfigKeys.REASONING_EFFORT, 'low');

  const pairs: ServerModelPair[] = [];

  for (const server of servers) {
    const provider = createProvider(server);
    for (const model of server.models) {
      const resolvedConfig: ModelConfig = {
        name: model.name,
        temperature: model.temperature ?? globalTemperature,
        maxTokens: parseMaxToken(model.maxTokens) ?? parseMaxToken(globalMaxTokens),
        reasoningEffort: model.reasoningEffort ?? globalReasoningEffort,
        options: model.options
      };

      pairs.push({
        provider,
        modelConfig: resolvedConfig,
        timeout: server.timeout ?? globalTimeout,
        label: `${server.type}:${model.name} (${server.baseURL || 'default'})`
      });
    }
  }

  return pairs;
}

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const pairs = buildServerModelPairs();

  if (pairs.length === 0) {
    throw new Error(
      'No AI servers configured. Please configure at least one server in ai-commit.servers.'
    );
  }

  const errors: string[] = [];

  for (const pair of pairs) {
    let rawResponse: unknown;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), pair.timeout);

      const processMessages = pair.provider.beforeChatCompletion?.(messages, pair.modelConfig) ?? messages;
      rawResponse = await pair.provider.chatCompletion(
        processMessages,
        pair.modelConfig,
        controller.signal
      );
      clearTimeout(timer);
      pair.provider.afterChatCompletion?.(rawResponse, pair.modelConfig);

      return pair.provider.extractText(rawResponse);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[AI Commit] Error from ${pair.label}:`, {
        error: errorMsg,
        rawResponse
      });
      errors.push(`[${pair.label}] ${errorMsg}`);
    }
  }

  throw new Error(
    `All ${pairs.length} server(s) failed:\n${errors.join('\n')}`
  );
}

const parseMaxToken = (maxToken?: number) => maxToken && maxToken > 0 ? maxToken : undefined;
