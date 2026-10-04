export interface ChatMessage {
  role: 'user' | 'model' | 'assistant' | 'system';
  content?: string;
  text?: string;
}

export interface AIContextItem {
  type: string;
  title: string;
  content: string;
}

export interface AIRequest {
  messages?: ChatMessage[];
  prompt?: string;
  systemInstruction?: string;
  contextItems?: AIContextItem[];
  temperature?: number;
  provider?: 'gemini' | 'openai' | 'auto';
  model?: string;
  userId?: string;
  familyId?: string;
}

export interface AIResponse {
  text: string;
  provider: 'gemini' | 'openai';
  model: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  fallbackUsed?: boolean;
}

export interface AIProvider {
  readonly id: 'gemini' | 'openai';
  readonly name: string;
  isConfigured(): boolean;
  generateResponse(request: AIRequest): Promise<AIResponse>;
  streamResponse(request: AIRequest, onChunk: (chunk: string) => void): Promise<AIResponse>;
  generateTitle(prompt: string, reply?: string): Promise<string>;
  summarize(text: string, contextType?: string): Promise<string>;
  analyzeDocument(docText: string, instruction?: string): Promise<string>;
  analyzeImage(imageBase64: string, mimeType: string, prompt?: string): Promise<string>;
}
