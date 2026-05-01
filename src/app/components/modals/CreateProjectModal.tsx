import { useState, useEffect } from "react";
import { X, FolderPlus, Loader2, Users } from "lucide-react";
import * as api from "../../lib/api";
import type { User, Project } from "../../lib/types";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onSuccess: (project: Project) => void;
  editProject?: Project | null;
}

export function CreateProjectModal({ onClose, onSuccess, editProject }: Props) {
  const [form, setForm] = useState({
    title: editProject?.title || "",
    description: editProject?.description || "",
    deadline: editProject?.deadline?.split("T")[0] || "",
    members: editProject?.members || [] as string[],
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getUsers().then(r => setUsers(r.users)).catch(() => {});
  }, []);

  const toggleMember = (uid: string) => {
    setForm(f => ({
      ...f,
      members: f.members.includes(uid) ? f.members.filter(m => m !== uid) : [...f.members, uid],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setLoading(true);
    try {
      let result;
      if (editProject) {
        result = await api.updateProject(editProject.id, form);
        toast.success("Project updated!");
      } else {
        result = await api.createProject(form);
        toast.success("Project created!");
      }
      onSuccess(result.project);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              {editProject ? "Edit Project" : "New Project"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Project Title *
            </label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Website Redesign"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief project description..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-slate-50 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Deadline
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-slate-50"
            />
          </div>

          {users.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                <Users className="w-3.5 h-3.5 inline mr-1" />
                Assign Members
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <input
                      type="checkbox"
                      checked={form.members.includes(u.id)}
                      onChange={() => toggleMember(u.id)}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                      u.role === "admin" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                    }`}>{u.role}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {editProject ? "Save Changes" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
