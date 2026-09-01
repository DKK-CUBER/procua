import { z } from 'zod';

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callOllamaChat<T>(params: {
  messages: OllamaChatMessage[];
  schema?: z.ZodType<T>;
  temperature?: number;
  timeoutMs?: number;
}): Promise<{ success: boolean; data?: T; rawText: string; error?: string }> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const model = process.env.OLLAMA_MODEL || 'gemma3:latest';
  const timeoutMs = params.timeoutMs || 25000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        stream: false,
        format: 'json',
        options: {
          temperature: params.temperature ?? 0.2
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        rawText: '',
        error: `Ollama error (${response.status}): ${response.statusText}`
      };
    }

    const json = await response.json();
    const rawText = json?.message?.content || '';

    if (params.schema) {
      try {
        const parsed = JSON.parse(rawText);
        const validated = params.schema.parse(parsed);
        return {
          success: true,
          data: validated,
          rawText
        };
      } catch (validationErr: any) {
        // Attempt relaxed JSON extraction if wrapped in markdown
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          const validated = params.schema.parse(parsed);
          return { success: true, data: validated, rawText };
        }
        return {
          success: false,
          rawText,
          error: `JSON schema validation failed: ${validationErr.message}`
        };
      }
    }

    return {
      success: true,
      rawText
    };
  } catch (err: any) {
    return {
      success: false,
      rawText: '',
      error: `Local Ollama connection failed: ${err.message}`
    };
  }
}
