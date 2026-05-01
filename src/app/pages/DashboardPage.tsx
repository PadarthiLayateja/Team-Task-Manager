import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import type { DashboardData, Task, Project } from "../lib/types";
import {
  FolderKanban, CheckCircle2, Clock, AlertTriangle, Users,
  TrendingUp, ArrowRight, Calendar, Loader2, Activity,
  ListTodo, ChevronRight, Filter, BarChart3, Circle,
  AlertCircle, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIORITY = {
  high:   { label: "High",   dot: "bg-red-500",    badge: "bg-red-100 text-red-700 border border-red-200"    },
  medium: { label: "Medium", dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-700 border border-amber-200"  },
  low:    { label: "Low",    dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
};

const STATUS = {
  todo:        { label: "To Do",       badge: "bg-slate-100 text-slate-700",   icon: Circle    },
  in_progress: { label: "In Progress", badge: "bg-blue-100 text-blue-700",     icon: RefreshCw },
  completed:   { label: "Completed",   badge: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

const TABS = [
  { key: "all",         label: "All Tasks"   },
  { key: "todo",        label: "To Do"       },
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed"   },
  { key: "overdue",     label: "Overdue"     },
] as const;

type TabKey = typeof TABS[number]["key"];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, bg, ring, onClick, active }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${
        active ? `${ring} ring-2` : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </button>
  );
}

function TaskCard({ task, showProject = true }: { task: Task; showProject?: boolean }) {
  const p = PRIORITY[task.priority as keyof typeof PRIORITY] || PRIORITY.medium;
  const s = STATUS[task.status as keyof typeof STATUS] || STATUS.todo;
  const StatusIcon = s.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-sm ${
      task.isOverdue
        ? "bg-red-50 border-red-200 border-l-4 border-l-red-500"
        : "bg-white border-slate-200"
    }`}>
      {/* Priority dot */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${p.dot}`} />

      <div className="flex-1 min-w-0">
        {/* Title & overdue badge */}
        <div className="flex items-start gap-2 flex-wrap">
          <p className={`text-sm font-semibold leading-snug ${task.isOverdue ? "text-red-900" : "text-slate-800"}`}>
            {task.title}
          </p>
          {task.isOverdue && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-md flex-shrink-0">
              <AlertCircle className="w-2.5 h-2.5" /> OVERDUE
            </span>
          )}
        </div>

        {/* Project + Assignee */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {showProject && task.projectTitle && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <FolderKanban className="w-3 h-3" />
              {task.projectTitle}
            </span>
          )}
          {task.assigneeName && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {task.assigneeName}
            </span>
          )}
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
            {p.label}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.badge}`}>
            <StatusIcon className="w-2.5 h-2.5" />
            {s.label}
          </span>
          {task.deadline && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
              task.isOverdue ? "text-red-600 font-bold" : "text-slate-400"
            }`}>
              <Calendar className="w-3 h-3" />
              {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectProgressCard({ project, taskCounts }: {
  project: Project;
  taskCounts: { total: number; completed: number };
}) {
  const pct = taskCounts.total ? Math.round((taskCounts.completed / taskCounts.total) * 100) : 0;
  const isOverdue = project.deadline && new Date(project.deadline) < new Date();

  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex flex-col gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <FolderKanban className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition">
              {project.title}
            </p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3" /> {project.members.length} members
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition flex-shrink-0 mt-1" />
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
          <span>{taskCounts.completed}/{taskCounts.total} tasks done</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {project.deadline && (
        <p className={`text-[11px] flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : "text-slate-400"}`}>
          <Calendar className="w-3 h-3" />
          {isOverdue ? "Overdue · " : "Due · "}
          {new Date(project.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      )}
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getAllTasks()])
      .then(([dash, tasks]) => {
        setDashData(dash);
        setAllTasks(tasks.tasks);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Computed task lists
  const overdueTasks = useMemo(() => allTasks.filter(t => t.isOverdue), [allTasks]);

  const filteredTasks = useMemo(() => {
    let tasks = allTasks;
    if (activeTab === "overdue") tasks = tasks.filter(t => t.isOverdue);
    else if (activeTab !== "all") tasks = tasks.filter(t => t.status === activeTab);
    // Sort: overdue first, then by priority, then by deadline
    return [...tasks].sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      const po = { high: 0, medium: 1, low: 2 };
      const pa = po[a.priority as keyof typeof po] ?? 1;
      const pb = po[b.priority as keyof typeof po] ?? 1;
      if (pa !== pb) return pa - pb;
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      return 0;
    });
  }, [allTasks, activeTab]);

  // Stats
  const stats = dashData?.stats;
  const total = allTasks.length;
  const todoCount = allTasks.filter(t => t.status === "todo").length;
  const inProgressCount = allTasks.filter(t => t.status === "in_progress").length;
  const completedCount = allTasks.filter(t => t.status === "completed").length;
  const overdueCount = overdueTasks.length;
  const completionPct = total ? Math.round((completedCount / total) * 100) : 0;

  // Project task counts
  const projectTaskCounts = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {};
    allTasks.forEach(t => {
      if (!map[t.projectId]) map[t.projectId] = { total: 0, completed: 0 };
      map[t.projectId].total++;
      if (t.status === "completed") map[t.projectId].completed++;
    });
    return map;
  }, [allTasks]);

  const chartData = [
    { name: "To Do",       value: todoCount,       fill: "#94a3b8" },
    { name: "In Progress", value: inProgressCount, fill: "#3b82f6" },
    { name: "Completed",   value: completedCount,  fill: "#10b981" },
  ].filter(d => d.value > 0);

  const tabCount = (tab: TabKey) => {
    if (tab === "all") return total;
    if (tab === "overdue") return overdueCount;
    return allTasks.filter(t => t.status === tab).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Welcome ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? "Here's a full overview of your workspace."
              : "Here are all your assigned tasks and project progress."}
          </p>
        </div>
        <Link to="/projects"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition shadow-sm flex-shrink-0">
          <FolderKanban className="w-4 h-4" />
          {isAdmin ? "Manage Projects" : "My Projects"}
        </Link>
      </div>

      {/* ── OVERDUE ALERT ── */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800">
                {overdueCount} Overdue Task{overdueCount !== 1 ? "s" : ""} — Immediate Attention Required
              </p>
              <p className="text-xs text-red-600">These tasks have passed their deadlines and are not completed.</p>
            </div>
            <button
              onClick={() => setActiveTab("overdue")}
              className="ml-auto text-xs font-semibold text-red-700 hover:text-red-900 underline flex-shrink-0"
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {overdueTasks.slice(0, 4).map(task => (
              <div key={task.id} className="flex items-start gap-2 p-3 bg-white rounded-xl border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-red-900 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.projectTitle && (
                      <span className="text-[10px] text-red-600 truncate">{task.projectTitle}</span>
                    )}
                    {task.deadline && (
                      <span className="text-[10px] text-red-500 font-medium flex-shrink-0">
                        Due {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {overdueCount > 4 && (
            <p className="text-xs text-red-600 mt-2 text-center">
              +{overdueCount - 4} more overdue task{overdueCount - 4 !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          icon={FolderKanban}
          label="Projects"
          value={stats?.totalProjects ?? 0}
          color="text-indigo-600"
          bg="bg-indigo-50 text-indigo-500"
          ring="ring-indigo-300"
          sub={isAdmin ? `${stats?.totalMembers ?? 0} members` : ""}
        />
        <StatCard
          icon={ListTodo}
          label="To Do"
          value={todoCount}
          color="text-slate-700"
          bg="bg-slate-100 text-slate-500"
          ring="ring-slate-300"
          active={activeTab === "todo"}
          onClick={() => setActiveTab(t => t === "todo" ? "all" : "todo")}
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          value={inProgressCount}
          color="text-blue-600"
          bg="bg-blue-50 text-blue-500"
          ring="ring-blue-300"
          active={activeTab === "in_progress"}
          onClick={() => setActiveTab(t => t === "in_progress" ? "all" : "in_progress")}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={completedCount}
          sub={`${completionPct}% of total`}
          color="text-emerald-600"
          bg="bg-emerald-50 text-emerald-500"
          ring="ring-emerald-300"
          active={activeTab === "completed"}
          onClick={() => setActiveTab(t => t === "completed" ? "all" : "completed")}
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={overdueCount}
          color={overdueCount > 0 ? "text-red-600" : "text-slate-500"}
          bg={overdueCount > 0 ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-400"}
          ring="ring-red-300"
          active={activeTab === "overdue"}
          onClick={() => setActiveTab(t => t === "overdue" ? "all" : "overdue")}
        />
      </div>

      {/* ── Progress Bar ── */}
      {total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Overall Progress</p>
            <span className="text-sm font-bold text-slate-800">{completionPct}% Complete</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${completionPct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-slate-400">
            <span>{completedCount} completed</span>
            <span>{inProgressCount} in progress</span>
            <span>{todoCount} to do</span>
          </div>
        </div>
      )}

      {/* ── Charts + Projects ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Task Distribution</h3>
          </div>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={4} dataKey="value">
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, name: string) => [`${v} tasks`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {chartData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
                      <span className="text-xs text-slate-500">{d.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-36 text-center">
              <BarChart3 className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No tasks yet</p>
            </div>
          )}
        </div>

        {/* Projects with progress */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">
              {isAdmin ? "All Projects" : "My Projects"}
            </h3>
            <Link to="/projects" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {dashData?.projects && dashData.projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dashData.projects.map(proj => (
                <ProjectProgressCard
                  key={proj.id}
                  project={proj}
                  taskCounts={projectTaskCounts[proj.id] || { total: 0, completed: 0 }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <FolderKanban className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No projects yet</p>
              {isAdmin && (
                <Link to="/projects" className="text-xs text-indigo-600 mt-1 hover:underline">Create your first project →</Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── All Tasks Section ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-0">
            <ListTodo className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">
              {isAdmin ? "All Tasks" : "My Assigned Tasks"}
            </h3>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 pb-0 overflow-x-auto">
          {TABS.map(tab => {
            const count = tabCount(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap rounded-xl transition border ${
                  isActive
                    ? tab.key === "overdue"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-indigo-600 text-white border-indigo-600"
                    : tab.key === "overdue" && count > 0
                      ? "text-red-600 border-red-200 bg-red-50 hover:bg-red-100"
                      : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                {tab.key === "overdue" && count > 0 && !isActive && (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isActive ? "bg-white/20" : "bg-slate-100 text-slate-500"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Task list */}
        <div className="p-4 pt-3">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <CheckCircle2 className="w-9 h-9 text-slate-200 mb-2" />
              <p className="text-sm font-medium text-slate-500">
                {activeTab === "completed" ? "No completed tasks yet" :
                 activeTab === "overdue" ? "No overdue tasks! Great work 🎉" :
                 activeTab === "all" ? "No tasks assigned yet" :
                 `No tasks with status "${activeTab.replace("_", " ")}"`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Log (Admin only) ── */}
      {isAdmin && dashData?.activityLogs && dashData.activityLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">Recent Activity</h3>
            </div>
            <Link to="/activity" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Full log <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {dashData.activityLogs.slice(0, 6).map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-indigo-600">
                    {(log.userName || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 font-medium">{log.detail}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(log.timestamp).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0 capitalize">
                  {log.action?.toLowerCase().replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
