# AGENTS.md — AI Commit VS Code Extension

This file provides guidance for agentic coding agents working in this repository.

## Project Overview

VS Code extension that generates AI-powered conventional commit messages from staged git diffs. Supports OpenAI, Azure OpenAI, and Google Gemini as AI providers with multi-server failover.

## Build / Lint / Test Commands

| Command            | Purpose                           |
| ------------------ | --------------------------------- |
| `pnpm install`     | Install dependencies              |
| `pnpm run build`   | Production build via webpack      |
| `pnpm run compile` | Dev build via webpack             |
| `pnpm run watch`   | Watch mode for development        |
| `pnpm run lint`    | ESLint on `src/` TypeScript files |
| `pnpm run package` | Create `.vsix` package (vsce)     |
| `pnpm run publish` | Publish to VS Code Marketplace    |

**Testing:** Test infrastructure is scaffolded (Mocha + `@vscode/test-electron`) but no test files currently exist. When tests are added:

```bash
pnpm run pretest        # compile-tests + compile + lint
pnpm test               # run all tests via VS Code test runner
```

To run a single test, use Mocha's `--grep` flag or pass a specific file. No single-test command is configured yet.

## Architecture

```
src/
├── extension.ts            # Entry point: activate/deactivate
├── commands.ts             # CommandManager — registers/disposes VS Code commands
├── config.ts               # ConfigurationManager singleton — reads VS Code settings
├── generate-commit-msg.ts  # Core: diff → prompt → AI → commit message
├── ai-service.ts           # Failover orchestrator: server×model retry with timeout
├── git-utils.ts            # Git diff retrieval via simple-git
├── prompts.ts              # System prompt construction
├── utils.ts                # ProgressHandler utility class
├── providers/
│   ├── types.ts            # ModelConfig, ServerConfig, AIProvider interfaces
│   ├── openai-provider.ts  # OpenAI + Azure (OpenAI-compatible) provider
│   ├── gemini-provider.ts  # Google Gemini provider
│   └── index.ts            # createProvider() factory
prompt/
├── with_gitmoji.md         # System prompt template (gitmoji mode)
└── without_gitmoji.md      # System prompt template (standard mode)
```

**Key patterns:**

- `ConfigurationManager` is a singleton for reading VS Code settings
- `CommandManager` handles VS Code command registration/disposal
- `providers/` uses interface + factory pattern for extensibility (see below)
- `ai-service.ts` builds server×model pairs and tries each in order with timeout + failover

## Adding a New AI Provider

1. Create `src/providers/xxx-provider.ts` implementing the `AIProvider` interface:
   ```typescript
   export class XxxProvider implements AIProvider {
     readonly type = 'xxx';
     constructor(private config: ServerConfig) {}
     async chatCompletion(messages: ChatMessage[], model: string, temperature: number, signal?: AbortSignal): Promise<string> { ... }
   }
   ```
2. Register in `src/providers/index.ts` — add a case in `createProvider()`
3. Add `"xxx"` to the `type` enum in `package.json` `contributes.configuration.properties.ai-commit.servers`

No changes needed to `ai-service.ts` or `generate-commit-msg.ts`.

## Code Style

### Formatting (oxfmt)

Configured in `.oxfmtrc.json`:

- **88** character line width
- **Semicolons** required
- **Single quotes** for strings
- **No trailing commas**

Scripts:

- `pnpm run fmt` — format all files
- `pnpm run fmt:check` — check formatting without modifying

VS Code extension: install `oxc.oxc-vscode` and set `"editor.defaultFormatter": "oxc.oxc-vscode"`.

### Linting (ESLint)

Configured in `.eslintrc.json`:

- `@typescript-eslint/semi`: warn — semicolons required
- `curly`: warn — always use braces for control flow
- `eqeqeq`: warn — use `===` / `!==`, never `==` / `!=`
- `no-throw-literal`: warn — always throw `Error` objects, not strings
- `@typescript-eslint/naming-convention`: **off** — no enforced naming rules

### Naming Conventions

- **Files:** kebab-case (`generate-commit-msg.ts`, `ai-service.ts`)
- **Classes:** PascalCase (`CommandManager`, `ConfigurationManager`, `OpenAIProvider`)
- **Functions/variables:** camelCase (`getDiffStaged`, `chatCompletion`)
- **Constants/enums:** UPPER_SNAKE_CASE (`ConfigKeys` enum values)
- **Private methods:** camelCase, no underscore prefix (`registerCommand`)

### Imports

```typescript
// VS Code API — always namespace import
import * as vscode from 'vscode';

// Local modules — named imports
import { CommandManager } from './commands';
import { ConfigKeys, ConfigurationManager } from './config';
import { createProvider } from './providers';

// External packages — default or named imports
import simpleGit from 'simple-git';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
```

Import order: VS Code API first, then local modules, then external packages.

### TypeScript

- `strict: false` in `tsconfig.json` — type safety is loose
- `any` is used frequently; prefer explicit types when practical
- Target: ES2020, Module: CommonJS
- Use JSDoc with `@param`, `@returns`, `@throws` on public functions

### Error Handling

1. **Catch and rethrow with logging:**

   ```typescript
   try {
     /* ... */
   } catch (error) {
     console.error('msg:', error);
     throw error;
   }
   ```

2. **Catch and return error object:**

   ```typescript
   } catch (error) { return { diff: '', error: error.message }; }
   ```

3. **User-facing errors via VS Code dialogs:**
   ```typescript
   } catch (error) { vscode.window.showErrorMessage(`Failed: ${error.message}`); }
   ```

Always throw `Error` objects (per ESLint rule). Provide descriptive error messages.

### General Guidelines

- Each concern gets its own file (config, git, AI providers, prompts, commands)
- Use the singleton pattern for shared configuration (`ConfigurationManager`)
- VS Code commands must be registered through `CommandManager` for proper disposal
- All async operations that may take time should use `ProgressHandler.withProgress()` to show VS Code progress notifications
- AI provider failover is handled in `ai-service.ts` — provider implementations should just throw on any error
