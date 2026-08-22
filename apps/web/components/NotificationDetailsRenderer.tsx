import React from 'react';
import { 
  Shield, 
  Server, 
  Tag, 
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatEntityTitle } from '../utils/entityFormatter';

interface NotificationDetailsRendererProps {
  metadata: any;
  reason?: string;
  recordId?: string | null;
  targetType?: string;
  friendlyTarget?: string;
  severity?: string;
  action?: string;
}

export const NotificationDetailsRenderer: React.FC<NotificationDetailsRendererProps> = ({
  metadata,
  reason,
  recordId,
  targetType,
  friendlyTarget,
  severity,
  action
}) => {
  // Parse raw metadata if needed
  let data: Record<string, any> = {};
  if (typeof metadata === 'string') {
    try {
      data = JSON.parse(metadata);
    } catch {
      data = { note: metadata };
    }
  } else if (metadata && typeof metadata === 'object') {
    data = metadata;
  }

  // Format key names into clean, human-readable labels
  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Format value into human-readable text / badge
  const renderValue = (val: any): React.ReactNode => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-500 italic">None</span>;
    }
    if (typeof val === 'boolean') {
      return (
        <span className={`inline-flex items-center gap-1 font-semibold ${val ? 'text-emerald-400' : 'text-slate-400'}`}>
          {val ? 'Enabled' : 'Disabled'}
        </span>
      );
    }
    if (typeof val === 'number') {
      return <span className="font-mono text-slate-200">{val.toLocaleString()}</span>;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-slate-500 italic">Empty</span>;
      return (
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {val.map((item, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-slate-800/80 border border-white/5 rounded-md text-[10px] text-slate-200">
              {typeof item === 'object' && item !== null ? (
                Object.entries(item).map(([k, v]) => `${formatKey(k)}: ${typeof v === 'object' ? '...' : String(v)}`).join(' • ')
              ) : (
                String(item)
              )}
            </span>
          ))}
        </div>
      );
    }
    if (typeof val === 'object') {
      return (
        <div className="space-y-1 mt-1 pl-2 border-l border-white/10">
          {Object.entries(val).map(([subK, subV]) => (
            <div key={subK} className="flex flex-col sm:flex-row sm:items-baseline gap-1 text-[11px]">
              <span className="text-slate-400 font-medium">{formatKey(subK)}:</span>
              <span className="text-slate-200">{renderValue(subV)}</span>
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-slate-200 break-words">{String(val)}</span>;
  };

  // Determine target humanized display name and entity title
  const resolvedEntityTitle = friendlyTarget || formatEntityTitle(targetType);
  
  // Extract target's specific display name / title from metadata if present
  const targetDisplayName = data.targetName || data.name || data.title || data.displayName || data.item || data.description || null;

  // Filter out redundant keys already presented in primary context cards
  const entries = Object.entries(data).filter(([k]) => {
    const lk = k.toLowerCase();
    return !['targetname', 'displayname', 'title'].includes(lk);
  });

  return (
    <div className="space-y-2 mt-2 pt-2 border-t border-white/5 text-xs">
      {/* Primary Context Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-white/5">
        {/* Target Entity & Display Name */}
        <div className="flex items-start gap-2">
          <Tag className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Entity</div>
            <div className="text-slate-200 font-bold truncate">
              {targetDisplayName ? `${resolvedEntityTitle}: ${targetDisplayName}` : resolvedEntityTitle}
            </div>
          </div>
        </div>

        {/* Purpose / Context */}
        {reason && (
          <div className="flex items-start gap-2">
            <Activity className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Context & Purpose</div>
              <div className="text-slate-200 font-medium leading-relaxed">{reason}</div>
            </div>
          </div>
        )}

        {/* System Impact */}
        {severity && (
          <div className="flex items-start gap-2">
            <Shield className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${severity === 'CRITICAL' ? 'text-rose-400' : severity === 'WARN' ? 'text-amber-400' : 'text-emerald-400'}`} />
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Impact</div>
              <div className={`font-bold ${severity === 'CRITICAL' ? 'text-rose-400' : severity === 'WARN' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {severity}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Key-Value Parameters (No raw JSON) */}
      {entries.length > 0 && (
        <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5 space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Event Parameters & Attributes
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {entries.map(([key, val]) => (
              <div key={key} className="flex flex-col py-0.5 border-b border-white/[0.03] last:border-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
                  {formatKey(key)}
                </span>
                <div className="text-[11px] font-medium text-slate-200 mt-0.5">
                  {renderValue(val)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
