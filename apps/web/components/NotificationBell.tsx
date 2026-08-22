import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  Bell, 
  RefreshCw, 
  Check, 
  Clock, 
  X, 
  ExternalLink,
  Shield,
  Activity,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { NotificationDetailsRenderer } from './NotificationDetailsRenderer';
import { formatEntityTitle, formatUserDisplayName } from '../utils/entityFormatter';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';



export interface NotificationItem {
  id: string | number;
  sourceProject?: string;
  sourceProjectName?: string;
  actorId: string;
  actorName: string;
  action: string;
  friendlyAction?: string;
  targetType: string;
  friendlyTarget?: string;
  severity?: 'INFO' | 'WARN' | 'CRITICAL' | string;
  type?: 'toast' | 'telemetry' | 'system' | 'security' | 'announcement';
  reason?: string;
  recordId?: string | null;
  metadataJson?: string | null;
  createdAt: string;
}

export const NotificationBell: React.FC = () => {
  const { token, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullHistoryOpen, setIsFullHistoryOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [localToasts, setLocalToasts] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'toasts' | 'ledger' | 'security' | 'planning'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ledger_last_read_notif') || '';
    }
    return '';
  });

  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when Full History Modal is open
  useEffect(() => {
    if (!isFullHistoryOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullHistoryOpen]);


  // Listen for real-time in-app toasts
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail) return;
      const t = customEvent.detail;
      const toastNotif: NotificationItem = {
        id: t.id,
        sourceProject: 'ledger',
        sourceProjectName: 'LEDGER',
        actorId: user?.id || 'current-user',
        actorName: formatUserDisplayName(user?.displayName, user?.username, 'You'),
        action: `TOAST_${t.type?.toUpperCase() || 'INFO'}`,
        friendlyAction: formatEntityTitle(t.title || 'In-App Toast Notice'),
        targetType: 'in_app_toast',
        friendlyTarget: 'App UI Toast',
        severity: t.type === 'error' ? 'CRITICAL' : t.type === 'warning' ? 'WARN' : 'INFO',
        type: 'toast',
        reason: t.message,
        createdAt: t.timestamp || new Date().toISOString()
      };

      setLocalToasts(prev => [toastNotif, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    };

    window.addEventListener('ledger-inapp-toast', handleToast);
    return () => window.removeEventListener('ledger-inapp-toast', handleToast);
  }, [user]);

  const fetchNotifications = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const envelope = await res.json() as any;
        if (envelope.success && Array.isArray(envelope.notifications)) {
          setNotifications(envelope.notifications);
        }
      }
    } catch (e) {
      console.warn('[NotificationBell] Failed to fetch notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000); // 45s live polling
    return () => clearInterval(interval);
  }, [token]);

  // Combined notifications (Backend Telemetry + In-App Toasts)
  const allNotifications = React.useMemo(() => {
    const map = new Map<string, NotificationItem>();
    [...localToasts, ...notifications].forEach(item => {
      map.set(String(item.id), item);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [localToasts, notifications]);

  useEffect(() => {
    if (lastReadTimestamp) {
      const count = allNotifications.filter(
        (n: NotificationItem) => new Date(n.createdAt).getTime() > new Date(lastReadTimestamp).getTime()
      ).length;
      setUnreadCount(count);
    } else {
      setUnreadCount(Math.min(allNotifications.length, 5));
    }
  }, [allNotifications, lastReadTimestamp]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    const now = new Date().toISOString();
    setLastReadTimestamp(now);
    setUnreadCount(0);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ledger_last_read_notif', now);
    }
  };

  const getActionBadge = (action: string, type?: string) => {
    if (type === 'toast' || action.startsWith('TOAST_')) {
      return { label: 'In-App Toast', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
    }
    if (action.includes('AUTH') || action.includes('LOGIN') || action.includes('PASSKEY') || action.includes('BYPASS')) {
      return { label: 'Security', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
    if (action.includes('TRANSACTION') || action.includes('EXPENSE')) {
      return { label: 'Finance', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
    }
    if (action.includes('BILL') || action.includes('SUBSCRIPTION') || action.includes('PLANNING')) {
      return { label: 'Planning', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    }
    if (action.includes('DELETE')) {
      return { label: 'Deletion', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    }
    return { label: 'Fleet', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  };

  const getProjectBadge = (source?: string, sourceName?: string) => {
    const key = (source || 'ledger').toLowerCase();
    if (key === 'ledger') {
      return { label: 'LEDGER', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
    }
    return { label: sourceName || 'Foundation', bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
  };

  const filteredNotifications = allNotifications.filter(n => {
    if (filter === 'toasts') return n.type === 'toast' || n.action.startsWith('TOAST_');
    if (filter === 'ledger') return (n.sourceProject || '').toLowerCase() === 'ledger';
    if (filter === 'security') return n.action.includes('AUTH') || n.action.includes('LOGIN') || n.action.includes('PASSKEY') || n.action.includes('BYPASS');
    if (filter === 'planning') return n.action.includes('BILL') || n.action.includes('SUBSCRIPTION') || n.targetType.includes('planning');
    return true;
  });

  const fullHistoryFiltered = allNotifications.filter(n => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      (n.friendlyAction && n.friendlyAction.toLowerCase().includes(q)) ||
      n.action.toLowerCase().includes(q) ||
      n.targetType.toLowerCase().includes(q) ||
      (n.actorName && n.actorName.toLowerCase().includes(q)) ||
      (n.reason && n.reason.toLowerCase().includes(q)) ||
      (n.sourceProject && n.sourceProject.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button Trigger */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            handleMarkAllRead();
          }
        }}
        className={`relative p-2 rounded-xl border transition-all text-secondary hover:text-white cursor-pointer ${
          isOpen 
            ? 'bg-primary/20 text-primary border-primary/40 shadow-lg shadow-primary/20' 
            : 'hover:bg-white/5 border-transparent hover:border-glass-border'
        }`}
        title="Notifications & Live Activity"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-slate-950 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-slate-900 shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-full right-0 mt-3 w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl z-[2001] flex flex-col max-h-[80vh]"

          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 text-primary">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Notifications & Activity</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-primary/20 text-primary text-[10px] font-mono rounded">
                        {unreadCount} new
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-slate-400">Real-time alerts & activity feed</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={fetchNotifications}
                  disabled={isLoading}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Refresh Activity"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-colors text-[11px] flex items-center gap-1 font-bold cursor-pointer"
                    title="Mark all as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex px-3 pt-2.5 pb-2 border-b border-white/5 gap-1 bg-slate-950/30 shrink-0 overflow-x-auto custom-scrollbar">
              {(['all', 'toasts', 'ledger', 'security', 'planning'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    filter === tab 
                      ? 'bg-primary text-slate-950 shadow-sm font-black' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>


            {/* Notification Feed List */}
            <div className="overflow-y-auto divide-y divide-white/5 custom-scrollbar flex-1 max-h-[380px]">
              {isLoading && notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading notifications...</span>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <p className="font-bold text-slate-400">No activity logged</p>
                  <p className="text-[10px] text-slate-600 mt-1">Events will appear here in real time</p>
                </div>
              ) : (
                filteredNotifications.slice(0, 15).map((notif) => {
                  const isUnread = lastReadTimestamp 
                    ? new Date(notif.createdAt).getTime() > new Date(lastReadTimestamp).getTime()
                    : false;
                  const badge = getActionBadge(notif.action, notif.type);
                  const projBadge = getProjectBadge(notif.sourceProject, notif.sourceProjectName);


                  return (
                    <div
                      key={notif.id}
                      onClick={() => setSelectedNotif(selectedNotif?.id === notif.id ? null : notif)}
                      className={`p-3.5 hover:bg-white/5 transition-all cursor-pointer relative group ${
                        isUnread ? 'bg-primary/[0.04]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 animate-pulse" />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${projBadge.bg}`}>
                                {projBadge.label}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${badge.bg}`}>
                                {badge.label}
                              </span>
                              {notif.friendlyTarget && (
                                <span className="text-[10px] text-slate-400 font-medium truncate hidden sm:inline">
                                  {notif.friendlyTarget}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 shrink-0">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(notif.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">
                            {notif.friendlyAction || notif.action.replace(/_/g, ' ')}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                            <span className="truncate text-slate-400">
                              By <strong className="text-slate-200 font-semibold">{notif.actorName}</strong>
                            </span>
                            {notif.reason && (
                              <span className="text-[9px] text-slate-500 font-mono truncate max-w-[120px]">
                                {notif.reason}
                              </span>
                            )}
                          </div>

                          {/* Expanded detail box */}
                          {selectedNotif?.id === notif.id && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-2.5"
                            >
                              <NotificationDetailsRenderer 
                                metadata={notif.metadataJson}
                                reason={notif.reason}
                                recordId={notif.recordId}
                                targetType={notif.targetType}
                                friendlyTarget={notif.friendlyTarget}
                                severity={notif.severity}
                                action={notif.action}
                              />

                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer / View Full History Trigger */}
            <div className="p-3 border-t border-white/5 bg-slate-950/80 flex items-center justify-between text-xs shrink-0">
              <span className="text-[10px] text-slate-500">
                {allNotifications.length} events logged
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsFullHistoryOpen(true);
                }}
                className="text-primary hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>View Full History</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full History Modal rendered directly at document root */}
      {typeof document !== 'undefined' && isFullHistoryOpen && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
            <div 
              className="fixed inset-0"
              onClick={() => setIsFullHistoryOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10 bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/60 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Notification & Audit History</h3>
                    <p className="text-xs text-slate-400">Complete chronological audit telemetry connected to Foundation engine</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search telemetry..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 w-48 sm:w-64"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFullHistoryOpen(false)}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* History Table / Feed */}
              <div className="overflow-y-auto p-6 space-y-3 flex-1 custom-scrollbar">
                {fullHistoryFiltered.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-sm">
                    No matching activity logs found.
                  </div>
                ) : (
                  fullHistoryFiltered.map((notif) => {
                    const badge = getActionBadge(notif.action, notif.type);
                    const projBadge = getProjectBadge(notif.sourceProject, notif.sourceProjectName);
                    const isExpanded = selectedNotif?.id === notif.id;

                    return (
                      <div
                        key={notif.id}
                        onClick={() => setSelectedNotif(isExpanded ? null : notif)}
                        className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 hover:border-white/10 transition-all flex flex-col gap-2 cursor-pointer group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${projBadge.bg}`}>
                                {projBadge.label}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${badge.bg}`}>
                                {badge.label}
                              </span>
                              <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                                {notif.friendlyAction || notif.action.replace(/_/g, ' ')}
                              </h4>
                            </div>
                            <p className="text-xs text-slate-400">
                              Target: <span className="text-slate-200 font-semibold">{notif.friendlyTarget || notif.targetType}</span>
                              {notif.recordId && <span className="ml-2 font-mono text-[10px] text-slate-500">#{notif.recordId}</span>}
                              {notif.reason && <span className="ml-2 italic text-slate-400">({notif.reason})</span>}
                            </p>
                          </div>

                          <div className="text-left sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1">
                            <div className="text-xs font-semibold text-slate-300">{notif.actorName}</div>
                            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(notif.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Always full, structured, human-readable details upon click or available */}
                        {isExpanded && (
                          <div className="mt-1">
                            <NotificationDetailsRenderer 
                              metadata={notif.metadataJson}
                              reason={notif.reason}
                              recordId={notif.recordId}
                              targetType={notif.targetType}
                              friendlyTarget={notif.friendlyTarget}
                              severity={notif.severity}
                              action={notif.action}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
