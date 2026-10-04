import React, { useState, useRef, useEffect } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { familyAIService } from '../../services/familyAIService';
import { aiService, AIContextPayload } from '../../services/aiService';
import { FamilyAIConversation, AIMessage } from '../../types';
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  Plus,
  Trash2,
  Edit2,
  MessageSquare,
  Paperclip,
  Square,
  RotateCcw,
  Copy,
  Check,
  Settings as SettingsIcon,
  AlertCircle,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { SafeMarkdown } from '../ai/SafeMarkdown';
import { ContextPickerModal } from '../ai/ContextPickerModal';
import { AISettingsModal } from '../ai/AISettingsModal';
import { billService } from '../../services/billService';
import { eventService } from '../../services/eventService';
import { expenseService } from '../../services/expenseService';
import { noteService } from '../../services/noteService';
import { childService } from '../../services/childService';

export const FamilyAIView: React.FC = () => {
  const { currentFamily, members } = useFamily();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<FamilyAIConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'auto' | 'gemini' | 'openai'>('auto');

  // Modals
  const [isContextPickerOpen, setIsContextPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<AIContextPayload[]>([]);
  const [renamingConv, setRenamingConv] = useState<FamilyAIConversation | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // Family data for context picker
  const [familyBills, setFamilyBills] = useState<any[]>([]);
  const [familyEvents, setFamilyEvents] = useState<any[]>([]);
  const [familyExpenses, setFamilyExpenses] = useState<any[]>([]);
  const [familyNotes, setFamilyNotes] = useState<any[]>([]);
  const [familyChildren, setFamilyChildren] = useState<any[]>([]);

  // Abort controller for Stop generation
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Subscribe to family AI conversations
  useEffect(() => {
    if (!currentFamily?.id) return;
    const unsubscribe = familyAIService.subscribeFamilyAIConversations(
      currentFamily.id,
      (convs) => {
        setConversations(convs);
        if (!activeConvId && convs.length > 0) {
          setActiveConvId(convs[0].id);
        }
      }
    );
    return () => unsubscribe();
  }, [currentFamily?.id]);

  // Load family context records
  useEffect(() => {
    if (!currentFamily?.id) return;
    const unsubBills = billService.subscribeAllActiveBills(currentFamily.id, setFamilyBills);
    const unsubEvents = eventService.subscribeEvents(currentFamily.id, setFamilyEvents);
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const unsubExpenses = expenseService.subscribeMonthExpenses(currentFamily.id, currentMonthKey, setFamilyExpenses);
    const unsubNotes = noteService.subscribeNotes(currentFamily.id, setFamilyNotes);
    const unsubChildren = childService.subscribeChildren(currentFamily.id, setFamilyChildren);

    return () => {
      unsubBills();
      unsubEvents();
      unsubExpenses();
      unsubNotes();
      unsubChildren();
    };
  }, [currentFamily?.id]);

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) || conversations[0] || null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, streamingText, isGenerating]);

  const handleStartNewChat = async () => {
    if (!currentFamily?.id || !user) return;
    const newConv = await familyAIService.createFamilyAIConversation(
      currentFamily.id,
      'New Family Chat',
      [],
      user
    );
    setActiveConvId(newConv.id);
    setSelectedContext([]);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const handleSend = async (customPrompt?: string, attachedContext?: AIContextPayload[]) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || isGenerating || !currentFamily?.id || !user) return;

    setInput('');
    const contextToUse = attachedContext || selectedContext;

    let conv = activeConversation;
    if (!conv) {
      conv = await familyAIService.createFamilyAIConversation(
        currentFamily.id,
        textToSend.slice(0, 30),
        [],
        user
      );
      setActiveConvId(conv.id);
    }

    const userMsg: AIMessage = {
      id: `${Date.now()}_u`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
      status: 'completed',
      contextBadges: contextToUse.map((c) => ({ type: c.type as any, title: c.title })),
    };

    const updatedMessages = [...(conv.messages || []), userMsg];
    await familyAIService.updateFamilyAIConversation(currentFamily.id, conv.id, {
      messages: updatedMessages,
      title: conv.messages?.length === 0 ? textToSend.slice(0, 30) : conv.title,
    });

    setIsGenerating(true);
    setStreamingText('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedText = '';
    let usedProvider: 'gemini' | 'openai' | undefined;
    let usedModel: string | undefined;

    try {
      const meta = await aiService.streamMessage(
        updatedMessages,
        textToSend,
        (chunk) => {
          accumulatedText += chunk;
          setStreamingText(accumulatedText);
        },
        {
          provider: selectedProvider,
          contextItems: contextToUse,
          familyId: currentFamily.id,
          signal: controller.signal,
          systemInstruction:
            'You are FamilyHub AI Assistant for this household. ' +
            'Provide warm, organized, actionable answers regarding family schedules, household bills, meals, and plans. ' +
            'CRITICAL SAFETY: Never diagnose medical issues. Never fabricate numbers. Refer strictly to provided context.',
        }
      );

      usedProvider = meta.provider;
      usedModel = meta.model;

      const botMsg: AIMessage = {
        id: `${Date.now()}_m`,
        role: 'model',
        text: accumulatedText || 'Processed.',
        timestamp: new Date().toISOString(),
        status: 'completed',
        provider: usedProvider,
        model: usedModel,
      };

      await familyAIService.updateFamilyAIConversation(currentFamily.id, conv.id, {
        messages: [...updatedMessages, botMsg],
      });

      // Optionally generate a concise title if first exchange
      if (conv.messages?.length === 0) {
        aiService
          .generateTitle(textToSend, accumulatedText, selectedProvider)
          .then((title) => {
            if (title && currentFamily?.id && conv) {
              familyAIService.updateFamilyAIConversation(currentFamily.id, conv.id, { title });
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (accumulatedText.trim()) {
          const cancelMsg: AIMessage = {
            id: `${Date.now()}_cancelled`,
            role: 'model',
            text: accumulatedText + '\n\n*(Generation stopped by user)*',
            timestamp: new Date().toISOString(),
            status: 'cancelled',
          };
          await familyAIService.updateFamilyAIConversation(currentFamily.id, conv.id, {
            messages: [...updatedMessages, cancelMsg],
          });
        }
      } else {
        const errorMsg: AIMessage = {
          id: `${Date.now()}_err`,
          role: 'model',
          text: err?.message?.includes('not configured')
            ? 'AI provider is not configured yet. Please configure GEMINI_API_KEY or OPENAI_API_KEY in server secrets.'
            : "AI couldn't complete this request. Please try again.",
          timestamp: new Date().toISOString(),
          status: 'failed',
          errorCode: 'GENERATION_ERROR',
        };
        await familyAIService.updateFamilyAIConversation(currentFamily.id, conv.id, {
          messages: [...updatedMessages, errorMsg],
        });
      }
    } finally {
      setIsGenerating(false);
      setStreamingText('');
      abortControllerRef.current = null;
    }
  };

  const handleRetry = (msgIndex: number) => {
    if (!activeConversation) return;
    // Find preceding user prompt
    const prevMsg = activeConversation.messages[msgIndex - 1];
    if (prevMsg && prevMsg.role === 'user') {
      handleSend(prevMsg.text);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!currentFamily?.id) return;
    await familyAIService.deleteFamilyAIConversation(currentFamily.id, convId, user || undefined);
    if (activeConvId === convId) {
      const remaining = conversations.filter((c) => c.id !== convId);
      setActiveConvId(remaining[0]?.id || null);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingConv || !newTitle.trim() || !currentFamily?.id) return;
    await familyAIService.updateFamilyAIConversation(currentFamily.id, renamingConv.id, {
      title: newTitle.trim(),
    });
    setRenamingConv(null);
    setNewTitle('');
  };

  const suggestedPrompts = [
    {
      title: 'What is planned this week?',
      handler: () => {
        const eventContext: AIContextPayload = {
          type: 'events_summary',
          title: 'Scheduled Family Events',
          content: familyEvents
            .map((e) => `- ${e.title} (${e.startDate} at ${e.location || 'Home'})`)
            .join('\n') || 'No scheduled events found.',
        };
        handleSend('What family events and plans are coming up this week?', [eventContext]);
      },
    },
    {
      title: 'Which bills are due?',
      handler: () => {
        const pendingBills = familyBills.filter((b) => !b.isPaid);
        const total = pendingBills.reduce((acc, b) => acc + (b.amount || 0), 0);
        const billContext: AIContextPayload = {
          type: 'bills_summary',
          title: 'Pending Household Bills',
          content: `Pending Bills Total: $${total.toFixed(2)} USD.\n` +
            pendingBills.map((b) => `- ${b.title}: $${b.amount} (Due: ${b.dueDate})`).join('\n'),
        };
        handleSend('Which family bills are currently due or pending?', [billContext]);
      },
    },
    {
      title: 'Summarize family expenses',
      handler: () => {
        const total = familyExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        const expenseContext: AIContextPayload = {
          type: 'expenses_summary',
          title: 'Family Expenses Records',
          content: `Total Recorded Expenses: $${total.toFixed(2)} USD.\nRecent: ${familyExpenses
            .slice(0, 10)
            .map((e) => `${e.title}: $${e.amount} (${e.category})`)
            .join(', ')}`,
        };
        handleSend('How much did our household spend recently, and across what categories?', [expenseContext]);
      },
    },
    {
      title: 'Summarize urgent family notes',
      handler: () => {
        const urgentNotes = familyNotes.filter((n) => n.isUrgent);
        const noteContext: AIContextPayload = {
          type: 'urgent_notes',
          title: 'Urgent Family Notes',
          content: urgentNotes
            .map((n) => `Title: ${n.title}\nContent: ${n.content || ''}`)
            .join('\n---\n') || 'No urgent notes found.',
        };
        handleSend('Summarize our urgent household notes and priority action items.', [noteContext]);
      },
    },
  ];

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row h-[760px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* ---------------- Sidebar: Conversations ---------------- */}
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Family AI</h3>
                <span className="text-[10px] text-slate-500">Authorized Household AI</span>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="AI Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>

          <Button
            size="sm"
            onClick={handleStartNewChat}
            className="w-full justify-center"
            icon={<Plus className="w-4 h-4" />}
          >
            New Family Chat
          </Button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No conversations yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Start a new chat to coordinate household plans with AI.</p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const active = c.id === activeConversation?.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 shadow-xs'
                      : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {c.messages?.length || 0} messages
                      </div>
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingConv(c);
                        setNewTitle(c.title);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(c.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Provider badge */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 flex items-center justify-between text-[11px] text-slate-500">
          <span>Provider: <strong className="uppercase font-semibold text-slate-700 dark:text-slate-300">{selectedProvider}</strong></span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" /> Read-Only
          </span>
        </div>
      </aside>

      {/* ---------------- Main Chat Area ---------------- */}
      <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
        {/* Chat header */}
        <header className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {activeConversation ? activeConversation.title : 'Family Assistant'}
            </h2>
            <p className="text-[10px] text-slate-500">
              Ask about your family's authorized plans, bills, notes, members, and documents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsContextPickerOpen(true)}
              icon={<Paperclip className="w-3.5 h-3.5" />}
            >
              Add Context {selectedContext.length > 0 && `(${selectedContext.length})`}
            </Button>
          </div>
        </header>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(!activeConversation || activeConversation.messages.length === 0) && (
            <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Welcome to Family AI
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ask about your family's authorized plans, bills, notes, members, and documents.
                </p>
              </div>

              {/* Quick suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
                {suggestedPrompts.map((sp, idx) => (
                  <button
                    key={idx}
                    onClick={sp.handler}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-all group"
                  >
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {sp.title}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Click to query authorized data</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeConversation?.messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex gap-3 max-w-[88%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4 text-indigo-500" />}
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  {/* Context Badges on message */}
                  {msg.contextBadges && msg.contextBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {msg.contextBadges.map((cb, cbIdx) => (
                        <span
                          key={cbIdx}
                          className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold"
                        >
                          Context: {cb.title}
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : msg.status === 'failed'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60 rounded-bl-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <SafeMarkdown content={msg.text} />
                    )}
                  </div>

                  {/* Actions row: Copy, Retry, Provider pill */}
                  {!isUser && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 pl-1">
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      {msg.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(index)}
                          className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Retry
                        </button>
                      )}

                      {msg.provider && (
                        <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60">
                          {msg.provider}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Live streaming bubble */}
          {isGenerating && streamingText && (
            <div className="flex gap-3 max-w-[88%] mr-auto">
              <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-500 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-bl-xs flex-1">
                <SafeMarkdown content={streamingText} />
                <span className="inline-block w-1.5 h-3.5 bg-indigo-500 ml-1 animate-pulse" />
              </div>
            </div>
          )}

          {/* Typing placeholder before stream */}
          {isGenerating && !streamingText && (
            <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-500 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>AI is typing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Selected context banner */}
        {selectedContext.length > 0 && (
          <div className="px-4 py-2 bg-indigo-50/60 dark:bg-indigo-950/30 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
              Attached Context:
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {selectedContext.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-[10px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-2xs"
                >
                  {c.title}
                  <button
                    onClick={() => setSelectedContext(selectedContext.filter((_, idx) => idx !== i))}
                    className="hover:text-rose-500 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Input Composer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about family plans, bills, notes, or schedules..."
              disabled={isGenerating}
              className="flex-1 text-xs p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            {isGenerating ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleStop}
                icon={<Square className="w-4 h-4 text-rose-500" />}
              >
                Stop
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim()}
                icon={<Send className="w-4 h-4" />}
              >
                Send
              </Button>
            )}
          </form>

          {/* Safe Disclaimer footer */}
          <div className="text-[10px] text-slate-400 text-center mt-2">
            FamilyHub AI is informational only and does not replace professional medical or legal advice.
          </div>
        </div>
      </main>

      {/* Context Picker Modal */}
      <ContextPickerModal
        isOpen={isContextPickerOpen}
        onClose={() => setIsContextPickerOpen(false)}
        mode="family"
        selectedContext={selectedContext}
        onSelectContext={setSelectedContext}
        familyData={{
          members: members.map((m) => ({ id: m.id, name: m.userName || 'Member', role: m.role })),
          children: familyChildren,
          bills: familyBills,
          events: familyEvents,
          expenses: familyExpenses,
          notes: familyNotes,
        }}
      />

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedProvider={selectedProvider}
        onSelectProvider={setSelectedProvider}
      />

      {/* Rename Chat Modal */}
      <Modal isOpen={!!renamingConv} onClose={() => setRenamingConv(null)} title="Rename Family Chat" maxWidth="sm">
        <form onSubmit={handleRenameSubmit} className="space-y-4">
          <Input
            label="Chat Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRenamingConv(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Title
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
