import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { serverAIService } from './server/ai/AIService';

dotenv.config();

// Remove bad dummy "1" environment overrides injected into the process
const badFirebaseKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_FIRESTORE_DATABASE_ID',
];
for (const key of badFirebaseKeys) {
  if (process.env[key] === '1') {
    delete process.env[key];
  }
}

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

interface AuthUser {
  uid: string;
  email?: string;
}

const tokenCache = new Map<string, { user: AuthUser; expiresAt: number }>();

async function verifyAuth(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    let firebaseApiKey = '';
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      firebaseApiKey = config.apiKey || '';
    } catch {
      // fallback
    }

    if (!firebaseApiKey) {
      return { uid: 'auth-user', email: 'user@example.com' };
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: any = await response.json();
    const user = data.users?.[0];
    if (!user || !user.localId) {
      return null;
    }

    const authUser: AuthUser = {
      uid: user.localId,
      email: user.email,
    };

    tokenCache.set(token, { user: authUser, expiresAt: Date.now() + 10 * 60 * 1000 });
    return authUser;
  } catch (err) {
    console.warn('[Auth] Token verification network error:', err);
    return null;
  }
}

// ----------------------------------------------------
// AI Provider Status API (Safe: reveals NO keys or secrets)
// ----------------------------------------------------
app.get('/api/ai/status', (_req: Request, res: Response) => {
  res.json(serverAIService.getStatus());
});

// ----------------------------------------------------
// AI Chat Endpoint (Non-streaming)
// ----------------------------------------------------
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuth(req);
    const userId = authUser?.uid || (req.headers['x-client-id'] as string) || req.ip || 'anon';

    const {
      messages,
      prompt,
      role = 'general',
      systemInstruction,
      contextItems,
      provider,
      familyId,
    } = req.body;

    let roleInstruction = systemInstruction;
    if (!roleInstruction) {
      if (role === 'tutor') {
        roleInstruction = 'You are an encouraging, clear academic tutor helping with school homework, study guides, and explanations.';
      } else if (role === 'budget') {
        roleInstruction = 'You are a sensible household financial planner helping calculate expenses, budget groceries, and find savings.';
      } else if (role === 'organizer') {
        roleInstruction = 'You are an executive family coordinator helping organize schedules, packing checklists, and chore rosters.';
      } else {
        roleInstruction = 'You are a warm, helpful, and organized Family + Personal Assistant in FamilyHub.';
      }
    }

    const response = await serverAIService.generateResponse({
      messages,
      prompt,
      systemInstruction: roleInstruction,
      contextItems,
      provider,
      userId,
      familyId,
    });

    return res.json({
      reply: response.text,
      provider: response.provider,
      model: response.model,
      tokenUsage: response.tokenUsage,
      fallbackUsed: response.fallbackUsed,
    });
  } catch (error: any) {
    console.error('[AI Chat] Request failed:', error?.message || error);
    return res.status(500).json({
      error: error?.message || "AI couldn't complete this request. Please try again.",
      reply: error?.message?.includes('not configured')
        ? 'AI provider is not configured yet. Please ensure GEMINI_API_KEY or OPENAI_API_KEY is configured on the server.'
        : "AI couldn't complete this request. Please try again in a moment.",
    });
  }
});

// ----------------------------------------------------
// AI Streaming Endpoint (Server-Sent Events)
// ----------------------------------------------------
app.post('/api/ai/stream', async (req: Request, res: Response) => {
  try {
    const authUser = await verifyAuth(req);
    const userId = authUser?.uid || (req.headers['x-client-id'] as string) || req.ip || 'anon';

    const {
      messages,
      prompt,
      role = 'general',
      systemInstruction,
      contextItems,
      provider,
      familyId,
    } = req.body;

    // Setup SSE response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    let roleInstruction = systemInstruction;
    if (!roleInstruction) {
      if (role === 'tutor') {
        roleInstruction = 'You are an encouraging, clear academic tutor helping with school homework, study guides, and explanations.';
      } else if (role === 'budget') {
        roleInstruction = 'You are a sensible household financial planner helping calculate expenses, budget groceries, and find savings.';
      } else if (role === 'organizer') {
        roleInstruction = 'You are an executive family coordinator helping organize schedules, packing checklists, and chore rosters.';
      } else {
        roleInstruction = 'You are a warm, helpful, and organized Family + Personal Assistant in FamilyHub.';
      }
    }

    const response = await serverAIService.streamResponse(
      {
        messages,
        prompt,
        systemInstruction: roleInstruction,
        contextItems,
        provider,
        userId,
        familyId,
      },
      (chunk: string) => {
        if (!clientDisconnected) {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      }
    );

    if (!clientDisconnected) {
      res.write(
        `data: ${JSON.stringify({
          done: true,
          provider: response.provider,
          model: response.model,
          fallbackUsed: response.fallbackUsed,
        })}\n\n`
      );
      res.end();
    }
  } catch (error: any) {
    console.error('[AI Stream] Failed:', error?.message || error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error?.message || 'Streaming failed' });
    }
    res.write(
      `data: ${JSON.stringify({
        error: error?.message || "AI couldn't complete this request. Please try again.",
      })}\n\n`
    );
    res.end();
  }
});

// ----------------------------------------------------
// AI Title Generation Endpoint
// ----------------------------------------------------
app.post('/api/ai/title', async (req: Request, res: Response) => {
  try {
    const { prompt, reply, provider } = req.body;
    if (!prompt) {
      return res.json({ title: 'New Conversation' });
    }
    const title = await serverAIService.generateTitle(prompt, reply, provider);
    return res.json({ title });
  } catch (error: any) {
    return res.json({ title: (req.body.prompt || 'New Conversation').slice(0, 30) });
  }
});

// ----------------------------------------------------
// AI Document Analysis Endpoint
// ----------------------------------------------------
app.post('/api/ai/document', async (req: Request, res: Response) => {
  try {
    const { docText, instruction, provider } = req.body;
    if (!docText) {
      return res.status(400).json({ error: 'Missing docText' });
    }
    const summary = await serverAIService.analyzeDocument(docText, instruction, provider);
    return res.json({ summary });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to analyze document',
    });
  }
});

// ----------------------------------------------------
// AI Image Analysis Endpoint
// ----------------------------------------------------
app.post('/api/ai/image', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, prompt, provider } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }
    const analysis = await serverAIService.analyzeImage(imageBase64, mimeType, prompt, provider);
    return res.json({ analysis });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to analyze image',
    });
  }
});

// ----------------------------------------------------
// Health check API
// ----------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'FamilyHub',
    aiStatus: serverAIService.getStatus(),
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
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
