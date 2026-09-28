import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Server-side Gemini AI chat endpoint
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { messages, role = 'general', prompt, systemInstruction } = req.body;

    if (!aiClient) {
      // Graceful fallback if no API key configured in dev environment
      return res.json({
        reply: "I am your FamilyHub AI Assistant. To enable live Gemini responses, ensure your GEMINI_API_KEY is configured in your project secrets.",
        fallback: true
      });
    }

    let defaultSystemInstruction = "You are a warm, helpful, and organized Family + Personal Assistant in FamilyHub. " +
      "Help the family or individual user plan meals, organize schedules, manage budgets, draft friendly messages, or answer homework/work questions. " +
      "Keep answers concise, clear, and empathetic.";

    if (role === 'tutor') {
      defaultSystemInstruction = "You are an encouraging, clear academic tutor helping with school homework, study guides, and explanations.";
    } else if (role === 'budget') {
      defaultSystemInstruction = "You are a sensible household financial planner helping calculate expenses, budget groceries, and find savings.";
    } else if (role === 'organizer') {
      defaultSystemInstruction = "You are an executive family coordinator helping organize schedules, packing checklists, and chore rosters.";
    }

    const instruction = systemInstruction || defaultSystemInstruction;

    // Format chat contents
    let contents: any[] = [];
    if (Array.isArray(messages) && messages.length > 0) {
      contents = messages.map((m: { role: string; content?: string; text?: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text || m.content || '' }]
      }));
    } else if (prompt) {
      contents = [{ role: 'user', parts: [{ text: prompt }] }];
    } else {
      return res.status(400).json({ error: "Missing messages or prompt" });
    }

    // gemini-3.8-flash is the recommended default
    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: instruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || "I couldn't generate a response. Please try again.";
    return res.json({ reply: replyText });
  } catch (error: any) {
    console.error("Gemini API Error in server.ts:", error);
    return res.status(500).json({
      error: error?.message || "Internal server error contacting AI model",
      reply: "Sorry, I had trouble reaching the AI service right now. Please try again in a moment."
    });
  }
});

// Health check API
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', app: 'FamilyHub', timestamp: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`FamilyHub server is running on http://0.0.0.0:${port}`);
  });
}

startServer();
