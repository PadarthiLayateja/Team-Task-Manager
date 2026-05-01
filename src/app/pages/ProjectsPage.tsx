import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import type { Project } from "../lib/types";
import { CreateProjectModal } from "../components/modals/CreateProjectModal";
import {
  Plus, FolderKanban, Calendar, Users, Edit2, Trash2,
  Search, Loader2, ArrowRight, MoreVertical, Clock
} from "lucide-react";
import { toast } from "sonner";

function ProjectCard({ project, onEdit, onDelete, isAdmin }: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOverdue = project.deadline && new Date(project.deadline) < new Date();

  const deadlineLabel = project.deadline
    ? new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "No deadline";

  // Color based on project ID for visual variety
  const colors = [
    { bg: "from-indigo-500 to-violet-600", light: "bg-indigo-50", text: "text-indigo-600" },
    { bg: "from-rose-500 to-pink-600", light: "bg-rose-50", text: "text-rose-600" },
    { bg: "from-amber-500 to-orange-600", light: "bg-amber-50", text: "text-amber-600" },
    { bg: "from-emerald-500 to-teal-600", light: "bg-emerald-50", text: "text-emerald-600" },
    { bg: "from-sky-500 to-blue-600", light: "bg-sky-50", text: "text-sky-600" },
  ];
  const colorIdx = project.id.charCodeAt(0) % colors.length;
  const color = colors[colorIdx];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col">
      {/* Card Header with gradient */}
      <div className={`h-2 bg-gradient-to-r ${color.bg}`} />

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className={`w-10 h-10 rounded-xl ${color.light} flex items-center justify-center flex-shrink-0`}>
            <FolderKanban className={`w-5 h-5 ${color.text}`} />
          </div>
          {isAdmin && (
            <div className="relative">
              <button
                onClick={e => { e.preventDefault(); setMenuOpen(m => !m); }}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-100 text-slate-400 transition"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden w-36">
                    <button
                      onClick={e => { e.preventDefault(); setMenuOpen(false); onEdit(project); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={e => { e.preventDefault(); setMenuOpen(false); onDelete(project.id); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <Link to={`/projects/${project.id}`} className="flex-1">
          <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition line-clamp-1">
            {project.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
            {project.description || "No description provided"}
          </p>
        </Link>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              {project.members.length}
            </span>
            <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-500 font-medium" : "text-slate-500"}`}>
              <Clock className="w-3.5 h-3.5" />
              {deadlineLabel}
            </span>
          </div>
          <Link to={`/projects/${project.id}`}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
            Open <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  useEffect(() => {
    api.getProjects()
      .then(r => setProjects(r.projects))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project and all its tasks?")) return;
    try {
      await api.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success("Project deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Projects</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white w-48 lg:w-64"
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
          <FolderKanban className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-700 mb-1">
            {search ? "No projects found" : "No projects yet"}
          </h3>
          <p className="text-sm text-slate-400 mb-4 max-w-xs">
            {search ? `No projects match "${search}"` : isAdmin ? "Create your first project to get started." : "You haven't been added to any projects yet."}
          </p>
          {isAdmin && !search && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              isAdmin={isAdmin}
              onEdit={p => { setEditProject(p); setShowCreate(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          editProject={editProject}
          onClose={() => { setShowCreate(false); setEditProject(null); }}
          onSuccess={updated => {
            if (editProject) {
              setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
            } else {
              setProjects(prev => [updated, ...prev]);
            }
            setEditProject(null);
          }}
        />
      )}
    </div>
  );
}
