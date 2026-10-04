import { AIMessage } from '../types';
import { auth } from '../lib/firebase';

export interface AIContextPayload {
  type: string;
  title: string;
  content: string;
}

export interface AIChatOptions {
  role?: 'general' | 'tutor' | 'budget' | 'organizer';
  systemInstruction?: string;
  contextItems?: AIContextPayload[];
  provider?: 'gemini' | 'openai' | 'auto';
  familyId?: string;
  signal?: AbortSignal;
}

export interface ProviderStatus {
  gemini: { configured: boolean; name: string };
  openai: { configured: boolean; name: string };
  defaultProvider: 'gemini' | 'openai' | 'none';
}

class AIService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch (err) {
      console.warn('[AIService] Unable to acquire ID token:', err);
    }

    return headers;
  }

  async getStatus(): Promise<ProviderStatus> {
    try {
      const res = await fetch('/api/ai/status');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return {
      gemini: { configured: false, name: 'Gemini' },
      openai: { configured: false, name: 'OpenAI' },
      defaultProvider: 'none',
    };
  }

  async sendMessage(
    history: AIMessage[],
    newPrompt: string,
    options?: AIChatOptions
  ): Promise<{
    reply: string;
    provider?: 'gemini' | 'openai';
    model?: string;
    fallbackUsed?: boolean;
  }> {
    const headers = await this.getAuthHeaders();

    const messagesPayload = [
      ...history.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text || m.content || '',
      })),
      { role: 'user', text: newPrompt },
    ];

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers,
      signal: options?.signal,
      body: JSON.stringify({
        messages: messagesPayload,
        role: options?.role || 'general',
        systemInstruction: options?.systemInstruction,
        contextItems: options?.contextItems,
        provider: options?.provider || 'auto',
        familyId: options?.familyId,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `AI service returned HTTP ${res.status}`);
    }

    return {
      reply: data.reply || "I've processed your thought. How else can I assist you?",
      provider: data.provider,
      model: data.model,
      fallbackUsed: data.fallbackUsed,
    };
  }

  async streamMessage(
    history: AIMessage[],
    newPrompt: string,
    onChunk: (chunk: string) => void,
    options?: AIChatOptions
  ): Promise<{
    provider?: 'gemini' | 'openai';
    model?: string;
    fallbackUsed?: boolean;
  }> {
    const headers = await this.getAuthHeaders();

    const messagesPayload = [
      ...history.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text || m.content || '',
      })),
      { role: 'user', text: newPrompt },
    ];

    const res = await fetch('/api/ai/stream', {
      method: 'POST',
      headers,
      signal: options?.signal,
      body: JSON.stringify({
        messages: messagesPayload,
        role: options?.role || 'general',
        systemInstruction: options?.systemInstruction,
        contextItems: options?.contextItems,
        provider: options?.provider || 'auto',
        familyId: options?.familyId,
      }),
    });

    if (!res.ok || !res.body) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Streaming failed with status ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamMeta: { provider?: 'gemini' | 'openai'; model?: string; fallbackUsed?: boolean } = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        try {
          const payload = JSON.parse(trimmed.slice(6));
          if (payload.chunk) {
            onChunk(payload.chunk);
          }
          if (payload.error) {
            throw new Error(payload.error);
          }
          if (payload.done) {
            streamMeta = {
              provider: payload.provider,
              model: payload.model,
              fallbackUsed: payload.fallbackUsed,
            };
          }
        } catch (e: any) {
          if (e.message && !e.message.includes('JSON')) {
            throw e;
          }
        }
      }
    }

    return streamMeta;
  }

  async generateTitle(prompt: string, reply?: string, provider?: 'gemini' | 'openai' | 'auto'): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/ai/title', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, reply, provider }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.title || prompt.slice(0, 30);
      }
    } catch {
      // fallback
    }
    return prompt.slice(0, 30);
  }

  async summarizeDocument(docText: string, instruction?: string, provider?: 'gemini' | 'openai' | 'auto'): Promise<string> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/ai/document', {
      method: 'POST',
      headers,
      body: JSON.stringify({ docText, instruction, provider }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to analyze document');
    }
    return data.summary || 'Summary unavailable.';
  }

  async analyzeImage(
    imageBase64: string,
    mimeType: string,
    prompt?: string,
    provider?: 'gemini' | 'openai' | 'auto'
  ): Promise<string> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/ai/image', {
      method: 'POST',
      headers,
      body: JSON.stringify({ imageBase64, mimeType, prompt, provider }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to analyze image');
    }
    return data.analysis || 'Image analysis unavailable.';
  }
}

export const aiService = new AIService();
