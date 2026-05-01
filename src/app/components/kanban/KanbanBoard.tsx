import { useState, useRef } from "react";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { Task, TaskStatus, User } from "../../lib/types";
import { useAuth } from "../../context/AuthContext";
import * as api from "../../lib/api";
import { toast } from "sonner";
import {
  AlertTriangle, MoreHorizontal, Edit2, Trash2,
  Calendar
} from "lucide-react";

// ─── Priority Config ─────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  high:   { label: "High",   color: "text-red-600",   bg: "bg-red-50 border-red-200",   dot: "bg-red-500"   },
  medium: { label: "Medium", color: "text-amber-600",  bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  low:    { label: "Low",    color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
};

const STATUS_COLUMNS: { status: TaskStatus; label: string; color: string; bg: string; border: string; count_bg: string }[] = [
  { status: "todo",        label: "To Do",       color: "text-slate-700",  bg: "bg-slate-100",  border: "border-slate-200", count_bg: "bg-slate-300 text-slate-700" },
  { status: "in_progress", label: "In Progress", color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",  count_bg: "bg-blue-200 text-blue-800"  },
  { status: "completed",   label: "Completed",   color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", count_bg: "bg-emerald-200 text-emerald-800" },
];

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  users: User[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

function TaskCard({ task, users, onEdit, onDelete }: TaskCardProps) {
  const { isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "TASK",
    item: { id: task.id, status: task.status },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });

  drag(ref);

  const assignee = users.find(u => u.id === task.assignedTo);
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isOverdue = task.isOverdue || (task.deadline && new Date(task.deadline) < new Date() && task.status !== "completed");

  const formatDate = (d: string) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div
      ref={ref}
      className={`bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative ${
        isDragging ? "opacity-40 scale-95 rotate-2" : ""
      } ${isOverdue ? "border-l-4 border-l-red-400" : ""}`}
    >
      {/* Overdue badge */}
      {isOverdue && (
        <div className="flex items-center gap-1 text-red-600 text-[10px] font-semibold mb-2">
          <AlertTriangle className="w-3 h-3" />
          OVERDUE
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-slate-800 leading-snug flex-1">{task.title}</p>
        {isAdmin && (
          <div className="relative flex-shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
              className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden w-36">
                  <button
                    onClick={() => { setMenuOpen(false); onEdit(task); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(task.id); }}
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

      {task.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${priority.bg} ${priority.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
          {priority.label}
        </span>

        {task.deadline && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${
            isOverdue ? "text-red-500" : "text-slate-400"
          }`}>
            <Calendar className="w-3 h-3" />
            {formatDate(task.deadline)}
          </span>
        )}
      </div>

      {/* Assignee */}
      {assignee && (
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-100">
          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-bold text-indigo-600">{assignee.name.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-[11px] text-slate-500 truncate">{assignee.name}</span>
        </div>
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface ColumnProps {
  column: typeof STATUS_COLUMNS[0];
  tasks: Task[];
  users: User[];
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

function KanbanColumn({ column, tasks, users, onDrop, onEdit, onDelete }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isOver }, drop] = useDrop({
    accept: "TASK",
    drop: (item: { id: string; status: TaskStatus }) => {
      if (item.status !== column.status) {
        onDrop(item.id, column.status);
      }
    },
    collect: monitor => ({ isOver: monitor.isOver() }),
  });

  drop(ref);

  return (
    <div className="flex flex-col min-w-72 w-72 flex-shrink-0">
      {/* Column Header */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${column.bg} border ${column.border} border-b-0`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${column.color}`}>{column.label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${column.count_bg}`}>
          {tasks.length}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        ref={ref}
        className={`flex-1 p-3 rounded-b-xl border space-y-3 min-h-72 transition-all ${column.bg} ${column.border} ${
          isOver ? "ring-2 ring-indigo-400 ring-offset-1 bg-indigo-50/50" : ""
        }`}
      >
        {tasks.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed ${column.border} ${isOver ? "border-indigo-400" : ""}`}>
            <p className="text-xs text-slate-400 font-medium">
              {isOver ? "Drop here" : "No tasks"}
            </p>
          </div>
        )}
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} users={users} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Kanban Board ────────────────────────────────────────────────────────

interface KanbanBoardProps {
  tasks: Task[];
  users: User[];
  onTaskUpdate: (task: Task) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (id: string) => void;
}

export function KanbanBoard({ tasks, users, onTaskUpdate, onTaskEdit, onTaskDelete }: KanbanBoardProps) {
  const { isAdmin, user } = useAuth();

  const handleDrop = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Members can only update their own tasks
    if (!isAdmin && task.assignedTo !== user?.id) {
      toast.error("You can only update tasks assigned to you");
      return;
    }

    try {
      const { task: updated } = await api.updateTask(taskId, { status: newStatus });
      onTaskUpdate(updated);
      toast.success(`Task moved to ${newStatus.replace("_", " ")}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update task");
    }
  };

  const getColumnTasks = (status: TaskStatus) => {
    let filtered = tasks.filter(t => t.status === status);
    // Sort by priority then deadline
    return filtered.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const pa = priorityOrder[a.priority] ?? 1;
      const pb = priorityOrder[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      return 0;
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        {STATUS_COLUMNS.map(col => (
          <KanbanColumn
            key={col.status}
            column={col}
            tasks={getColumnTasks(col.status)}
            users={users}
            onDrop={handleDrop}
            onEdit={onTaskEdit}
            onDelete={onTaskDelete}
          />
        ))}
      </div>
    </DndProvider>
  );
}