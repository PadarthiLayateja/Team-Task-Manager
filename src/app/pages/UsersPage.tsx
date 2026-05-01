import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import type { User } from "../lib/types";
import {
  Users, Shield, User as UserIcon, Trash2, Edit2,
  Search, Loader2, X, Save, Mail, Crown
} from "lucide-react";
import { toast } from "sonner";

function UserCard({ user, currentUser, onRoleChange, onDelete }: {
  user: User;
  currentUser: User;
  onRoleChange: (id: string, role: "admin" | "member") => void;
  onDelete: (id: string) => void;
}) {
  const isCurrentUser = user.id === currentUser.id;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);

  const handleSave = async () => {
    try {
      await api.updateUser(user.id, { name });
      toast.success("User updated");
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition ${
      isCurrentUser ? "border-indigo-200 ring-2 ring-indigo-100" : "border-slate-200"
    }`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-bold ${
          user.role === "admin"
            ? "bg-indigo-100 text-indigo-600"
            : "bg-slate-100 text-slate-600"
        }`}>
          {user.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                onKeyDown={e => e.key === "Enter" && handleSave()}
              />
              <button onClick={handleSave} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                <Save className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setEditing(false); setName(user.name); }} className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-slate-900 truncate">{user.name}</h3>
              {isCurrentUser && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">You</span>}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
            <Mail className="w-3 h-3" />
            <span className="truncate">{user.email}</span>
          </div>

          {/* Role Badge + Change */}
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold ${
              user.role === "admin"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-100 text-slate-600"
            }`}>
              {user.role === "admin" ? <Crown className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
              {user.role === "admin" ? "Admin" : "Member"}
            </div>
            <div className="flex items-center gap-1">
              {!isCurrentUser && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                    title="Edit name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRoleChange(user.id, user.role === "admin" ? "member" : "admin")}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition"
                    title={`Switch to ${user.role === "admin" ? "Member" : "Admin"}`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(user.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
                    title="Delete user"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-2">
            Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "member">("all");

  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); return; }
    api.getUsers()
      .then(r => setUsers(r.users))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleRoleChange = async (id: string, role: "admin" | "member") => {
    try {
      const r = await api.updateUser(id, { role });
      setUsers(prev => prev.map(u => u.id === id ? r.user : u));
      toast.success(`Role updated to ${role}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    try {
      await api.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success("User deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || u.role === filter;
    return matchSearch && matchFilter;
  });

  const adminCount = users.filter(u => u.role === "admin").length;
  const memberCount = users.filter(u => u.role === "member").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Team Members</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {users.length} member{users.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white w-48 lg:w-64"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total", value: users.length, color: "text-slate-800", bg: "bg-white" },
          { label: "Admins", value: adminCount, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Members", value: memberCount, color: "text-slate-600", bg: "bg-slate-50" },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl border border-slate-200 p-4 text-center shadow-sm`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {(["all", "admin", "member"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
          </button>
        ))}
      </div>

      {/* Users Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-dashed border-slate-200">
          <Users className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">No members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(u => (
            <UserCard
              key={u.id}
              user={u}
              currentUser={currentUser!}
              onRoleChange={handleRoleChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
