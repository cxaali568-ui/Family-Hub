import React, { useState, useEffect } from 'react';
import { MessageSquare, RotateCcw, Send, ChevronDown, Check, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { fetchSupportTickets, postTicketReply, updateTicketStatus } from '../../services/supportService';
import { SupportTicket, SupportMessage } from '../../types/support';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface MyTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewTicket?: () => void;
}

export const MyTicketsModal: React.FC<MyTicketsModalProps> = ({
  isOpen,
  onClose,
  onOpenNewTicket,
}) => {
  const { user } = useAuth();
  const { currentFamily } = useFamily();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchSupportTickets({
        userId: user.id,
        userEmail: user.email,
        familyId: currentFamily?.id,
        isSuperAdmin: false,
      });
      setTickets(data);
      if (data.length > 0 && !selectedTicketId) {
        setSelectedTicketId(data[0].id);
      }
    } catch (err) {
      console.warn('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen, user?.id]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim() || !user) return;
    setSendingReply(true);
    try {
      const res = await postTicketReply({
        ticketId: selectedTicket.id,
        message: replyText.trim(),
        senderId: user.id,
        senderName: user.name || 'User',
        senderEmail: user.email || '',
        senderRole: 'user',
      });

      if (res.success && res.message) {
        setTickets(prev =>
          prev.map(t =>
            t.id === selectedTicket.id
              ? {
                  ...t,
                  messages: [...(t.messages || []), res.message!],
                  status: 'in_progress',
                  updatedAt: Date.now(),
                }
              : t
          )
        );
        setReplyText('');
      }
    } catch (e) {
      console.error('Failed to post reply:', e);
    } finally {
      setSendingReply(false);
    }
  };

  const handleReopen = async (ticketId: string) => {
    try {
      await updateTicketStatus(ticketId, { status: 'open' });
      setTickets(prev =>
        prev.map(t => (t.id === ticketId ? { ...t, status: 'open', updatedAt: Date.now() } : t))
      );
    } catch (e) {
      console.error('Failed to reopen:', e);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="My Support Requests"
      subtitle="View your submitted tickets and read replies from the Support Team."
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500">
            {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} submitted
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={loadTickets}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
            {onOpenNewTicket && (
              <Button size="sm" variant="outline" onClick={onOpenNewTicket} className="text-xs">
                + New Ticket
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading your tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="py-10 text-center space-y-2 text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium">You have not submitted any support tickets yet.</p>
            {onOpenNewTicket && (
              <Button size="sm" variant="primary" onClick={onOpenNewTicket} className="text-xs mt-2">
                Submit a Support Ticket
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 max-h-[60vh] overflow-hidden">
            {/* Left Column: Tickets List */}
            <div className="md:col-span-5 space-y-2 overflow-y-auto pr-1 max-h-[420px]">
              {tickets.map(t => {
                const isSelected = selectedTicketId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-3 rounded-xl border text-xs transition-colors cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                        {t.referenceId}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                          t.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : t.status === 'in_progress'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : t.status === 'waiting_user'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {t.subject}
                    </h4>

                    <p className="text-[10px] text-slate-400">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Ticket Conversation Detail */}
            <div className="md:col-span-7 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between overflow-y-auto max-h-[420px] bg-slate-50/40 dark:bg-slate-900/40">
              {selectedTicket ? (
                <div className="space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-3 overflow-y-auto pr-1">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {selectedTicket.referenceId}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(selectedTicket.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {selectedTicket.subject}
                      </h3>
                    </div>

                    {/* Original Complaint */}
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {selectedTicket.description}
                    </div>

                    {/* Attachments if any */}
                    {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Attachment:</p>
                        {selectedTicket.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 text-xs flex items-center justify-between"
                          >
                            <span className="truncate">{att.name}</span>
                            {att.url && att.url.startsWith('data:image') && (
                              <img src={att.url} alt={att.name} className="w-10 h-10 object-cover rounded" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Messages Thread */}
                    {selectedTicket.messages && selectedTicket.messages.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Support Conversation:
                        </p>
                        {selectedTicket.messages.map(m => (
                          <div
                            key={m.id}
                            className={`p-2.5 rounded-xl text-xs space-y-1 ${
                              m.senderRole === 'admin'
                                ? 'bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-100'
                                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold">
                                {m.senderRole === 'admin' ? '🛡️ FamilyHub Support Team' : 'You'}
                              </span>
                              <span className="text-slate-400">
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reply Composer */}
                  {selectedTicket.status !== 'closed' ? (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-2 mt-2">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Reply to the Support Team..."
                        rows={2}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      />
                      <div className="flex items-center justify-between">
                        {selectedTicket.status === 'resolved' && (
                          <button
                            type="button"
                            onClick={() => handleReopen(selectedTicket.id)}
                            className="text-xs font-semibold text-amber-600 hover:underline cursor-pointer"
                          >
                            Reopen Ticket
                          </button>
                        )}
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={handleSendReply}
                          disabled={sendingReply || !replyText.trim()}
                          loading={sendingReply}
                          icon={<Send className="w-3.5 h-3.5" />}
                          className="text-xs font-bold ml-auto"
                        >
                          Send Reply
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 text-center text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      This ticket is closed.
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Select a ticket from the left to view details.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MyTicketsModal;
