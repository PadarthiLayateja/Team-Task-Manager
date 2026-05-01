import { useState, useEffect } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import * as api from "../../lib/api";
import type { User, Task } from "../../lib/types";
import { toast } from "sonner";

interface Props {
  projectId: string;
  onClose: () => void;
  onSuccess: (task: Task) => void;
  editTask?: Task | null;
  projectMembers?: string[];
}

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "high", label: "High", color: "bg-red-100 text-red-700 border-red-200" },
];

export function CreateTaskModal({ projectId, onClose, onSuccess, editTask, projectMembers = [] }: Props) {
  const [form, setForm] = useState({
    title: editTask?.title || "",
    description: editTask?.description || "",
    priority: editTask?.priority || "medium",
    deadline: editTask?.deadline?.split("T")[0] || "",
    assignedTo: editTask?.assignedTo || "",
    status: editTask?.status || "todo",
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getUsers().then(r => {
      const filtered = projectMembers.length > 0
        ? r.users.filter(u => projectMembers.includes(u.id))
        : r.users;
      setUsers(filtered);
    }).catch(() => {});
  }, [projectMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Task title is required"); return; }
    setLoading(true);
    try {
      let result;
      if (editTask) {
        result = await api.updateTask(editTask.id, {
          ...form,
          assignedTo: form.assignedTo || null,
        });
        toast.success("Task updated!");
      } else {
        result = await api.createTask({
          projectId,
          ...form,
          assignedTo: form.assignedTo || null,
        });
        toast.success("Task created!");
      }
      onSuccess(result.task);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              {editTask ? "Edit Task" : "New Task"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Task Title *
            </label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Design landing page"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Task details..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 bg-slate-50 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border-2 transition ${
                    form.priority === p.value
                      ? p.color + " border-current scale-105 shadow-sm"
                      : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {editTask && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Status
              </label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 bg-slate-50"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Deadline
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Assign To
            </label>
            <select
              value={form.assignedTo}
              onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 bg-slate-50"
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {editTask ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
