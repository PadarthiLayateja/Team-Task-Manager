import { projectId, publicAnonKey } from "/utils/supabase/info";
import type { Project, Task, User, DashboardData } from "./types";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ed0f522f`;

function getToken(): string | null {
  return localStorage.getItem("ttm_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || publicAnonKey}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function signup(name: string, email: string, password: string, adminCode?: string) {
  return request<{ user: User; access_token: string; refresh_token: string }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password, adminCode }),
  });
}

export async function login(email: string, password: string) {
  return request<{ user: User; access_token: string; refresh_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return request<{ user: User }>("/auth/me");
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUsers() {
  return request<{ users: User[] }>("/users");
}

export async function updateUser(id: string, data: Partial<User>) {
  return request<{ user: User }>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string) {
  return request<{ success: boolean }>(`/users/${id}`, { method: "DELETE" });
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getProjects() {
  return request<{ projects: Project[] }>("/projects");
}

export async function getProject(id: string) {
  return request<{ project: Project }>(`/projects/${id}`);
}

export async function createProject(data: { title: string; description: string; deadline: string; members: string[] }) {
  return request<{ project: Project }>("/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProject(id: string, data: Partial<Project>) {
  return request<{ project: Project }>(`/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string) {
  return request<{ success: boolean }>(`/projects/${id}`, { method: "DELETE" });
}

export async function addProjectMember(projectId: string, userId: string) {
  return request<{ project: Project }>(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function removeProjectMember(projectId: string, userId: string) {
  return request<{ project: Project }>(`/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function getProjectTasks(projectId: string) {
  return request<{ tasks: Task[] }>(`/projects/${projectId}/tasks`);
}

export async function getAllTasks() {
  return request<{ tasks: Task[] }>("/tasks");
}

export async function createTask(data: {
  projectId: string;
  title: string;
  description: string;
  priority: string;
  deadline: string;
  assignedTo: string | null;
}) {
  return request<{ task: Task }>("/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTask(id: string, data: Partial<Task>) {
  return request<{ task: Task }>(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: string) {
  return request<{ success: boolean }>(`/tasks/${id}`, { method: "DELETE" });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboard() {
  return request<DashboardData>("/dashboard");
}

export async function getActivity() {
  return request<{ logs: any[] }>("/activity");
}
