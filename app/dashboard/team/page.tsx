"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { AppUser, UserRole, SalaryType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ALL_NAV_ITEMS } from "@/components/Sidebar";
import {
  Plus,
  Users,
  ShieldCheck,
  UserCog,
  Trash2,
  Crown,
  UserCircle2,
  Eye,
  Check,
  DollarSign,
  Percent,
  BadgeDollarSign,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  displayName: string;
  salaryType: SalaryType;
  baseSalary: string;
  commissionPercentage: string;
}

const defaultForm: FormState = {
  email: "",
  password: "",
  confirmPassword: "",
  role: "member",
  displayName: "",
  salaryType: "base",
  baseSalary: "",
  commissionPercentage: "",
};

const SALARY_TYPE_OPTIONS: { value: SalaryType; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    value: "base",
    label: "Base Salary",
    icon: <DollarSign size={14} />,
    desc: "Fixed monthly/annual pay only",
  },
  {
    value: "commission",
    label: "Commission",
    icon: <Percent size={14} />,
    desc: "Earnings based on % of sales",
  },
  {
    value: "both",
    label: "Base + Commission",
    icon: <BadgeDollarSign size={14} />,
    desc: "Fixed pay plus commission %",
  },
];

export default function TeamPage() {
  const { isAdmin, createMember } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");

  // Pages modal state
  const [pagesModalOpen, setPagesModalOpen] = useState(false);
  const [pagesMember, setPagesMember] = useState<AppUser | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [savingPages, setSavingPages] = useState(false);

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
          displayName: raw.displayName ?? undefined,
          role: raw.role ?? "member",
          allowedPages: raw.allowedPages ?? [],
          salaryType: raw.salaryType ?? undefined,
          baseSalary: raw.baseSalary ?? undefined,
          commissionPercentage: raw.commissionPercentage ?? undefined,
          createdAt: raw.createdAt?.toDate?.() ?? new Date(),
        } as AppUser;
      });
      data.sort((a, b) => {
        if (a.role === b.role) return (a.displayName || a.email).localeCompare(b.displayName || b.email);
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

    if (form.role === "member") {
      if (form.salaryType === "base" || form.salaryType === "both") {
        const base = parseFloat(form.baseSalary);
        if (!form.baseSalary || isNaN(base) || base < 0) e.baseSalary = "Enter a valid base salary";
      }
      if (form.salaryType === "commission" || form.salaryType === "both") {
        const pct = parseFloat(form.commissionPercentage);
        if (!form.commissionPercentage || isNaN(pct) || pct < 0 || pct > 100)
          e.commissionPercentage = "Enter a valid percentage (0–100)";
      }
    }
    return e;
  };

  const handleCreate = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setErrors({});
    try {
      await createMember(form.email.trim(), form.password, {
        role: form.role,
        displayName: form.displayName.trim() || undefined,
        salaryType: form.role === "member" ? form.salaryType : undefined,
        baseSalary:
          form.role === "member" && (form.salaryType === "base" || form.salaryType === "both")
            ? parseFloat(form.baseSalary)
            : undefined,
        commissionPercentage:
          form.role === "member" && (form.salaryType === "commission" || form.salaryType === "both")
            ? parseFloat(form.commissionPercentage)
            : undefined,
      });
      setIsModalOpen(false);
      setForm(defaultForm);
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
  };

  const openPagesModal = (member: AppUser) => {
    setPagesMember(member);
    setSelectedPages(member.allowedPages ? [...member.allowedPages] : []);
    setPagesModalOpen(true);
  };

  const togglePage = (href: string) => {
    setSelectedPages((prev) =>
      prev.includes(href) ? prev.filter((p) => p !== href) : [...prev, href]
    );
  };

  const selectAll = () => setSelectedPages(ALL_NAV_ITEMS.map((item) => item.href));
  const clearAll = () => setSelectedPages([]);

  const handleSavePages = async () => {
    if (!pagesMember) return;
    setSavingPages(true);
    try {
      await updateDoc(doc(db, "users", pagesMember.uid), { allowedPages: selectedPages });
      setPagesModalOpen(false);
      setPagesMember(null);
    } finally {
      setSavingPages(false);
    }
  };

  if (!isAdmin) return null;

  const admins = members.filter((m) => m.role === "admin");
  const teamMembers = members.filter((m) => m.role === "member");

  const salaryLabel = (m: AppUser) => {
    if (!m.salaryType) return null;
    const parts: string[] = [];
    if ((m.salaryType === "base" || m.salaryType === "both") && m.baseSalary !== undefined)
      parts.push(`$${m.baseSalary.toLocaleString()} base`);
    if ((m.salaryType === "commission" || m.salaryType === "both") && m.commissionPercentage !== undefined)
      parts.push(`${m.commissionPercentage}% commission`);
    return parts.join(" + ");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500 text-sm mt-1">Manage who can access this CRM</p>
        </div>
        <Button
          onClick={() => { setIsModalOpen(true); setErrors({}); setForm(defaultForm); }}
          className="gap-2"
        >
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
            {members.map((member) => {
              const pageNames = (member.allowedPages || [])
                .map((href) => ALL_NAV_ITEMS.find((item) => item.href === href)?.label)
                .filter(Boolean);
              const salaryInfo = salaryLabel(member);

              return (
                <div key={member.uid} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                    member.role === "admin"
                      ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                      : "bg-slate-100 border-slate-200 text-slate-600"
                  }`}>
                    {(member.displayName || member.email).charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {member.displayName || member.email}
                    </p>
                    {member.displayName && (
                      <p className="text-xs text-slate-400 truncate">{member.email}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      Added {member.createdAt instanceof Date
                        ? member.createdAt.toLocaleDateString()
                        : "—"}
                    </p>
                    {/* Salary info */}
                    {salaryInfo && (
                      <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">{salaryInfo}</p>
                    )}
                    {/* Allowed pages badges */}
                    {member.role !== "admin" && pageNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {pageNames.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-indigo-50 text-indigo-600 border-indigo-200/50"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                    {member.role !== "admin" && pageNames.length === 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Default: Projects only</p>
                    )}
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

                  {/* Manage Pages button (non-admin only) */}
                  {member.role !== "admin" && (
                    <button
                      onClick={() => openPagesModal(member)}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                      title="Manage sidebar pages"
                    >
                      <Eye size={14} />
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(member.uid, member.email)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                    title="Remove member"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
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
            label="Display Name"
            placeholder="e.g. John Smith"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            disabled={saving}
          />
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
                : "Limited access: you can assign specific sidebar pages after creation."}
            </p>
          </div>

          {/* Salary type — only for members */}
          {form.role === "member" && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Salary Type</p>
              <div className="grid grid-cols-3 gap-2">
                {SALARY_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, salaryType: opt.value })}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-medium transition-all ${
                      form.salaryType === opt.value
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {SALARY_TYPE_OPTIONS.find((o) => o.value === form.salaryType)?.desc}
              </p>
            </div>
          )}

          {/* Base salary input */}
          {form.role === "member" && (form.salaryType === "base" || form.salaryType === "both") && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Base Salary ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 3000"
                  value={form.baseSalary}
                  onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
                  disabled={saving}
                  className={`w-full bg-white border rounded-xl pl-7 pr-3 py-2.5
                    text-slate-900 text-sm placeholder-slate-400
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                    transition-all disabled:bg-slate-50 disabled:text-slate-400 ${
                      errors.baseSalary ? "border-red-500 focus:ring-red-500/20" : "border-slate-200"
                    }`}
                />
              </div>
              {errors.baseSalary && <p className="text-xs text-red-500">{errors.baseSalary}</p>}
            </div>
          )}

          {/* Commission percentage input */}
          {form.role === "member" && (form.salaryType === "commission" || form.salaryType === "both") && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Commission Percentage (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 10"
                  value={form.commissionPercentage}
                  onChange={(e) => setForm({ ...form, commissionPercentage: e.target.value })}
                  disabled={saving}
                  className={`w-full bg-white border rounded-xl px-3 py-2.5 pr-10
                    text-slate-900 text-sm placeholder-slate-400
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                    transition-all disabled:bg-slate-50 disabled:text-slate-400 ${
                      errors.commissionPercentage ? "border-red-500 focus:ring-red-500/20" : "border-slate-200"
                    }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">%</span>
              </div>
              {errors.commissionPercentage && (
                <p className="text-xs text-red-500">{errors.commissionPercentage}</p>
              )}
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                This will auto-fill the commission rate on the Commissions page when linked by email.
              </p>
            </div>
          )}

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

      {/* Manage Pages Modal */}
      <Modal
        isOpen={pagesModalOpen}
        onClose={() => setPagesModalOpen(false)}
        title={`Manage Sidebar — ${pagesMember?.displayName || pagesMember?.email || "Member"}`}
      >
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <p className="text-slate-500 text-sm mb-1 font-medium">Assigning pages to</p>
            <p className="text-slate-800 font-bold text-sm">
              {pagesMember?.displayName || pagesMember?.email}
            </p>
            {pagesMember?.displayName && (
              <p className="text-xs text-slate-400">{pagesMember.email}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              Select which sidebar pages this team member can see. Leave empty for default (Projects only).
            </p>
          </div>

          {/* Select All / Clear All */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Sidebar Pages ({selectedPages.length}/{ALL_NAV_ITEMS.length})
            </p>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Page checkboxes */}
          <div className="space-y-2">
            {ALL_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isSelected = selectedPages.includes(href);
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => togglePage(href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    {isSelected ? <Check size={14} /> : <Icon size={14} />}
                  </div>
                  <span className="flex-1 text-left">{label}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${
                    isSelected ? "bg-indigo-100 text-indigo-500" : "bg-slate-100 text-slate-400"
                  }`}>
                    {href}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPagesModalOpen(false)} className="flex-1" disabled={savingPages}>
              Cancel
            </Button>
            <Button onClick={handleSavePages} loading={savingPages} className="flex-1">
              Save Pages
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
