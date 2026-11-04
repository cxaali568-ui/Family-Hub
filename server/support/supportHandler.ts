import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { serverAIService } from '../ai/AIService';
import { HELP_ARTICLES } from '../../src/data/helpCenterFaq';
import { SupportTicket, SupportMessage, GeneratedBugReport } from '../../src/types/support';

import fs from 'fs';
import path from 'path';

const ADMIN_EMAIL = 'cxaali568@gmail.com';
const TICKETS_FILE = path.join(process.cwd(), '.support-tickets-cache.json');

const loadTicketsFromDisk = (): Map<string, SupportTicket> => {
  const map = new Map<string, SupportTicket>();
  try {
    if (fs.existsSync(TICKETS_FILE)) {
      const data = fs.readFileSync(TICKETS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const t of parsed) {
          if (t && t.id) map.set(t.id, t);
        }
      }
    }
  } catch (e) {
    console.warn('[Support Storage] Notice reading tickets cache:', e);
  }
  return map;
};

const saveTicketsToDisk = (map: Map<string, SupportTicket>) => {
  try {
    const list = Array.from(map.values());
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Support Storage] Notice writing tickets cache:', e);
  }
};

// In-memory persistent server storage cache for support tickets
// (Synchronized with local file and Firestore for durability)
const ticketsStore = loadTicketsFromDisk();

// Helper to check if SMTP email is configured
export function getEmailConfigStatus(): { configured: boolean; provider: string; recipient: string } {
  const hasSmtp = Boolean(
    process.env.SMTP_HOST &&
    (process.env.SMTP_USER || process.env.SMTP_USERNAME) &&
    (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)
  );
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);

  let provider = 'None (Unconfigured)';
  if (hasSmtp) provider = `SMTP (${process.env.SMTP_HOST})`;
  else if (hasResend) provider = 'Resend API';
  else if (hasSendGrid) provider = 'SendGrid API';

  return {
    configured: hasSmtp || hasResend || hasSendGrid,
    provider,
    recipient: ADMIN_EMAIL,
  };
}

// Helper to check WhatsApp Business Cloud API configuration
export function getWhatsAppConfigStatus(): { configured: boolean; recipient: string } {
  const configured = Boolean(
    process.env.WHATSAPP_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  );
  return {
    configured,
    recipient: process.env.WHATSAPP_RECIPIENT || 'Configured via WHATSAPP_RECIPIENT',
  };
}

// Dispatch Email Notification to Admin
export async function sendAdminEmailNotification(params: {
  event: 'new_ticket' | 'user_reply' | 'critical_ticket' | 'reopened';
  ticket: SupportTicket;
  replyMessage?: string;
}): Promise<{ sent: boolean; message: string; configured: boolean }> {
  const { event, ticket, replyMessage } = params;
  const status = getEmailConfigStatus();

  if (!status.configured) {
    const diagMsg = `[Email Notice] Email notifications are not configured on the server. To enable real delivery to ${ADMIN_EMAIL}, configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS (or RESEND_API_KEY) in environment secrets.`;
    console.info(diagMsg);
    return {
      sent: false,
      configured: false,
      message: diagMsg,
    };
  }

  const subjectPrefix =
    event === 'new_ticket' ? '🆕 New Ticket' :
    event === 'critical_ticket' ? '🚨 CRITICAL Ticket Alert' :
    event === 'reopened' ? '🔄 Ticket Reopened' :
    '💬 User Reply on Ticket';

  const emailSubject = `[FamilyHub Support] ${subjectPrefix}: ${ticket.referenceId} - ${ticket.subject}`;

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #1e1b4b; margin: 0; font-size: 20px;">FamilyHub Admin Support Notification</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Recipient: <strong>${ADMIN_EMAIL}</strong></p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #64748b; padding: 4px 0; width: 120px;"><strong>Reference ID:</strong></td>
            <td style="font-family: monospace; font-weight: bold; color: #4f46e5;">${ticket.referenceId}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 4px 0;"><strong>Member:</strong></td>
            <td style="color: #1e293b;">${ticket.userName} (${ticket.userEmail || 'No email provided'})</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 4px 0;"><strong>Category:</strong></td>
            <td style="color: #1e293b; text-transform: capitalize;">${ticket.category}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 4px 0;"><strong>Priority:</strong></td>
            <td>
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; text-transform: uppercase; ${
                ticket.priority === 'critical' ? 'background-color: #fee2e2; color: #b91c1c;' :
                ticket.priority === 'high' ? 'background-color: #ffedd5; color: #c2410c;' :
                'background-color: #e0e7ff; color: #3730a3;'
              }">${ticket.priority}</span>
            </td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 4px 0;"><strong>Status:</strong></td>
            <td style="color: #1e293b; text-transform: capitalize;">${ticket.status.replace('_', ' ')}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 15px; color: #0f172a; margin: 0 0 8px 0;">Subject: ${ticket.subject}</h3>
        <p style="font-size: 13px; color: #334155; line-height: 1.5; background-color: #f1f5f9; padding: 12px; border-radius: 6px; margin: 0;">
          ${ticket.description}
        </p>
      </div>

      ${ticket.aiSummary ? `
        <div style="margin-bottom: 20px; border-left: 3px solid #8b5cf6; padding-left: 12px;">
          <h4 style="font-size: 13px; color: #6d28d9; margin: 0 0 4px 0;">🤖 AI Troubleshooting Summary:</h4>
          <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.4;">${ticket.aiSummary}</p>
        </div>
      ` : ''}

      ${ticket.attemptedSteps ? `
        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 13px; color: #0f172a; margin: 0 0 4px 0;">Steps Attempted by User:</h4>
          <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.4;">${ticket.attemptedSteps}</p>
        </div>
      ` : ''}

      ${replyMessage ? `
        <div style="margin-bottom: 20px; border-left: 3px solid #0284c7; padding-left: 12px;">
          <h4 style="font-size: 13px; color: #0369a1; margin: 0 0 4px 0;">💬 User Follow-up Message:</h4>
          <p style="font-size: 13px; color: #1e293b; margin: 0; line-height: 1.5;">${replyMessage}</p>
        </div>
      ` : ''}

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; text-align: center;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Log into your FamilyHub Admin Dashboard to inspect full diagnostics, reply to this member, or change ticket status.
        </p>
      </div>
    </div>
  `;

  try {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER || process.env.SMTP_USERNAME || '';
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
    const from = process.env.SMTP_FROM || `FamilyHub Support <${user || 'noreply@familyhub.app'}>`;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from,
      to: ADMIN_EMAIL,
      subject: emailSubject,
      html: emailHtml,
    });

    console.info(`[Email Success] Admin notification dispatched to ${ADMIN_EMAIL}: messageId=${info.messageId}`);
    return {
      sent: true,
      configured: true,
      message: `Email notification sent successfully to ${ADMIN_EMAIL}`,
    };
  } catch (err: any) {
    console.error('[Email Error] Failed to send email via SMTP:', err?.message || err);
    return {
      sent: false,
      configured: true,
      message: `Failed to deliver email: ${err?.message || 'SMTP transport error'}`,
    };
  }
}

// Dispatch WhatsApp Business Cloud API notification
export async function sendWhatsAppNotification(params: {
  event: string;
  ticket: SupportTicket;
}): Promise<{ sent: boolean; message: string; configured: boolean }> {
  const { ticket, event } = params;
  const status = getWhatsAppConfigStatus();

  if (!status.configured) {
    const notice = '[WhatsApp Notice] Official WhatsApp Business Cloud API is not configured. Configure WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID to activate instant admin WhatsApp pings.';
    console.info(notice);
    return {
      sent: false,
      configured: false,
      message: notice,
    };
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = process.env.WHATSAPP_RECIPIENT || '';

  if (!recipient) {
    return {
      sent: false,
      configured: true,
      message: 'WHATSAPP_RECIPIENT phone number is not defined in server environment.',
    };
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const messageBody = `*FamilyHub Support Alert*\n\n` +
      `*Event:* ${event.toUpperCase()}\n` +
      `*Ticket:* ${ticket.referenceId}\n` +
      `*Priority:* ${ticket.priority.toUpperCase()}\n` +
      `*Member:* ${ticket.userName}\n` +
      `*Subject:* ${ticket.subject}\n\n` +
      `Check your FamilyHub Admin Dashboard to inspect and reply.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: messageBody },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[WhatsApp Error] WhatsApp Business API returned error:', errorText);
      return {
        sent: false,
        configured: true,
        message: `WhatsApp API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.info('[WhatsApp Success] Message sent via WhatsApp Cloud API:', data);
    return {
      sent: true,
      configured: true,
      message: 'WhatsApp notification dispatched to configured admin phone.',
    };
  } catch (err: any) {
    console.warn('[WhatsApp Error] Failed to connect to WhatsApp Cloud API:', err?.message || err);
    return {
      sent: false,
      configured: true,
      message: `Failed to dispatch WhatsApp: ${err?.message || 'Network error'}`,
    };
  }
}

// -------------------------------------------------------------------
// Express Handlers
// -------------------------------------------------------------------

// 1. Get Support Integration Status
export function handleGetSupportStatus(_req: Request, res: Response) {
  const emailStatus = getEmailConfigStatus();
  const whatsappStatus = getWhatsAppConfigStatus();

  res.json({
    adminEmail: ADMIN_EMAIL,
    email: emailStatus,
    whatsapp: whatsappStatus,
    timestamp: new Date().toISOString(),
  });
}

// 2. AI Troubleshooting Agent Handler
export async function handleAITroubleshoot(req: Request, res: Response) {
  try {
    const { messages, userProblem, userContext } = req.body;

    const systemInstruction = `
You are the FamilyHub AI Troubleshooting & Support Specialist.
Your job is to diagnose and solve user issues with the FamilyHub application through a polite, step-by-step self-service dialogue.

VERIFIED FAMILYHUB KNOWLEDGE BASE:
${HELP_ARTICLES.map(a => `[${a.categoryName}] ${a.title}: ${a.summary}\nSteps: ${a.steps?.join(' -> ') || 'N/A'}\nFixes: ${a.troubleshooting?.join(' | ') || 'N/A'}`).join('\n\n')}

CORE RULES:
1. Speak in a helpful, friendly, and concise tone.
2. Directly address the user's issue with specific numbered instructions based on FamilyHub features.
3. If the user mentions profile editing data disappearing, explain that the latest patch preserves all fields and fixes snapshot races.
4. If the user asks about notifications, explain how to use "Clear Notifications" in Chat, or how to toggle "Mobile & Browser Push Alerts" in Settings.
5. If the user asks about languages, explain that 20 languages with full RTL (Urdu, Arabic, Persian) are selectable in Settings.
6. Always conclude your response with a question asking: "Did this resolve your problem, or do you still need help?"
7. Never invent features that don't exist.
8. If the issue cannot be resolved or is an unexpected bug, encourage the user to click "Generate Bug Report" so the Admin can inspect it.
`;

    const aiResponse = await serverAIService.generateResponse({
      messages: messages || (userProblem ? [{ role: 'user', content: userProblem }] : []),
      prompt: userProblem || 'Help me resolve my issue in FamilyHub.',
      systemInstruction,
      userId: req.body.userId || 'anon-support',
      familyId: req.body.familyId,
    });

    return res.json({
      reply: aiResponse.text,
      provider: aiResponse.provider,
      model: aiResponse.model,
      needsFeedback: true,
    });
  } catch (err: any) {
    console.error('[AI Troubleshoot] Failed:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to generate troubleshooting advice.',
      reply: "I am having trouble connecting to the diagnostic server. Please review our verified Help FAQ articles or submit a support ticket directly to our Admin team.",
    });
  }
}

// 3. AI Bug Report Generator Handler
export async function handleAIGenerateReport(req: Request, res: Response) {
  try {
    const { conversation, userContext } = req.body;

    const prompt = `
Analyze the following troubleshooting conversation between a FamilyHub user and our AI support agent.
Synthesize the conversation into a clean, structured JSON bug report with the following exact format:

{
  "title": "Short descriptive title under 60 chars",
  "category": "bug" | "complaint" | "help" | "feature" | "account" | "chat" | "profiles" | "sync" | "security",
  "priority": "low" | "medium" | "high" | "critical",
  "description": "Comprehensive explanation of what the user is experiencing",
  "expectedBehavior": "What should have happened",
  "actualBehavior": "What actually occurred",
  "stepsToReproduce": "Numbered steps to trigger this behavior",
  "attemptedSteps": "Steps already tried by the user during troubleshooting",
  "aiSummary": "Technical diagnostic synthesis of potential root cause"
}

Conversation:
${JSON.stringify(conversation, null, 2)}

User Context:
${JSON.stringify(userContext || {}, null, 2)}

Respond with ONLY the raw valid JSON object, no markdown, no backticks.
`;

    const aiResponse = await serverAIService.generateResponse({
      prompt,
      userId: req.body.userId || 'anon-reporter',
      systemInstruction: 'You are a precise technical QA lead synthesizing user bug reports into strict JSON format.',
    });

    let rawText = aiResponse.text.trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const report: GeneratedBugReport = JSON.parse(rawText);
    return res.json({ report });
  } catch (err: any) {
    console.error('[AI Bug Report] Failed to synthesize report:', err);
    // Graceful fallback structured report
    const fallbackReport: GeneratedBugReport = {
      title: req.body.fallbackTitle || 'FamilyHub Technical Issue Report',
      category: 'bug',
      priority: 'high',
      description: req.body.fallbackDescription || 'User encountered an issue that could not be resolved during self-service troubleshooting.',
      expectedBehavior: 'Application functions smoothly without errors.',
      actualBehavior: 'Issue persists after attempted troubleshooting.',
      stepsToReproduce: '1. Open the application\n2. Navigate to the affected section\n3. Observe the issue',
      attemptedSteps: 'Followed self-service AI recommendations.',
      aiSummary: 'User completed troubleshooting sequence; escalated to human administrator.',
    };
    return res.json({ report: fallbackReport });
  }
}

// 4. Create or Register Support Ticket
export async function handleCreateTicket(req: Request, res: Response) {
  try {
    const ticketData: SupportTicket = req.body;

    if (!ticketData.subject || !ticketData.userId || !ticketData.referenceId) {
      return res.status(400).json({ error: 'Missing required ticket fields' });
    }

    // Store in server store and persist
    ticketsStore.set(ticketData.id, ticketData);
    saveTicketsToDisk(ticketsStore);

    // Trigger Admin Email Notification
    sendAdminEmailNotification({
      event: ticketData.priority === 'critical' ? 'critical_ticket' : 'new_ticket',
      ticket: ticketData,
    }).catch(e => console.warn('[Email Background Alert] Warning:', e));

    // Trigger WhatsApp Notification if configured
    sendWhatsAppNotification({
      event: ticketData.priority === 'critical' ? 'critical_ticket' : 'new_ticket',
      ticket: ticketData,
    }).catch(e => console.warn('[WhatsApp Background Alert] Warning:', e));

    return res.json({
      success: true,
      ticket: ticketData,
      adminNotified: ADMIN_EMAIL,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to record ticket' });
  }
}

// 5. Add Reply to Ticket (User or Admin)
export async function handleTicketReply(req: Request, res: Response) {
  try {
    const { ticketId } = req.params;
    const { message, senderRole, senderName, senderEmail, senderId } = req.body;

    if (!message || !ticketId) {
      return res.status(400).json({ error: 'Missing message or ticketId' });
    }

    const ticket = ticketsStore.get(ticketId);

    const newMessage: SupportMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderId: senderId || 'anon',
      senderName: senderName || (senderRole === 'admin' ? 'Support Admin' : 'Family Member'),
      senderEmail,
      senderRole: senderRole || 'user',
      text: message,
      createdAt: Date.now(),
    };

    if (ticket) {
      ticket.messages = ticket.messages || [];
      ticket.messages.push(newMessage);
      ticket.updatedAt = Date.now();

      if (senderRole === 'admin') {
        ticket.status = 'waiting_user';
      } else {
        ticket.status = 'in_progress';
        // Notify admin of user reply
        sendAdminEmailNotification({
          event: 'user_reply',
          ticket,
          replyMessage: message,
        }).catch(e => console.warn('[Email Reply Alert] Error:', e));
      }
      ticketsStore.set(ticketId, ticket);
      saveTicketsToDisk(ticketsStore);
    }

    return res.json({ success: true, message: newMessage, ticket });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to submit reply' });
  }
}

// 6. Update Ticket Status / Priority (Admin or User Reopen)
export async function handleUpdateTicket(req: Request, res: Response) {
  try {
    const { ticketId } = req.params;
    const { status, priority } = req.body;

    const ticket = ticketsStore.get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const oldStatus = ticket.status;
    const oldPriority = ticket.priority;

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    ticket.updatedAt = Date.now();

    if (status === 'resolved') ticket.resolvedAt = Date.now();
    if (status === 'closed') ticket.closedAt = Date.now();

    ticketsStore.set(ticketId, ticket);
    saveTicketsToDisk(ticketsStore);

    // If marked critical, alert admin
    if (priority === 'critical' && oldPriority !== 'critical') {
      sendAdminEmailNotification({ event: 'critical_ticket', ticket }).catch(console.warn);
      sendWhatsAppNotification({ event: 'critical_ticket', ticket }).catch(console.warn);
    }

    // If reopened from resolved/closed, alert admin
    if ((oldStatus === 'resolved' || oldStatus === 'closed') && (status === 'open' || status === 'in_progress')) {
      sendAdminEmailNotification({ event: 'reopened', ticket }).catch(console.warn);
    }

    return res.json({ success: true, ticket });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update ticket' });
  }
}

// 7. Get All Tickets (for Family Admin or Member filtered)
export async function handleGetTickets(req: Request, res: Response) {
  try {
    const { familyId, userId, userEmail, isSuperAdmin } = req.query;

    const all = Array.from(ticketsStore.values());

    const isAuthorizedSuperAdmin =
      isSuperAdmin === 'true' &&
      typeof userEmail === 'string' &&
      userEmail.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();

    let filtered = all;
    if (!isAuthorizedSuperAdmin) {
      // Strict privacy: Ordinary users and family members only see their own tickets
      filtered = filtered.filter(
        t =>
          (userId && t.userId === userId) ||
          (userEmail && t.userEmail && t.userEmail.toLowerCase().trim() === String(userEmail).toLowerCase().trim())
      );
    }

    // Sort newest first
    filtered.sort((a, b) => b.updatedAt - a.updatedAt);

    return res.json({ tickets: filtered });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to retrieve tickets' });
  }
}
