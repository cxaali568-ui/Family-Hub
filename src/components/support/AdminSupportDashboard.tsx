import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Mail,
  Send,
  User,
  Smartphone,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  MessageSquare,
  LifeBuoy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import {
  fetchSupportTickets,
  postTicketReply,
  updateTicketStatus,
  getSupportIntegrationStatus,
} from '../../services/supportService';
import {
  SupportTicket,
  SupportStatus,
  SupportPriority,
  SupportMessage,
} from '../../types/support';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface AdminSupportDashboardProps {
  onBackToApp?: () => void;
}

export const AdminSupportDashboard: React.FC<AdminSupportDashboardProps> = ({ onBackToApp }) => {
  const { user } = useAuth();
  const { currentFamily, familyPermissions } = useFamily();

  // Security check: Only Family Owner/Admin or designated admin email cxaali568@gmail.com
  const isAuthorized =
    familyPermissions?.isAdmin ||
    familyPermissions?.isOwner ||
    user?.email?.toLowerCase() === 'cxaali568@gmail.com';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Reply Composer
  const [adminReplyText, setAdminReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Integration Status
  const [integrationStatus, setIntegrationStatus] = useState<{
    adminEmail: string;
    email: { configured: boolean; provider: string; recipient: string };
    whatsapp: { configured: boolean; recipient: string };
  } | null>(null);
  const [showIntegrationDocs, setShowIntegrationDocs] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsList, statusData] = await Promise.all([
        fetchSupportTickets({
          familyId: currentFamily?.id,
          isAdmin: true,
        }),
        getSupportIntegrationStatus(),
      ]);
      setTickets(ticketsList);
      setIntegrationStatus(statusData);
      if (ticketsList.length > 0 && !selectedTicketId) {
        setSelectedTicketId(ticketsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load admin support data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized, currentFamily?.id]);

  if (!isAuthorized) {
    return (
      <Card className="p-8 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Access Restricted: Admin Only
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          The Admin Support Dashboard is strictly restricted to the Family Owner/Admin account (<code className="font-mono text-indigo-600 dark:text-indigo-400">cxaali568@gmail.com</code>).
        </p>
        {onBackToApp && (
          <Button variant="primary" size="sm" onClick={onBackToApp} className="text-xs">
            Return to Family App
          </Button>
        )}
      </Card>
    );
  }

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  // Filter tickets
  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.referenceId.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.userName.toLowerCase().includes(q) ||
      t.userEmail.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  });

  // Ticket stats
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open' || t.status === 'new').length,
    waiting: tickets.filter(t => t.status === 'waiting_user').length,
    critical: tickets.filter(t => t.priority === 'critical' && t.status !== 'resolved' && t.status !== 'closed').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  };

  const handleAdminReply = async (ticketId: string) => {
    if (!adminReplyText.trim() || !user) return;
    setReplySubmitting(true);
    try {
      const res = await postTicketReply({
        ticketId,
        message: adminReplyText.trim(),
        senderId: user.id,
        senderName: user.name || 'FamilyHub Admin',
        senderEmail: user.email || 'cxaali568@gmail.com',
        senderRole: 'admin',
      });

      if (res.success && res.message) {
        setTickets(prev =>
          prev.map(t =>
            t.id === ticketId
              ? {
                  ...t,
                  status: 'waiting_user',
                  updatedAt: Date.now(),
                  messages: [...(t.messages || []), res.message!],
                }
              : t
          )
        );
        setAdminReplyText('');
      }
    } catch (e) {
      console.error('Failed to post admin reply:', e);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleChangeStatus = async (ticketId: string, newStatus: SupportStatus) => {
    try {
      await updateTicketStatus(ticketId, { status: newStatus });
      setTickets(prev =>
        prev.map(t => (t.id === ticketId ? { ...t, status: newStatus, updatedAt: Date.now() } : t))
      );
    } catch (e) {
      console.error('Failed to change status:', e);
    }
  };

  const handleChangePriority = async (ticketId: string, newPriority: SupportPriority) => {
    try {
      await updateTicketStatus(ticketId, { priority: newPriority });
      setTickets(prev =>
        prev.map(t => (t.id === ticketId ? { ...t, priority: newPriority, updatedAt: Date.now() } : t))
      );
    } catch (e) {
      console.error('Failed to change priority:', e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Family Support Admin Dashboard</h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Authorized Admin
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Official notifications dispatcher & ticket manager for <strong className="text-indigo-300">cxaali568@gmail.com</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              icon={<RotateCcw className="w-3.5 h-3.5 text-slate-300" />}
              className="text-xs font-bold bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              Refresh Tickets
            </Button>
            {onBackToApp && (
              <Button
                size="sm"
                variant="primary"
                onClick={onBackToApp}
                className="text-xs font-bold"
              >
                Back to App
              </Button>
            )}
          </div>
        </div>

        {/* Integration Notification Status Bar */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Email Status */}
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-300" />
              <span className="text-slate-400">Email Alerts to <strong className="text-slate-200">cxaali568@gmail.com</strong>:</span>
              {integrationStatus?.email.configured ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Configured ({integrationStatus.email.provider})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold text-[10px] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Server-side SMTP Pending
                </span>
              )}
            </div>

            {/* WhatsApp Status */}
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-300" />
              <span className="text-slate-400">WhatsApp Cloud API:</span>
              {integrationStatus?.whatsapp.configured ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 font-semibold text-[10px]">
                  Optional (Not Configured)
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowIntegrationDocs(!showIntegrationDocs)}
            className="text-[11px] font-semibold text-indigo-300 hover:text-white underline cursor-pointer"
          >
            {showIntegrationDocs ? 'Hide Setup Guide' : 'Setup Secrets Guide →'}
          </button>
        </div>

        {/* Integration Setup Guide Accordion */}
        {showIntegrationDocs && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2 animate-in fade-in">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
              <LifeBuoy className="w-3.5 h-3.5 text-indigo-400" />
              Email & WhatsApp Notification Server Configuration
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              FamilyHub safely sends notifications to <strong>cxaali568@gmail.com</strong> whenever a user submits a ticket or replies. To enable real SMTP delivery, add these environment variables in your server secrets:
            </p>
            <div className="p-2.5 rounded-lg bg-black/60 font-mono text-[11px] text-indigo-300 space-y-0.5 select-all">
              <div>SMTP_HOST=smtp.gmail.com</div>
              <div>SMTP_PORT=587</div>
              <div>SMTP_USER=cxaali568@gmail.com</div>
              <div>SMTP_PASS=your-google-app-password</div>
              <div className="text-slate-500"># Optional WhatsApp Business Cloud API:</div>
              <div className="text-slate-500">WHATSAPP_TOKEN=...</div>
              <div className="text-slate-500">WHATSAPP_PHONE_NUMBER_ID=...</div>
              <div className="text-slate-500">WHATSAPP_RECIPIENT=+1234567890</div>
            </div>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Tickets</p>
          <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{stats.total}</p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Open / New</p>
          <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.open}</p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Waiting for User</p>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{stats.waiting}</p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">Critical Priority</p>
          <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{stats.critical}</p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Resolved</p>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.resolved}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          {/* Search */}
          <div className="relative sm:col-span-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reference, member, subject..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_user">Waiting for User</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">All Categories</option>
              <option value="bug">Bugs</option>
              <option value="profiles">Profiles & Data</option>
              <option value="chat">Chat & Notifications</option>
              <option value="account">Account & Code</option>
              <option value="sync">Sync & Network</option>
              <option value="complaint">Complaints</option>
              <option value="help">General Help</option>
              <option value="feature">Features</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Split Layout: Ticket List & Ticket Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Ticket List */}
        <div className="lg:col-span-5 space-y-2 max-h-[680px] overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
              No support tickets match the selected filters.
            </div>
          ) : (
            filteredTickets.map(ticket => {
              const isSelected = selectedTicketId === ticket.id;
              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {ticket.referenceId}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          ticket.priority === 'critical'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : ticket.priority === 'high'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {ticket.priority}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
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
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                      {ticket.subject}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                      {ticket.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                      👤 {ticket.userName}
                    </span>
                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Ticket Detail & Reply */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <Card className="p-4 space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                      {selectedTicket.referenceId}
                    </span>
                    <span className="text-[11px] uppercase font-bold text-slate-400">
                      • {selectedTicket.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedTicket.subject}
                  </h3>
                </div>

                {/* Status & Priority Controls */}
                <div className="flex items-center gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Status</label>
                    <select
                      value={selectedTicket.status}
                      onChange={e => handleChangeStatus(selectedTicket.id, e.target.value as SupportStatus)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="new">New</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_user">Waiting for User</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Priority</label>
                    <select
                      value={selectedTicket.priority}
                      onChange={e => handleChangePriority(selectedTicket.id, e.target.value as SupportPriority)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Member & Device Info */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">User / Member:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTicket.userName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">User Email:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{selectedTicket.userEmail || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Submitted:</span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {selectedTicket.deviceInfo?.userAgent && (
                  <div className="pt-1 border-t border-slate-200/50 dark:border-slate-800/50 text-[10px] text-slate-400">
                    <span className="font-semibold">Device & Environment: </span>
                    <span className="font-mono">{selectedTicket.deviceInfo.platform} • {selectedTicket.deviceInfo.screenResolution} • {selectedTicket.deviceInfo.language}</span>
                  </div>
                )}
              </div>

              {/* AI Diagnostic Summary (if available) */}
              {selectedTicket.aiSummary && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-200">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>AI Diagnostic Summary</span>
                  </div>
                  <p className="text-purple-800 dark:text-purple-300 leading-relaxed">
                    {selectedTicket.aiSummary}
                  </p>
                </div>
              )}

              {/* Expected vs Actual & Steps to Reproduce */}
              {(selectedTicket.expectedBehavior || selectedTicket.actualBehavior || selectedTicket.attemptedSteps) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedTicket.expectedBehavior && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 space-y-0.5">
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                        Expected Behavior:
                      </span>
                      <p className="text-emerald-900 dark:text-emerald-200 text-[11px] leading-relaxed">
                        {selectedTicket.expectedBehavior}
                      </p>
                    </div>
                  )}

                  {selectedTicket.actualBehavior && (
                    <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40 space-y-0.5">
                      <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase">
                        Actual Behavior:
                      </span>
                      <p className="text-rose-900 dark:text-rose-200 text-[11px] leading-relaxed">
                        {selectedTicket.actualBehavior}
                      </p>
                    </div>
                  )}

                  {selectedTicket.attemptedSteps && (
                    <div className="sm:col-span-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Steps Attempted by User:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                        {selectedTicket.attemptedSteps}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Complete Initial Complaint */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Full Description:</span>
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Conversation History */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Conversation History ({selectedTicket.messages?.length || 0})</span>
                </h4>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl text-xs space-y-1 ${
                          msg.senderRole === 'admin'
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-900/50 ml-4'
                            : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">
                            {msg.senderName} {msg.senderRole === 'admin' && '👑 (Admin)'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No follow-up messages yet.</p>
                  )}
                </div>
              </div>

              {/* Admin Direct Reply Composer */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reply Directly to Member ({selectedTicket.userName})
                </label>
                <textarea
                  value={adminReplyText}
                  onChange={e => setAdminReplyText(e.target.value)}
                  placeholder="Type your response, request more info, or explain fix steps..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleChangeStatus(selectedTicket.id, 'resolved')}
                      className="text-xs font-semibold text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    >
                      ✓ Mark Resolved
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleChangeStatus(selectedTicket.id, 'closed')}
                      className="text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Close Ticket
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleAdminReply(selectedTicket.id)}
                    disabled={replySubmitting || !adminReplyText.trim()}
                    icon={<Send className="w-3.5 h-3.5" />}
                    className="text-xs font-bold"
                  >
                    {replySubmitting ? 'Sending...' : 'Send Reply to Member'}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-slate-400">
              <LifeBuoy className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Select a ticket from the left column to inspect and reply.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportDashboard;
