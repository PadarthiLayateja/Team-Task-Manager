export type UserRole = "admin" | "member";
export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  deadline: string;
  createdBy: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: string;
  status: TaskStatus;
  assignedTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Enriched
  projectTitle?: string;
  assigneeName?: string;
  isOverdue?: boolean;
}

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalMembers: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  detail: string;
  timestamp: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentTasks: Task[];
  projects: Project[];
  activityLogs: ActivityLog[];
}
