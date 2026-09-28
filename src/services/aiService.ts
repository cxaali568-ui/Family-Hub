import { AIMessage } from '../types';

export interface AIChatOptions {
  role?: 'general' | 'tutor' | 'budget' | 'organizer';
  systemInstruction?: string;
}

class AIService {
  async sendMessage(
    history: AIMessage[],
    newPrompt: string,
    options?: AIChatOptions
  ): Promise<string> {
    try {
      const messagesPayload = [
        ...history.map(m => ({
          role: m.role,
          text: m.text,
        })),
        { role: 'user', text: newPrompt },
      ];

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesPayload,
          role: options?.role || 'general',
          systemInstruction: options?.systemInstruction,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      return data.reply || "I've processed your thought. How else can I assist you?";
    } catch (err) {
      console.warn("AI endpoint unreachable, using local helper response:", err);
      return this.generateLocalFallback(newPrompt, options?.role);
    }
  }

  private generateLocalFallback(prompt: string, role?: string): string {
    const lower = prompt.toLowerCase();
    if (role === 'budget' || lower.includes('budget') || lower.includes('spend')) {
      return "Here is a quick budget breakdown: To optimize your household spending, track recurring subscriptions, set a 15% discretionary cap, and verify utility bills before their monthly due date.";
    }
    if (role === 'tutor' || lower.includes('study') || lower.includes('homework')) {
      return "Let's break this study concept down step-by-step: 1) Identify the primary question, 2) Outline the core formulas or definitions, and 3) Solve with a concrete real-world example.";
    }
    if (role === 'organizer' || lower.includes('schedule') || lower.includes('plan')) {
      return "Here is a structured daily routine suggestion: Morning focus block (8-10 AM), afternoon collaborative check-in (1-2 PM), and evening family coordination buffer (6-7 PM).";
    }
    return `Thank you for asking. I'm your FamilyHub private assistant. Regarding "${prompt.slice(0, 45)}...", prioritizing family communication and clear checklists is key to smooth home coordination.`;
  }
}

export const aiService = new AIService();
