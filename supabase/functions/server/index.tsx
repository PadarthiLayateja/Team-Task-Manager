import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function getAuthUser(request: Request) {
  const token = request.headers.get("Authorization")?.split(" ")[1];
  if (!token) return null;
  try {
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return null;
    const profile = await kv.get(`user__${user.id}`) as Record<string, unknown> | null;
    return profile ? { ...profile } : { id: user.id, email: user.email, role: "member", name: user.email };
  } catch (e) {
    console.log("getAuthUser error:", e);
    return null;
  }
}

async function logActivity(userId: string, action: string, resourceType: string, resourceId: string, detail: string) {
  try {
    const logs = (await kv.get("activity_logs") as any[]) || [];
    logs.unshift({ id: crypto.randomUUID(), userId, action, resourceType, resourceId, detail, timestamp: new Date().toISOString() });
    await kv.set("activity_logs", logs.slice(0, 100));
  } catch (_) {}
}

// ─── Health ──────────────────────────────────────────────────────────────────

app.get("/make-server-ed0f522f/health", (c) => c.json({ status: "ok" }));

// ─── Auth ────────────────────────────────────────────────────────────────────

app.post("/make-server-ed0f522f/auth/signup", async (c) => {
  try {
    const { name, email, password, role, adminCode } = await c.req.json();
    if (!name || !email || !password) {
      return c.json({ error: "Name, email, and password are required" }, 400);
    }
    const resolvedRole = (adminCode === "ADMIN2024" || role === "admin") ? "admin" : "member";
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });
    if (error) return c.json({ error: `Signup error: ${error.message}` }, 400);

    const profile = {
      id: data.user.id,
      name,
      email,
      role: resolvedRole,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`user__${data.user.id}`, profile);

    // Sign in to get token
    const signInRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
      body: JSON.stringify({ email, password }),
    });
    const signInData = await signInRes.json();
    if (signInData.error) return c.json({ error: `Auth error: ${signInData.error_description}` }, 400);

    await logActivity(data.user.id, "SIGNUP", "user", data.user.id, `${name} joined as ${resolvedRole}`);
    return c.json({ user: profile, access_token: signInData.access_token, refresh_token: signInData.refresh_token }, 201);
  } catch (err) {
    console.log("Signup error:", err);
    return c.json({ error: `Signup failed: ${err}` }, 500);
  }
});

app.post("/make-server-ed0f522f/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: "Email and password are required" }, 400);

    const signInRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
      body: JSON.stringify({ email, password }),
    });
    const signInData = await signInRes.json();
    if (signInData.error) return c.json({ error: signInData.error_description || "Invalid credentials" }, 400);

    const admin = getSupabaseAdmin();
    const { data: { user } } = await admin.auth.getUser(signInData.access_token);
    const profile = user ? await kv.get(`user__${user.id}`) as any : null;

    await logActivity(user?.id || "", "LOGIN", "user", user?.id || "", `${profile?.name || email} logged in`);
    return c.json({
      user: profile || { id: user?.id, email, role: "member", name: email },
      access_token: signInData.access_token,
      refresh_token: signInData.refresh_token,
    });
  } catch (err) {
    console.log("Login error:", err);
    return c.json({ error: `Login failed: ${err}` }, 500);
  }
});

app.get("/make-server-ed0f522f/auth/me", async (c) => {
  const user = await getAuthUser(c.req.raw);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ user });
});

// ─── Users ───────────────────────────────────────────────────────────────────

app.get("/make-server-ed0f522f/users", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw);
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    const users = await kv.getByPrefix("user__") as any[];
    return c.json({ users });
  } catch (err) {
    return c.json({ error: `Failed to get users: ${err}` }, 500);
  }
});

app.put("/make-server-ed0f522f/users/:id", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    if (currentUser.role !== "admin" && currentUser.id !== c.req.param("id")) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const existing = await kv.get(`user__${c.req.param("id")}`) as any;
    if (!existing) return c.json({ error: "User not found" }, 404);
    const updates = await c.req.json();
    // Only admin can change role
    if (currentUser.role !== "admin") delete updates.role;
    const updated = { ...existing, ...updates, id: existing.id, email: existing.email };
    await kv.set(`user__${existing.id}`, updated);
    return c.json({ user: updated });
  } catch (err) {
    return c.json({ error: `Failed to update user: ${err}` }, 500);
  }
});

app.delete("/make-server-ed0f522f/users/:id", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    if (currentUser.role !== "admin") return c.json({ error: "Forbidden: Admin only" }, 403);
    const admin = getSupabaseAdmin();
    await admin.auth.admin.deleteUser(c.req.param("id"));
    await kv.del(`user__${c.req.param("id")}`);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Failed to delete user: ${err}` }, 500);
  }
});

// ─── Projects ────────────────────────────────────────────────────────────────

app.get("/make-server-ed0f522f/projects", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    const allProjects = await kv.getByPrefix("project__") as any[];
    const projects = currentUser.role === "admin"
      ? allProjects
      : allProjects.filter((p: any) => p.members?.includes(currentUser.id));
    return c.json({ projects });
  } catch (err) {
    return c.json({ error: `Failed to get projects: ${err}` }, 500);
  }
});

app.post("/make-server-ed0f522f/projects", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    if (currentUser.role !== "admin") return c.json({ error: "Forbidden: Admin only" }, 403);
    const { title, description, deadline, members = [] } = await c.req.json();
    if (!title) return c.json({ error: "Title is required" }, 400);
    const id = crypto.randomUUID();
    const project = {
      id, title,
      description: description || "",
      deadline: deadline || "",
      createdBy: currentUser.id,
      members: [...new Set([currentUser.id, ...members])],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`project__${id}`, project);
    await logActivity(currentUser.id, "CREATE", "project", id, `Created project "${title}"`);
    return c.json({ project }, 201);
  } catch (err) {
    return c.json({ error: `Failed to create project: ${err}` }, 500);
  }
});

app.get("/make-server-ed0f522f/projects/:id", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    const project = await kv.get(`project__${c.req.param("id")}`) as any;
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (currentUser.role !== "admin" && !project.members?.includes(currentUser.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    return c.json({ project });
  } catch (err) {
    return c.json({ error: `Failed to get project: ${err}` }, 500);
  }
});

app.put("/make-server-ed0f522f/projects/:id", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    if (currentUser.role !== "admin") return c.json({ error: "Forbidden: Admin only" }, 403);
    const existing = await kv.get(`project__${c.req.param("id")}`) as any;
    if (!existing) return c.json({ error: "Project not found" }, 404);
    const updates = await c.req.json();
    const updated = { ...existing, ...updates, id: existing.id, createdBy: existing.createdBy, updatedAt: new Date().toISOString() };
    await kv.set(`project__${existing.id}`, updated);
    await logActivity(currentUser.id, "UPDATE", "project", existing.id, `Updated project "${updated.title}"`);
    return c.json({ project: updated });
  } catch (err) {
    return c.json({ error: `Failed to update project: ${err}` }, 500);
  }
});

app.delete("/make-server-ed0f522f/projects/:id", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    if (currentUser.role !== "admin") return c.json({ error: "Forbidden: Admin only" }, 403);
    const id = c.req.param("id");
    const project = await kv.get(`project__${id}`) as any;
    await kv.del(`project__${id}`);
    const allTasks = await kv.getByPrefix("task__") as any[];
    await Promise.all(allTasks.filter((t: any) => t.projectId === id).map((t: any) => kv.del(`task__${t.id}`)));
    await logActivity(currentUser.id, "DELETE", "project", id, `Deleted project "${project?.title}"`);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Failed to delete project: ${err}` }, 500);
  }
});

app.post("/make-server-ed0f522f/projects/:id/members", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    if (currentUser.role !== "admin") return c.json({ error: "Forbidden: Admin only" }, 403);
    const project = await kv.get(`project__${c.req.param("id")}`) as any;
    if (!project) return c.json({ error: "Project not found" }, 404);
    const { userId } = await c.req.json();
    if (!project.members.includes(userId)) {
      project.members.push(userId);
      project.updatedAt = new Date().toISOString();
      await kv.set(`project__${project.id}`, project);
    }
    return c.json({ project });
  } catch (err) {
    return c.json({ error: `Failed to add member: ${err}` }, 500);
  }
});

app.delete("/make-server-ed0f522f/projects/:id/members/:userId", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    if (currentUser.role !== "admin") return c.json({ error: "Forbidden: Admin only" }, 403);
    const project = await kv.get(`project__${c.req.param("id")}`) as any;
    if (!project) return c.json({ error: "Project not found" }, 404);
    project.members = project.members.filter((m: string) => m !== c.req.param("userId"));
    project.updatedAt = new Date().toISOString();
    await kv.set(`project__${project.id}`, project);
    return c.json({ project });
  } catch (err) {
    return c.json({ error: `Failed to remove member: ${err}` }, 500);
  }
});

// ─── Tasks ───────────────────────────────────────────────────────────────────

app.get("/make-server-ed0f522f/projects/:id/tasks", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    const projectId = c.req.param("id");
    const project = await kv.get(`project__${projectId}`) as any;
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (currentUser.role !== "admin" && !project.members?.includes(currentUser.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const allTasks = await kv.getByPrefix("task__") as any[];
    const tasks = allTasks.filter((t: any) => t.projectId === projectId);
    const now = new Date();
    return c.json({ tasks: tasks.map((t: any) => ({ ...t, isOverdue: t.deadline && new Date(t.deadline) < now && t.status !== "completed" })) });
  } catch (err) {
    return c.json({ error: `Failed to get tasks: ${err}` }, 500);
  }
});

app.get("/make-server-ed0f522f/tasks", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    const allTasks = await kv.getByPrefix("task__") as any[];
    const allProjects = await kv.getByPrefix("project__") as any[];
    const now = new Date();
    let tasks = allTasks;
    if (currentUser.role !== "admin") {
      const memberProjectIds = allProjects.filter((p: any) => p.members?.includes(currentUser.id)).map((p: any) => p.id);
      tasks = allTasks.filter((t: any) => t.assignedTo === currentUser.id && memberProjectIds.includes(t.projectId));
    }
    return c.json({
      tasks: tasks.map((t: any) => ({
        ...t,
        projectTitle: allProjects.find((p: any) => p.id === t.projectId)?.title,
        isOverdue: t.deadline && new Date(t.deadline) < now && t.status !== "completed",
      }))
    });
  } catch (err) {
    return c.json({ error: `Failed to get tasks: ${err}` }, 500);
  }
});

app.post("/make-server-ed0f522f/tasks", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    if (currentUser.role !== "admin") return c.json({ error: "Forbidden: Admin only" }, 403);
    const { projectId, title, description, priority, deadline, assignedTo } = await c.req.json();
    if (!projectId || !title) return c.json({ error: "ProjectId and title are required" }, 400);
    const id = crypto.randomUUID();
    const task = {
      id, projectId, title,
      description: description || "",
      priority: priority || "medium",
      deadline: deadline || "",
      status: "todo",
      assignedTo: assignedTo || null,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`task__${id}`, task);
    await logActivity(currentUser.id, "CREATE", "task", id, `Created task "${title}"`);
    return c.json({ task }, 201);
  } catch (err) {
    return c.json({ error: `Failed to create task: ${err}` }, 500);
  }
});

app.put("/make-server-ed0f522f/tasks/:id", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    const existing = await kv.get(`task__${c.req.param("id")}`) as any;
    if (!existing) return c.json({ error: "Task not found" }, 404);
    const updates = await c.req.json();
    if (currentUser.role !== "admin") {
      if (existing.assignedTo !== currentUser.id) return c.json({ error: "Forbidden" }, 403);
      const updated = { ...existing, status: updates.status, updatedAt: new Date().toISOString() };
      await kv.set(`task__${existing.id}`, updated);
      await logActivity(currentUser.id, "UPDATE_STATUS", "task", existing.id, `Changed "${existing.title}" to ${updates.status}`);
      return c.json({ task: updated });
    }
    const updated = { ...existing, ...updates, id: existing.id, projectId: existing.projectId, updatedAt: new Date().toISOString() };
    await kv.set(`task__${existing.id}`, updated);
    await logActivity(currentUser.id, "UPDATE", "task", existing.id, `Updated task "${updated.title}"`);
    return c.json({ task: updated });
  } catch (err) {
    return c.json({ error: `Failed to update task: ${err}` }, 500);
  }
});

app.delete("/make-server-ed0f522f/tasks/:id", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    if (currentUser.role !== "admin") return c.json({ error: "Forbidden: Admin only" }, 403);
    const task = await kv.get(`task__${c.req.param("id")}`) as any;
    await kv.del(`task__${c.req.param("id")}`);
    await logActivity(currentUser.id, "DELETE", "task", c.req.param("id"), `Deleted task "${task?.title}"`);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Failed to delete task: ${err}` }, 500);
  }
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

app.get("/make-server-ed0f522f/dashboard", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    const [allProjects, allTasks, allUsers] = await Promise.all([
      kv.getByPrefix("project__") as Promise<any[]>,
      kv.getByPrefix("task__") as Promise<any[]>,
      kv.getByPrefix("user__") as Promise<any[]>,
    ]);
    const now = new Date();
    const projects = currentUser.role === "admin"
      ? allProjects
      : allProjects.filter((p: any) => p.members?.includes(currentUser.id));
    const projectIds = projects.map((p: any) => p.id);
    let tasks = allTasks.filter((t: any) => projectIds.includes(t.projectId));
    if (currentUser.role !== "admin") tasks = tasks.filter((t: any) => t.assignedTo === currentUser.id);
    const stats = {
      totalProjects: projects.length,
      totalTasks: tasks.length,
      todoTasks: tasks.filter((t: any) => t.status === "todo").length,
      inProgressTasks: tasks.filter((t: any) => t.status === "in_progress").length,
      completedTasks: tasks.filter((t: any) => t.status === "completed").length,
      overdueTasks: tasks.filter((t: any) => t.deadline && new Date(t.deadline) < now && t.status !== "completed").length,
      totalMembers: allUsers.length,
    };
    const recentTasks = tasks
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
      .map((t: any) => ({
        ...t,
        projectTitle: projects.find((p: any) => p.id === t.projectId)?.title,
        assigneeName: allUsers.find((u: any) => u.id === t.assignedTo)?.name,
        isOverdue: t.deadline && new Date(t.deadline) < now && t.status !== "completed",
      }));
    const activityLogs = ((await kv.get("activity_logs") as any[]) || []).slice(0, 10);
    return c.json({ stats, recentTasks, projects: projects.slice(0, 6), activityLogs });
  } catch (err) {
    return c.json({ error: `Failed to get dashboard: ${err}` }, 500);
  }
});

// ─── Activity Logs ───────────────────────────────────────────────────────────

app.get("/make-server-ed0f522f/activity", async (c) => {
  try {
    const currentUser = await getAuthUser(c.req.raw) as any;
    if (!currentUser) return c.json({ error: "Unauthorized" }, 401);
    if (currentUser.role !== "admin") return c.json({ error: "Forbidden: Admin only" }, 403);
    const logs = (await kv.get("activity_logs") as any[]) || [];
    const allUsers = await kv.getByPrefix("user__") as any[];
    return c.json({
      logs: logs.map((l: any) => ({
        ...l,
        userName: allUsers.find((u: any) => u.id === l.userId)?.name || "Unknown",
      }))
    });
  } catch (err) {
    return c.json({ error: `Failed to get activity: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);
