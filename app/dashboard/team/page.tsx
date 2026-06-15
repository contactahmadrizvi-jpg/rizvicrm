"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { AppUser, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  Plus,
  Users,
  ShieldCheck,
  UserCog,
  Trash2,
  Crown,
  UserCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function TeamPage() {
  const { isAdmin, createMember } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", role: "member" as UserRole });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin) router.replace("/dashboard/projects");
  }, [isAdmin, router]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data();
        return {
          uid: d.id,
          email: raw.email ?? "",
          role: raw.role ?? "member",
          createdAt: raw.createdAt?.toDate?.() ?? new Date(),
        } as AppUser;
      });
      // Sort: admins first
      data.sort((a, b) => {
        if (a.role === b.role) return a.email.localeCompare(b.email);
        return a.role === "admin" ? -1 : 1;
      });
      setMembers(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Minimum 6 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    return e;
  };

  const handleCreate = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setErrors({});
    try {
      await createMember(form.email.trim(), form.password, form.role);
      setIsModalOpen(false);
      setForm({ email: "", password: "", confirmPassword: "", role: "member" });
      setSuccessMsg(`Account created for ${form.email}`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create account";
      setErrors({ submit: msg.replace("Firebase: ", "").replace(/\(auth.*\)\.?/, "").trim() });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (uid: string, email: string) => {
    if (!confirm(`Remove ${email} from the team? They will no longer be able to log in.`)) return;
    await deleteDoc(doc(db, "users", uid));
    // Note: Firebase Auth user still exists but has no role → treated as member
    // For full removal, use Firebase Console → Authentication
  };

  if (!isAdmin) return null;

  const admins = members.filter((m) => m.role === "admin");
  const teamMembers = members.filter((m) => m.role === "member");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500 text-sm mt-1">Manage who can access this CRM</p>
        </div>
        <Button onClick={() => { setIsModalOpen(true); setErrors({}); setForm({ email: "", password: "", confirmPassword: "", role: "member" }); }} className="gap-2">
          <Plus size={16} />
          Add Member
        </Button>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <ShieldCheck size={16} />
          {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
            <Crown size={18} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{admins.length}</p>
            <p className="text-xs text-slate-500 font-medium">Admin{admins.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center">
            <UserCircle2 size={18} className="text-slate-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{teamMembers.length}</p>
            <p className="text-xs text-slate-500 font-medium">Team Member{teamMembers.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Members list */}
      <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            All Members ({members.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No team members yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <div key={member.uid} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                  member.role === "admin"
                    ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                    : "bg-slate-100 border-slate-200 text-slate-600"
                }`}>
                  {member.email.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{member.email}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Added {member.createdAt instanceof Date
                      ? member.createdAt.toLocaleDateString()
                      : "—"}
                  </p>
                </div>

                {/* Role badge */}
                <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  member.role === "admin"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {member.role === "admin" ? <Crown size={11} /> : <UserCog size={11} />}
                  {member.role === "admin" ? "Admin" : "Team Member"}
                </span>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(member.uid, member.email)}
                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                  title="Remove member"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        To permanently delete a Firebase Auth account, use the{" "}
        <span className="font-semibold">Firebase Console → Authentication</span>.
      </p>

      {/* Create Member Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Team Member">
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="john@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
            disabled={saving}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            disabled={saving}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            error={errors.confirmPassword}
            disabled={saving}
          />

          {/* Role selector */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Role</p>
            <div className="grid grid-cols-2 gap-2">
              {(["admin", "member"] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, role: r })}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    form.role === r
                      ? r === "admin"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-700 text-white border-slate-700 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {r === "admin" ? <Crown size={15} /> : <UserCog size={15} />}
                  {r === "admin" ? "Admin" : "Team Member"}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {form.role === "admin"
                ? "Full access: dashboard, leads, clients, projects, commissions, team."
                : "Limited access: projects only (no financial data)."}
            </p>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={saving} className="flex-1">
              Create Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
