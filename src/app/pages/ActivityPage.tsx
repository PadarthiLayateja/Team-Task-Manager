import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import {
  Activity, Loader2, FolderKanban, CheckSquare, User, LogIn,
  Trash2, Edit2, Plus, UserCheck, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

const ACTION_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  SIGNUP:        { icon: UserCheck,    color: "text-emerald-600", bg: "bg-emerald-100" },
  LOGIN:         { icon: LogIn,        color: "text-blue-600",    bg: "bg-blue-100"    },
  CREATE:        { icon: Plus,         color: "text-indigo-600",  bg: "bg-indigo-100"  },
  UPDATE:        { icon: Edit2,        color: "text-amber-600",   bg: "bg-amber-100"   },
  UPDATE_STATUS: { icon: RefreshCw,    color: "text-violet-600",  bg: "bg-violet-100"  },
  DELETE:        { icon: Trash2,       color: "text-red-600",     bg: "bg-red-100"     },
};

const RESOURCE_CONFIG: Record<string, { icon: any; color: string }> = {
  project: { icon: FolderKanban, color: "text-indigo-500" },
  task:    { icon: CheckSquare,  color: "text-violet-500" },
  user:    { icon: User,         color: "text-slate-500"  },
};

export default function ActivityPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); return; }
    api.getActivity()
      .then(r => setLogs(r.logs))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, any[]> = {};
  logs.forEach(log => {
    const date = new Date(log.timestamp).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric"
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(log);
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Activity className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Activity Log</h2>
          <p className="text-sm text-slate-500">Track all actions across the workspace</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
          <Activity className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-slate-200" />
                {date}
                <span className="h-px flex-1 bg-slate-200" />
              </p>
              <div className="space-y-2">
                {entries.map(log => {
                  const actionConfig = ACTION_CONFIG[log.action] || ACTION_CONFIG.UPDATE;
                  const resourceConfig = RESOURCE_CONFIG[log.resourceType] || RESOURCE_CONFIG.user;
                  const ActionIcon = actionConfig.icon;
                  const ResourceIcon = resourceConfig.icon;

                  return (
                    <div key={log.id} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${actionConfig.bg}`}>
                        <ActionIcon className={`w-4 h-4 ${actionConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{log.userName}</span>
                          <ResourceIcon className={`w-3.5 h-3.5 ${resourceConfig.color}`} />
                          <span className="text-sm text-slate-600">{log.detail}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(log.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${actionConfig.bg} ${actionConfig.color}`}>
                        {log.action.replace("_", " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
