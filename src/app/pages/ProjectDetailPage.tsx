import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import type { Project, Task, User, TaskStatus } from "../lib/types";
import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { CreateTaskModal } from "../components/modals/CreateTaskModal";
import { CreateProjectModal } from "../components/modals/CreateProjectModal";
import {
  ArrowLeft, Plus, Users, Calendar, Edit2, Trash2,
  Loader2, AlertTriangle, CheckCircle2, Clock, ListTodo,
  UserPlus, X, FolderKanban, MoreVertical, LayoutGrid,
  List, ChevronRight, AlertCircle, Flag, Filter
} from "lucide-react";
import { toast } from "sonner";

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIORITY_CFG = {
  high:   { label: "High",   dot: "bg-red-500",    badge: "bg-red-100 text-red-700 border-red-200"      },
  medium: { label: "Medium", dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-700 border-amber-200"  },
  low:    { label: "Low",    dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const STATUS_CFG: Record<string, { label: string; badge: string }> = {
  todo:        { label: "To Do",       badge: "bg-slate-100 text-slate-700"   },
  in_progress: { label: "In Progress", badge: "bg-blue-100 text-blue-700"     },
  completed:   { label: "Completed",   badge: "bg-emerald-100 text-emerald-700" },
};

// Member's quick status update button
function StatusChanger({ task, onUpdate }: { task: Task; onUpdate: (t: Task) => void }) {
  const [loading, setLoading] = useState(false);
  const statuses: TaskStatus[] = ["todo", "in_progress", "completed"];
  const currentIdx = statuses.indexOf(task.status as TaskStatus);

  const advance = async () => {
    const next = statuses[(currentIdx + 1) % statuses.length];
    setLoading(true);
    try {
      const { task: updated } = await api.updateTask(task.id, { status: next });
      onUpdate(updated);
      toast.success(`Moved to ${STATUS_CFG[next].label}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const next = statuses[(currentIdx + 1) % statuses.length];
  return (
    <button
      onClick={advance}
      disabled={loading}
      title={`Move to "${STATUS_CFG[next]?.label}"`}
      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition hover:opacity-80 disabled:opacity-50 ${STATUS_CFG[task.status]?.badge || ""}`}
    >
      {loading ? "..." : STATUS_CFG[task.status]?.label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getProject(id),
      api.getProjectTasks(id),
      api.getUsers(),
    ]).then(([pRes, tRes, uRes]) => {
      setProject(pRes.project);
      setTasks(tRes.tasks);
      setUsers(uRes.users);
    }).catch(err => {
      toast.error(err.message);
      navigate("/projects");
    }).finally(() => setLoading(false));
  }, [id]);

  const handleTaskUpdate = (updated: Task) =>
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));

  const handleTaskDelete = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await api.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success("Task deleted");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleProjectDelete = async () => {
    if (!project || !confirm(`Delete "${project.title}" and all its tasks?`)) return;
    try {
      await api.deleteProject(project.id);
      toast.success("Project deleted");
      navigate("/projects");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!project) return;
    try {
      const r = await api.removeProjectMember(project.id, userId);
      setProject(r.project);
      toast.success("Member removed");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddMember = async (userId: string) => {
    if (!project) return;
    try {
      const r = await api.addProjectMember(project.id, userId);
      setProject(r.project);
      toast.success("Member added");
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }
  if (!project) return null;

  const memberUsers = users.filter(u => project.members.includes(u.id));
  const nonMemberUsers = users.filter(u => !project.members.includes(u.id));
  const isOverdueProject = project.deadline && new Date(project.deadline) < new Date();

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const overdueTasks = tasks.filter(t => t.isOverdue);

  // My tasks (member view)
  const myTasks = tasks.filter(t => t.assignedTo === user?.id);

  // Filtered list view tasks
  const listTasks = tasks
    .filter(t => filterStatus === "all" || t.status === filterStatus)
    .filter(t => filterPriority === "all" || t.priority === filterPriority)
    .sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      const po = { high: 0, medium: 1, low: 2 };
      return (po[a.priority as keyof typeof po] ?? 1) - (po[b.priority as keyof typeof po] ?? 1);
    });

  const completionPct = tasks.length
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Project Header ── */}
      <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <Link to="/projects" className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 flex-shrink-0 mt-1">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900">{project.title}</h2>
                  {isOverdueProject && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full border border-red-200">
                      <AlertTriangle className="w-3 h-3" /> PROJECT OVERDUE
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {project.deadline && (
                    <span className={`flex items-center gap-1 text-xs font-medium ${isOverdueProject ? "text-red-600" : "text-slate-500"}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      Deadline: {new Date(project.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                  <button
                    onClick={() => setShowMembers(m => !m)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 transition"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {memberUsers.length} member{memberUsers.length !== 1 ? "s" : ""}
                    <ChevronRight className={`w-3 h-3 transition-transform ${showMembers ? "rotate-90" : ""}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* View toggle */}
              <div className="hidden sm:flex border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                <button onClick={() => setView("kanban")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${view === "kanban" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                  <LayoutGrid className="w-3.5 h-3.5" /> Kanban
                </button>
                <button onClick={() => setView("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${view === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                  <List className="w-3.5 h-3.5" /> List
                </button>
              </div>
              {isAdmin && (
                <>
                  <button onClick={() => { setEditTask(null); setShowCreateTask(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition shadow-sm">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Task</span>
                  </button>
                  <div className="relative group">
                    <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-11 z-20 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-44 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all">
                      <button onClick={() => setShowEditProject(true)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                        <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Edit Project
                      </button>
                      <div className="border-t border-slate-100" />
                      <button onClick={handleProjectDelete}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" /> Delete Project
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Task Stats Row */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 flex-wrap">
            {[
              { icon: ListTodo,      label: "To Do",       value: todoTasks.length,       color: "text-slate-600"  },
              { icon: Clock,         label: "In Progress", value: inProgressTasks.length, color: "text-blue-600"   },
              { icon: CheckCircle2,  label: "Completed",   value: completedTasks.length,  color: "text-emerald-600" },
              { icon: AlertTriangle, label: "Overdue",     value: overdueTasks.length,    color: "text-red-500"    },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
                <span className="text-xs text-slate-400">{s.label}</span>
              </div>
            ))}
            {tasks.length > 0 && (
              <div className="ml-auto flex items-center gap-2 hidden sm:flex">
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completionPct}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-600">{completionPct}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Members Panel ── */}
      {showMembers && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 lg:px-6 py-4 flex-shrink-0">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4" /> Team Members on this Project
              </h3>
              {isAdmin && nonMemberUsers.length > 0 && (
                <p className="text-xs text-slate-400">Click a name below to add them</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Current members */}
              {memberUsers.map(u => (
                <div key={u.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-indigo-600">{u.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{u.name}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${u.role === "admin" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"}`}>
                    {u.role}
                  </span>
                  {isAdmin && u.id !== project.createdBy && (
                    <button onClick={() => handleRemoveMember(u.id)} className="text-slate-300 hover:text-red-500 transition">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {/* Add members (admin) */}
              {isAdmin && nonMemberUsers.map(u => (
                <button key={u.id} onClick={() => handleAddMember(u.id)}
                  className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl text-sm text-slate-400 hover:text-indigo-600 transition">
                  <UserPlus className="w-3.5 h-3.5" /> {u.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Overdue Alert Banner ── */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-4 lg:px-6 py-3 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-red-800">
                {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""} on this project
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {overdueTasks.slice(0, 3).map(t => (
                  <span key={t.id} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium truncate max-w-[150px]">
                    {t.title}
                  </span>
                ))}
                {overdueTasks.length > 3 && (
                  <span className="text-[10px] text-red-600">+{overdueTasks.length - 3} more</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <FolderKanban className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-1">No tasks yet</h3>
            <p className="text-sm text-slate-400 mb-4 max-w-xs">
              {isAdmin
                ? "Add tasks to this project to start tracking work."
                : "No tasks have been assigned to this project yet."}
            </p>
            {isAdmin && (
              <button onClick={() => setShowCreateTask(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm">
                <Plus className="w-4 h-4" /> Add First Task
              </button>
            )}
          </div>

        ) : view === "kanban" ? (
          <div className="p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              <KanbanBoard
                tasks={tasks}
                users={users}
                onTaskUpdate={handleTaskUpdate}
                onTaskEdit={task => { setEditTask(task); setShowCreateTask(true); }}
                onTaskDelete={handleTaskDelete}
              />
            </div>
          </div>

        ) : (
          /* ── List View ── */
          <div className="p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              {/* Filters */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {["all", "todo", "in_progress", "completed"].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        filterStatus === s
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                      }`}>
                      {s === "all" ? "All Status" : STATUS_CFG[s]?.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {["all", "high", "medium", "low"].map(p => (
                    <button key={p} onClick={() => setFilterPriority(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        filterPriority === p
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}>
                      {p === "all" ? "All Priority" : PRIORITY_CFG[p as keyof typeof PRIORITY_CFG]?.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400 ml-auto">{listTasks.length} task{listTasks.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Task</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Assignee</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Priority</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Deadline</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {listTasks.map(task => {
                        const p = PRIORITY_CFG[task.priority as keyof typeof PRIORITY_CFG] || PRIORITY_CFG.medium;
                        const s = STATUS_CFG[task.status] || STATUS_CFG.todo;
                        const assignee = users.find(u => u.id === task.assignedTo);
                        const isMyTask = task.assignedTo === user?.id;
                        return (
                          <tr key={task.id} className={`hover:bg-slate-50/80 transition ${
                            task.isOverdue ? "bg-red-50/60" : ""
                          }`}>
                            <td className="px-4 py-3.5">
                              <div className="flex items-start gap-2">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${p.dot}`} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-800 leading-snug">{task.title}</p>
                                    {task.isOverdue && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded">
                                        <AlertCircle className="w-2.5 h-2.5" /> OVERDUE
                                      </span>
                                    )}
                                    {isMyTask && !isAdmin && (
                                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[9px] font-bold rounded">MINE</span>
                                    )}
                                  </div>
                                  {task.description && (
                                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{task.description}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 hidden md:table-cell">
                              {assignee ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-[9px] font-bold text-indigo-600">{assignee.name.charAt(0)}</span>
                                  </div>
                                  <span className="text-slate-600 text-xs">{assignee.name}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Unassigned</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 hidden sm:table-cell">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} /> {p.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 hidden lg:table-cell">
                              <span className={`text-xs ${task.isOverdue ? "text-red-600 font-bold" : "text-slate-500"}`}>
                                {task.deadline
                                  ? new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                  : "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {/* Members see a click-to-advance button for their own tasks */}
                              {!isAdmin && isMyTask ? (
                                <StatusChanger task={task} onUpdate={handleTaskUpdate} />
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.badge}`}>{s.label}</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-0.5 justify-end">
                                {isAdmin && (
                                  <>
                                    <button onClick={() => { setEditTask(task); setShowCreateTask(true); }}
                                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleTaskDelete(task.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showCreateTask && (
        <CreateTaskModal
          projectId={project.id}
          editTask={editTask}
          projectMembers={project.members}
          onClose={() => { setShowCreateTask(false); setEditTask(null); }}
          onSuccess={task => {
            setTasks(prev =>
              editTask
                ? prev.map(t => t.id === task.id ? task : t)
                : [...prev, task]
            );
            setEditTask(null);
          }}
        />
      )}

      {showEditProject && (
        <CreateProjectModal
          editProject={project}
          onClose={() => setShowEditProject(false)}
          onSuccess={updated => { setProject(updated); toast.success("Project updated!"); }}
        />
      )}
    </div>
  );
}