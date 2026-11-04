import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Sparkles,
  Search,
  Check,
  AlertCircle,
  Clock,
  Send,
  ChevronDown,
  Paperclip,
  RotateCcw,
  ShieldCheck,
  FileText,
  User,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Info,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { HELP_CATEGORIES, HELP_ARTICLES, HelpArticle } from '../../data/helpCenterFaq';
import {
  submitSupportTicket,
  fetchSupportTickets,
  postTicketReply,
  updateTicketStatus,
  requestAITroubleshoot,
  generateAIBugReport,
} from '../../services/supportService';
import {
  SupportTicket,
  SupportMessage,
  SupportCategory,
  SupportPriority,
  GeneratedBugReport,
} from '../../types/support';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface HelpSupportCenterProps {
  initialTab?: 'ai' | 'faq' | 'ticket' | 'my_tickets';
  onOpenAdminDashboard?: () => void;
  isAdmin?: boolean;
}

export const HelpSupportCenter: React.FC<HelpSupportCenterProps> = ({
  initialTab = 'ai',
  onOpenAdminDashboard,
  isAdmin = false,
}) => {
  const { user } = useAuth();
  const { currentFamily, familyPermissions } = useFamily();
  const [activeTab, setActiveTab] = useState<'ai' | 'faq' | 'ticket' | 'my_tickets'>(initialTab);

  const canAccessAdmin = isAdmin || familyPermissions?.isAdmin || user?.email?.toLowerCase() === 'cxaali568@gmail.com';

  // -------------------------------------------------------------
  // 1. AI Troubleshooting State
  // -------------------------------------------------------------
  const [aiProblemInput, setAiProblemInput] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>>([
    {
      role: 'assistant',
      content:
        "👋 Hello! I am your FamilyHub AI Diagnostic Assistant. Please describe any problem you're experiencing (for example: login difficulties, member profile editing, disappearing data, photo upload failures, push alerts, or Urdu/Arabic language settings), and I'll walk you through step-by-step solutions.",
      timestamp: Date.now(),
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showSolvedPrompt, setShowSolvedPrompt] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<GeneratedBugReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const aiChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatMessages, aiLoading, showSolvedPrompt]);

  const handleSendAIMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = aiProblemInput.trim();
    if (!trimmed || aiLoading) return;

    const newMsgs = [
      ...aiChatMessages,
      { role: 'user' as const, content: trimmed, timestamp: Date.now() },
    ];
    setAiChatMessages(newMsgs);
    setAiProblemInput('');
    setAiLoading(true);
    setShowSolvedPrompt(false);

    try {
      const result = await requestAITroubleshoot({
        messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
        userProblem: trimmed,
        userContext: {
          familyId: currentFamily?.id,
          userName: user?.name,
          userEmail: user?.email,
          language: typeof navigator !== 'undefined' ? navigator.language : 'en',
          device: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
        },
      });

      setAiChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: result.reply, timestamp: Date.now() },
      ]);
      setShowSolvedPrompt(true);
    } catch {
      setAiChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I had trouble diagnosing this. Please check our FAQ articles or generate a support ticket below.',
          timestamp: Date.now(),
        },
      ]);
      setShowSolvedPrompt(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleTriggerReportGeneration = async () => {
    setIsGeneratingReport(true);
    try {
      const report = await generateAIBugReport({
        conversation: aiChatMessages.map(m => ({ role: m.role, content: m.content })),
        userContext: {
          familyId: currentFamily?.id,
          userName: user?.name,
          userEmail: user?.email,
        },
      });
      setGeneratedReport(report);
      // Pre-fill manual ticket form
      setTicketSubject(report.title);
      setTicketCategory(report.category);
      setTicketPriority(report.priority);
      setTicketMessage(
        `Description:\n${report.description}\n\nExpected:\n${report.expectedBehavior}\n\nActual:\n${report.actualBehavior}\n\nSteps Attempted:\n${report.attemptedSteps}`
      );
      setTicketExpected(report.expectedBehavior);
      setTicketActual(report.actualBehavior);
      setTicketAttempted(report.attemptedSteps);
      setTicketAiSummary(report.aiSummary);
      setActiveTab('ticket');
    } catch (err) {
      console.warn('Failed to synthesize report:', err);
      setActiveTab('ticket');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // -------------------------------------------------------------
  // 2. FAQ / Knowledge Base State
  // -------------------------------------------------------------
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('all');
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  const filteredArticles = HELP_ARTICLES.filter(article => {
    const matchesCategory = selectedFaqCategory === 'all' || article.categoryId === selectedFaqCategory;
    if (!matchesCategory) return false;
    if (!faqSearchQuery.trim()) return true;
    const q = faqSearchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(q) ||
      article.summary.toLowerCase().includes(q) ||
      article.content.toLowerCase().includes(q) ||
      article.keywords.some(k => k.toLowerCase().includes(q))
    );
  });

  // -------------------------------------------------------------
  // 3. Manual / Generated Ticket Form State
  // -------------------------------------------------------------
  const [ticketCategory, setTicketCategory] = useState<SupportCategory>('bug');
  const [ticketPriority, setTicketPriority] = useState<SupportPriority>('medium');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketExpected, setTicketExpected] = useState('');
  const [ticketActual, setTicketActual] = useState('');
  const [ticketAttempted, setTicketAttempted] = useState('');
  const [ticketAiSummary, setTicketAiSummary] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [ticketSuccess, setTicketSuccess] = useState<SupportTicket | null>(null);

  const handleSubmitTicketForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setTicketError('Please sign in to submit a support ticket.');
      return;
    }
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      setTicketError('Subject and message are required.');
      return;
    }

    setTicketSubmitting(true);
    setTicketError(null);

    try {
      const res = await submitSupportTicket({
        userId: user.id,
        userEmail: user.email || '',
        userName: user.name || 'Family Member',
        familyId: currentFamily?.id || 'default',
        category: ticketCategory,
        priority: ticketPriority,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        expectedBehavior: ticketExpected.trim() || undefined,
        actualBehavior: ticketActual.trim() || undefined,
        attemptedSteps: ticketAttempted.trim() || undefined,
        aiSummary: ticketAiSummary.trim() || undefined,
      });

      if (res.ticket) {
        setTicketSuccess(res.ticket);
      } else {
        setTicketSuccess({
          id: res.id,
          referenceId: res.referenceId,
          userId: user.id,
          userName: user.name,
          userEmail: user.email || '',
          familyId: currentFamily?.id || 'default',
          category: ticketCategory,
          subject: ticketSubject,
          description: ticketMessage,
          status: 'new',
          priority: ticketPriority,
          messages: [],
          createdAt: res.createdAt,
          updatedAt: res.createdAt,
        });
      }

      // Reset form
      setTicketSubject('');
      setTicketMessage('');
      setTicketExpected('');
      setTicketActual('');
      setTicketAttempted('');
      setTicketAiSummary('');
      setGeneratedReport(null);
    } catch (err: any) {
      setTicketError(err?.message || 'Failed to submit support ticket.');
    } finally {
      setTicketSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // 4. User Ticket History & Conversation State
  // -------------------------------------------------------------
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activeTicketDetail, setActiveTicketDetail] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadUserTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const list = await fetchSupportTickets({
        userId: user.id,
        userEmail: user.email,
        familyId: currentFamily?.id,
        isSuperAdmin: false,
      });
      setMyTickets(list);
    } catch (err) {
      console.warn('Failed to load user tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my_tickets') {
      loadUserTickets();
    }
  }, [activeTab, user?.id]);

  const handleSendUserReply = async (ticketId: string) => {
    if (!replyText.trim() || !user) return;
    setSendingReply(true);
    try {
      const result = await postTicketReply({
        ticketId,
        message: replyText.trim(),
        senderId: user.id,
        senderName: user.name || 'Family Member',
        senderEmail: user.email || '',
        senderRole: 'user',
      });

      if (result.success && result.message) {
        setActiveTicketDetail(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...(prev.messages || []), result.message!],
            updatedAt: Date.now(),
            status: 'in_progress',
          };
        });
        setMyTickets(prev =>
          prev.map(t =>
            t.id === ticketId
              ? { ...t, messages: [...(t.messages || []), result.message!], status: 'in_progress', updatedAt: Date.now() }
              : t
          )
        );
      }
      setReplyText('');
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleReopenTicket = async (ticketId: string) => {
    try {
      const ok = await updateTicketStatus(ticketId, { status: 'open' });
      if (ok) {
        setActiveTicketDetail(prev => (prev ? { ...prev, status: 'open' } : null));
        setMyTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, status: 'open' } : t)));
      }
    } catch (e) {
      console.error('Failed to reopen ticket:', e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs text-indigo-200">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">FamilyHub Support & Help Center</h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Self-Service & Admin
              </span>
            </div>
            <p className="text-xs text-indigo-200/80">
              Instant AI troubleshooting, verified help articles, and direct admin assistance
            </p>
          </div>
        </div>

        {canAccessAdmin && onOpenAdminDashboard && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenAdminDashboard}
            icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
            className="text-xs font-bold bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            Admin Support Dashboard →
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'ai'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Troubleshooting Agent</span>
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'faq'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Help Articles & FAQ</span>
        </button>

        <button
          onClick={() => setActiveTab('ticket')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'ticket'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Submit Ticket / Report</span>
          {generatedReport && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('my_tickets')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'my_tickets'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>My Tickets</span>
          {myTickets.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {myTickets.length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: AI Troubleshooting Agent */}
      {/* ============================================================== */}
      {activeTab === 'ai' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  AI Technical Support Specialist
                </h3>
                <p className="text-[11px] text-slate-400">
                  Self-service diagnostic agent grounded in verified FamilyHub knowledge
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setAiChatMessages([
                  {
                    role: 'assistant',
                    content: 'Diagnostic session reset. How can I help you today?',
                    timestamp: Date.now(),
                  },
                ]);
                setShowSolvedPrompt(false);
              }}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Chat</span>
            </button>
          </div>

          {/* Quick Problem Suggestion Chips */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Common issues (click to diagnose):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Member profile edit data disappearing',
                'How to clear notifications in Family Chat',
                'Mobile push notifications on lockscreen',
                'Urdu & Arabic RTL layout text direction',
                'Forgot Family Code or join existing family',
                'Photo and document upload failing',
              ].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setAiProblemInput(chip);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 transition-colors border border-slate-200/60 dark:border-slate-700/60 cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation History */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl max-h-[360px] overflow-y-auto space-y-3 border border-slate-100 dark:border-slate-800/80">
            {aiChatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-[10px] font-bold mt-1">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs rounded-tl-xs'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {aiLoading && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 p-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>AI diagnostic agent is thinking & analyzing knowledge base...</span>
              </div>
            )}
            <div ref={aiChatEndRef} />
          </div>

          {/* Interactive "Did this solve your problem?" prompt */}
          {showSolvedPrompt && !aiLoading && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-900/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Did these steps solve your problem?
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAiChatMessages(prev => [
                      ...prev,
                      {
                        role: 'assistant',
                        content:
                          '🎉 Wonderful! Glad your issue was resolved. Feel free to ask anytime if you need help with other FamilyHub features.',
                        timestamp: Date.now(),
                      },
                    ]);
                    setShowSolvedPrompt(false);
                  }}
                  className="text-xs font-bold text-emerald-700 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                  icon={<ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />}
                >
                  Yes, Problem Solved
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleTriggerReportGeneration}
                  disabled={isGeneratingReport}
                  className="text-xs font-bold"
                  icon={<ThumbsDown className="w-3.5 h-3.5" />}
                >
                  {isGeneratingReport ? 'Generating Report...' : 'No, Generate Bug Report'}
                </Button>
              </div>
            </div>
          )}

          {/* Prompt Input Form */}
          <form onSubmit={handleSendAIMessage} className="flex gap-2">
            <Input
              value={aiProblemInput}
              onChange={e => setAiProblemInput(e.target.value)}
              placeholder="Describe your issue in plain language (English, Urdu, or any language)..."
              disabled={aiLoading}
              className="text-xs"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={aiLoading || !aiProblemInput.trim()}
              icon={<Send className="w-3.5 h-3.5" />}
              className="text-xs shrink-0"
            >
              Ask AI
            </Button>
          </form>
        </Card>
      )}

      {/* ============================================================== */}
      {/* TAB 2: Searchable Help Center & FAQ */}
      {/* ============================================================== */}
      {activeTab === 'faq' && (
        <Card className="p-4 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={faqSearchQuery}
              onChange={e => setFaqSearchQuery(e.target.value)}
              placeholder="Search help articles (e.g. login, code, profile, push notifications, voice, Urdu)..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            {faqSearchQuery && (
              <button
                onClick={() => setFaqSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold">
            <button
              onClick={() => setSelectedFaqCategory('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                selectedFaqCategory === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Categories ({HELP_ARTICLES.length})
            </button>
            {HELP_CATEGORIES.map(cat => {
              const count = HELP_ARTICLES.filter(a => a.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedFaqCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                    selectedFaqCategory === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Article Results */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredArticles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">No help articles match your search.</p>
                <button
                  onClick={() => setActiveTab('ai')}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Ask our AI Troubleshooting Agent instead →
                </button>
              </div>
            ) : (
              filteredArticles.map(article => {
                const isExpanded = expandedArticleId === article.id;
                return (
                  <div
                    key={article.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedArticleId(isExpanded ? null : article.id)}
                      className="w-full p-3 text-left flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            {article.categoryName}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {article.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{article.summary}</p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-indigo-600' : ''
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="p-3.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
                        <p className="leading-relaxed">{article.content}</p>

                        {article.steps && article.steps.length > 0 && (
                          <div className="space-y-1.5 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                              Step-by-step instructions:
                            </p>
                            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                              {article.steps.map((st, i) => (
                                <li key={i}>{st}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {article.troubleshooting && article.troubleshooting.length > 0 && (
                          <div className="space-y-1.5 p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                              Troubleshooting tips:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900 dark:text-amber-200">
                              {article.troubleshooting.map((tr, i) => (
                                <li key={i}>{tr}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* ============================================================== */}
      {/* TAB 3: Submit Support Ticket (Manual or AI Synthesized) */}
      {/* ============================================================== */}
      {activeTab === 'ticket' && (
        <Card className="p-4 space-y-4">
          {ticketSuccess ? (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                Support Ticket Successfully Submitted!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Reference ID:{' '}
                <span className="font-mono font-bold text-base text-indigo-600 dark:text-indigo-400">
                  {ticketSuccess.referenceId}
                </span>
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Admin notifications have been dispatched. You can track replies and updates under the "My Tickets" tab.
              </p>

              <div className="flex justify-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setActiveTab('my_tickets');
                    setActiveTicketDetail(ticketSuccess);
                    setTicketSuccess(null);
                  }}
                  className="text-xs font-bold"
                >
                  View in My Tickets →
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTicketSuccess(null)}
                  className="text-xs"
                >
                  Submit Another
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicketForm} className="space-y-3.5">
              {/* AI Synthesized Banner */}
              {generatedReport && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      AI Synthesized Bug Report Ready for Review
                    </span>
                    <button
                      type="button"
                      onClick={() => setGeneratedReport(null)}
                      className="text-[10px] text-amber-700 hover:underline"
                    >
                      Clear AI Form
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
                    Our AI has pre-filled the technical fields based on your troubleshooting dialogue. Please review and make any edits before submitting.
                  </p>
                </div>
              )}

              {ticketError && (
                <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{ticketError}</span>
                </div>
              )}

              {/* Safeguard Notice */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Admin Notification:</strong> Your ticket will be securely submitted to the authorized App Support Team.
                </span>
              </div>

              {/* Category & Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Problem Category
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={e => setTicketCategory(e.target.value as SupportCategory)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="bug">Bug Report / Defect</option>
                    <option value="profiles">Profile & Data Disappearing</option>
                    <option value="chat">Chat & Notifications</option>
                    <option value="account">Account & Family Code</option>
                    <option value="sync">Sync & Network Issues</option>
                    <option value="security">Privacy & Permissions</option>
                    <option value="complaint">Complaint</option>
                    <option value="help">General Help Question</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={ticketPriority}
                    onChange={e => setTicketPriority(e.target.value as SupportPriority)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="low">Low (Cosmetic or minor suggestion)</option>
                    <option value="medium">Medium (Standard feature inquiry)</option>
                    <option value="high">High (Feature not functioning as expected)</option>
                    <option value="critical">Critical (Blocking work or data loss)</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Summary *
                </label>
                <Input
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  placeholder="Short, clear summary of the issue"
                  required
                  className="text-xs"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  value={ticketMessage}
                  onChange={e => setTicketMessage(e.target.value)}
                  placeholder="Please describe what happened, when it occurred, and any error messages..."
                  rows={4}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              {/* Steps Attempted (if available) */}
              {(generatedReport || ticketAttempted) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Steps Already Attempted
                  </label>
                  <textarea
                    value={ticketAttempted}
                    onChange={e => setTicketAttempted(e.target.value)}
                    placeholder="What troubleshooting steps have you already tried?"
                    rows={2}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                {generatedReport && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setGeneratedReport(null);
                      setActiveTab('ai');
                    }}
                    className="text-xs"
                  >
                    Problem Solved (Discard)
                  </Button>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={ticketSubmitting || !ticketSubject.trim() || !ticketMessage.trim()}
                  icon={<Send className="w-3.5 h-3.5" />}
                  className="text-xs font-bold"
                >
                  {ticketSubmitting ? 'Submitting...' : 'Still Need Help — Submit Report'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* ============================================================== */}
      {/* TAB 4: User Ticket History & Conversation */}
      {/* ============================================================== */}
      {activeTab === 'my_tickets' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                My Support Tickets & History
              </h3>
              <p className="text-[11px] text-slate-400">
                Track status updates and conversation with the FamilyHub Admin
              </p>
            </div>
            <button
              onClick={loadUserTickets}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {loadingTickets ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading your tickets...</div>
          ) : myTickets.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">You have no submitted tickets yet.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('ticket')}
                className="text-xs font-bold mt-2"
              >
                Submit a Support Request
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myTickets.map(ticket => {
                const isSelected = activeTicketDetail?.id === ticket.id;
                return (
                  <div
                    key={ticket.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40"
                  >
                    <div
                      onClick={() => setActiveTicketDetail(isSelected ? null : ticket)}
                      className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {ticket.referenceId}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              ticket.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : ticket.status === 'in_progress'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                : ticket.status === 'waiting_user'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {ticket.status.replace('_', ' ')}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              ticket.priority === 'critical'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : ticket.priority === 'high'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {ticket.priority}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {ticket.subject}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Updated {new Date(ticket.updatedAt).toLocaleDateString()} at{' '}
                          {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                          isSelected ? 'rotate-180 text-indigo-600' : ''
                        }`}
                      />
                    </div>

                    {/* Detailed Conversation Thread */}
                    {isSelected && (
                      <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                          <p className="font-bold text-slate-700 dark:text-slate-300">Initial Complaint:</p>
                          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                            {ticket.description}
                          </p>
                        </div>

                        {/* Thread Messages */}
                        {ticket.messages && ticket.messages.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Conversation History:
                            </p>
                            {ticket.messages.map(msg => (
                              <div
                                key={msg.id}
                                className={`p-3 rounded-xl text-xs space-y-1 ${
                                  msg.senderRole === 'admin'
                                    ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-900/50 ml-4'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 mr-4'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                    {msg.senderName} {msg.senderRole === 'admin' && '(Admin Support)'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                                  {msg.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Composer */}
                        {ticket.status !== 'closed' ? (
                          <div className="space-y-2 pt-2">
                            <textarea
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder="Write a reply or provide more information to Admin..."
                              rows={2}
                              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                            <div className="flex items-center justify-between">
                              {ticket.status === 'resolved' && (
                                <button
                                  type="button"
                                  onClick={() => handleReopenTicket(ticket.id)}
                                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-bold"
                                >
                                  Reopen this ticket
                                </button>
                              )}
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleSendUserReply(ticket.id)}
                                disabled={sendingReply || !replyText.trim()}
                                icon={<Send className="w-3.5 h-3.5" />}
                                className="text-xs font-bold ml-auto"
                              >
                                {sendingReply ? 'Sending...' : 'Send Reply'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-center text-slate-500">
                            This ticket has been marked Closed by Admin.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default HelpSupportCenter;
