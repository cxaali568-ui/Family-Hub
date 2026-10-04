import { AIProvider, AIRequest, AIResponse } from './types';
import { GeminiProvider } from './adapters/GeminiProvider';
import { OpenAIProvider } from './adapters/OpenAIProvider';

interface RateLimitRecord {
  timestamps: number[];
}

interface UsageLog {
  timestamp: string;
  userId?: string;
  familyId?: string;
  provider: 'gemini' | 'openai';
  model: string;
  status: 'success' | 'failed' | 'fallback';
}

export class AIService {
  private geminiProvider: GeminiProvider;
  private openAIProvider: OpenAIProvider;
  private rateLimits: Map<string, RateLimitRecord> = new Map();
  private recentUsage: UsageLog[] = [];
  private readonly maxRequestsPerMinute = 30;

  constructor() {
    this.geminiProvider = new GeminiProvider();
    this.openAIProvider = new OpenAIProvider();
  }

  getStatus() {
    const geminiOk = this.geminiProvider.isConfigured();
    const openAIOk = this.openAIProvider.isConfigured();

    let defaultProvider: 'gemini' | 'openai' | 'none' = 'none';
    if (geminiOk) defaultProvider = 'gemini';
    else if (openAIOk) defaultProvider = 'openai';

    return {
      gemini: {
        configured: geminiOk,
        name: this.geminiProvider.name,
      },
      openai: {
        configured: openAIOk,
        name: this.openAIProvider.name,
      },
      defaultProvider,
    };
  }

  /**
   * Sliding-window rate limiter per user/IP
   */
  checkRateLimit(identifier: string): void {
    const now = Date.now();
    const windowStart = now - 60000;

    let record = this.rateLimits.get(identifier);
    if (!record) {
      record = { timestamps: [] };
      this.rateLimits.set(identifier, record);
    }

    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequestsPerMinute) {
      throw new Error('Rate limit reached (30 requests/min). Please pause for a moment before sending another prompt.');
    }

    record.timestamps.push(now);
  }

  private resolveProvider(preferred?: 'gemini' | 'openai' | 'auto'): {
    primary: AIProvider;
    fallback?: AIProvider;
  } {
    const geminiOk = this.geminiProvider.isConfigured();
    const openAIOk = this.openAIProvider.isConfigured();

    if (!geminiOk && !openAIOk) {
      throw new Error(
        'AI provider is not configured yet. Please configure GEMINI_API_KEY or OPENAI_API_KEY in server environment variables.'
      );
    }

    if (preferred === 'openai') {
      if (openAIOk) {
        return { primary: this.openAIProvider, fallback: geminiOk ? this.geminiProvider : undefined };
      }
      if (geminiOk) {
        return { primary: this.geminiProvider };
      }
      throw new Error('OpenAI is not configured. Missing OPENAI_API_KEY.');
    }

    if (preferred === 'gemini') {
      if (geminiOk) {
        return { primary: this.geminiProvider, fallback: openAIOk ? this.openAIProvider : undefined };
      }
      if (openAIOk) {
        return { primary: this.openAIProvider };
      }
      throw new Error('Gemini is not configured. Missing GEMINI_API_KEY.');
    }

    // Auto mode: Prefer Gemini if available, fallback to OpenAI
    if (geminiOk) {
      return { primary: this.geminiProvider, fallback: openAIOk ? this.openAIProvider : undefined };
    }
    return { primary: this.openAIProvider };
  }

  private logUsage(log: UsageLog) {
    this.recentUsage.push(log);
    if (this.recentUsage.length > 50) {
      this.recentUsage.shift();
    }
    // Clean developer log without sensitive info or tokens
    console.log(`[AI Request] ${log.timestamp} | provider=${log.provider} | status=${log.status} | user=${log.userId || 'anon'}`);
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const identifier = request.userId || 'anonymous';
    this.checkRateLimit(identifier);

    const { primary, fallback } = this.resolveProvider(request.provider);

    try {
      const response = await primary.generateResponse(request);
      this.logUsage({
        timestamp: new Date().toISOString(),
        userId: request.userId,
        familyId: request.familyId,
        provider: response.provider,
        model: response.model,
        status: 'success',
      });
      return response;
    } catch (primaryErr: any) {
      console.warn(`[AI] Primary provider ${primary.id} failed:`, primaryErr?.message || primaryErr);

      if (fallback) {
        console.info(`[AI] Falling back to secondary provider ${fallback.id}`);
        try {
          const fallbackRes = await fallback.generateResponse(request);
          fallbackRes.fallbackUsed = true;
          this.logUsage({
            timestamp: new Date().toISOString(),
            userId: request.userId,
            familyId: request.familyId,
            provider: fallbackRes.provider,
            model: fallbackRes.model,
            status: 'fallback',
          });
          return fallbackRes;
        } catch (fallbackErr: any) {
          console.error(`[AI] Fallback provider ${fallback.id} also failed:`, fallbackErr?.message || fallbackErr);
        }
      }

      this.logUsage({
        timestamp: new Date().toISOString(),
        userId: request.userId,
        familyId: request.familyId,
        provider: primary.id,
        model: 'unknown',
        status: 'failed',
      });

      throw new Error(
        primaryErr?.message || "AI couldn't complete this request. Please try again in a moment."
      );
    }
  }

  async streamResponse(request: AIRequest, onChunk: (chunk: string) => void): Promise<AIResponse> {
    const identifier = request.userId || 'anonymous';
    this.checkRateLimit(identifier);

    const { primary, fallback } = this.resolveProvider(request.provider);

    try {
      const response = await primary.streamResponse(request, onChunk);
      this.logUsage({
        timestamp: new Date().toISOString(),
        userId: request.userId,
        familyId: request.familyId,
        provider: response.provider,
        model: response.model,
        status: 'success',
      });
      return response;
    } catch (primaryErr: any) {
      console.warn(`[AI Stream] Primary provider ${primary.id} failed:`, primaryErr?.message || primaryErr);

      if (fallback) {
        console.info(`[AI Stream] Falling back to secondary provider ${fallback.id}`);
        try {
          const fallbackRes = await fallback.streamResponse(request, onChunk);
          fallbackRes.fallbackUsed = true;
          this.logUsage({
            timestamp: new Date().toISOString(),
            userId: request.userId,
            familyId: request.familyId,
            provider: fallbackRes.provider,
            model: fallbackRes.model,
            status: 'fallback',
          });
          return fallbackRes;
        } catch (fallbackErr: any) {
          console.error(`[AI Stream] Fallback provider ${fallback.id} also failed:`, fallbackErr?.message || fallbackErr);
        }
      }

      this.logUsage({
        timestamp: new Date().toISOString(),
        userId: request.userId,
        familyId: request.familyId,
        provider: primary.id,
        model: 'unknown',
        status: 'failed',
      });

      throw new Error(
        primaryErr?.message || "AI couldn't complete this streaming request. Please try again."
      );
    }
  }

  async generateTitle(prompt: string, reply?: string, preferred?: 'gemini' | 'openai' | 'auto'): Promise<string> {
    try {
      const { primary } = this.resolveProvider(preferred);
      return await primary.generateTitle(prompt, reply);
    } catch {
      return prompt.slice(0, 30);
    }
  }

  async summarize(text: string, contextType?: string, preferred?: 'gemini' | 'openai' | 'auto'): Promise<string> {
    const { primary } = this.resolveProvider(preferred);
    return await primary.summarize(text, contextType);
  }

  async analyzeDocument(docText: string, instruction?: string, preferred?: 'gemini' | 'openai' | 'auto'): Promise<string> {
    const { primary } = this.resolveProvider(preferred);
    return await primary.analyzeDocument(docText, instruction);
  }

  async analyzeImage(imageBase64: string, mimeType: string, prompt?: string, preferred?: 'gemini' | 'openai' | 'auto'): Promise<string> {
    const { primary } = this.resolveProvider(preferred);
    return await primary.analyzeImage(imageBase64, mimeType, prompt);
  }
}

export const serverAIService = new AIService();
