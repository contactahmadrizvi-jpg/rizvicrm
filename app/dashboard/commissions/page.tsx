"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Commission, CommissionPayment, EmployeeRole, Project, PaymentStatus, AppUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  PhoneCall,
  Percent,
  Eye,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote,
} from "lucide-react";

const ROLES: EmployeeRole[] = ["Sales Closer", "Cold Caller", "Lead Gen"];

const ROLE_COLORS: Record<EmployeeRole, { bg: string; text: string; border: string; pill: string; avatar: string }> = {
  "Sales Closer": {
    bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200",
    pill: "bg-indigo-50 text-indigo-700 border-indigo-150",
    avatar: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  "Cold Caller": {
    bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200",
    pill: "bg-amber-50 text-amber-700 border-amber-150",
    avatar: "bg-amber-100 text-amber-700 border-amber-200",
  },
  "Lead Gen": {
    bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200",
    pill: "bg-teal-50 text-teal-700 border-teal-150",
    avatar: "bg-teal-100 text-teal-700 border-teal-200",
  },
};

interface EmployeeCommissionData {
  employee: Commission;
  projects: Project[];
  totalCommission: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  baseSalary?: number;
  basePaid: number;
  baseRemaining: number;
  baseStatus: PaymentStatus;
}

type PaymentType = "commission" | "base";

interface PaymentForm {
  amount: string;
  note: string;
  type: PaymentType;
}

// Helper to cast raw payment docs which have paymentType field
type RawPayment = CommissionPayment & { paymentType?: PaymentType };

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Commission | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Sales Closer" as EmployeeRole, commissionRate: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewingEmployee, setViewingEmployee] = useState<EmployeeCommissionData | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({ amount: "", note: "", type: "commission" });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [commissionPayments, setCommissionPayments] = useState<RawPayment[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    let cl = false, pl = false, ul = false;
    const check = () => { if (cl && pl && ul) setLoading(false); };

    const unsub = onSnapshot(collection(db, "commissions"), (snap) => {
      setCommissions(snap.docs.map((d) => {
        const raw = d.data();
        return { id: d.id, ...raw, commissionRate: raw.commissionRate ?? raw.totalCommission ?? 0,
          createdAt: raw.createdAt?.toDate?.() ?? new Date(), updatedAt: raw.updatedAt?.toDate?.() ?? new Date() } as Commission;
      }));
      cl = true; check();
    });

    const unsubP = onSnapshot(collection(db, "projects"), (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
      pl = true; check();
    });

    const unsubPay = onSnapshot(collection(db, "commissionPayments"), (snap) => {
      setCommissionPayments(snap.docs.map((d) => {
        const raw = d.data();
        return { id: d.id, ...raw, paymentType: raw.paymentType ?? "commission",
          createdAt: raw.createdAt?.toDate?.() ?? new Date() } as RawPayment;
      }));
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => {
        const raw = d.data();
        return { uid: d.id, email: raw.email ?? "", displayName: raw.displayName ?? undefined,
          role: raw.role ?? "member", salaryType: raw.salaryType ?? undefined,
          baseSalary: raw.baseSalary ?? undefined, commissionPercentage: raw.commissionPercentage ?? undefined,
          createdAt: raw.createdAt?.toDate?.() ?? new Date() } as AppUser;
      }).filter((u) => u.role === "member"));
      ul = true; check();
    });

    return () => { unsub(); unsubP(); unsubPay(); unsubUsers(); };
  }, []);

  const getEmployeeCommissionData = (): EmployeeCommissionData[] => {
    return commissions.map((emp) => {
      const employeeProjects = projects.filter((p) => {
        const isAssigned =
          (emp.role === "Sales Closer" && p.salesCloserId === emp.id) ||
          (emp.role === "Cold Caller" && p.coldCallerId === emp.id) ||
          (emp.role === "Lead Gen" && p.leadGenId === emp.id);
        if (!isAssigned) return false;
        if (dateRange.start && dateRange.end) {
          const d = new Date(p.createdAt);
          return d >= dateRange.start && d <= dateRange.end;
        }
        return true;
      });

      const totalCommission = employeeProjects.reduce((sum, p) => {
        return sum + (emp.role === "Sales Closer" ? (p.salesCloserCommission || 0)
          : emp.role === "Cold Caller" ? (p.coldCallerCommission || 0)
          : (p.leadGenCommission || 0));
      }, 0);

      const paidAmount = commissionPayments
        .filter((cp) => cp.employeeId === emp.id && cp.paymentType !== "base")
        .reduce((sum, cp) => sum + (cp.amount || 0), 0);
      const remainingAmount = Math.max(0, totalCommission - paidAmount);
      const status: PaymentStatus = totalCommission === 0 ? "Unpaid"
        : remainingAmount === 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Unpaid";

      const linkedUser = emp.email ? users.find((u) => u.email === emp.email) : undefined;
      const baseSalary = linkedUser &&
        (linkedUser.salaryType === "base" || linkedUser.salaryType === "both") &&
        linkedUser.baseSalary !== undefined ? linkedUser.baseSalary : undefined;

      const basePaid = commissionPayments
        .filter((cp) => cp.employeeId === emp.id && cp.paymentType === "base")
        .reduce((sum, cp) => sum + (cp.amount || 0), 0);
      const baseRemaining = baseSalary !== undefined ? Math.max(0, baseSalary - basePaid) : 0;
      const baseStatus: PaymentStatus = baseSalary === undefined ? "Unpaid"
        : baseRemaining === 0 ? "Paid" : basePaid > 0 ? "Partial" : "Unpaid";

      return { employee: emp, projects: employeeProjects, totalCommission, paidAmount,
        remainingAmount, status, baseSalary, basePaid, baseRemaining, baseStatus };
    });
  };

  const employeeData = getEmployeeCommissionData();
  const filteredData = employeeData;
  const salesClosers = employeeData.filter((d) => d.employee.role === "Sales Closer");
  const coldCallers = employeeData.filter((d) => d.employee.role === "Cold Caller");
  const leadGens = employeeData.filter((d) => d.employee.role === "Lead Gen");

  useEffect(() => {
    if (!viewingEmployee) return;
    const updated = employeeData.find((d) => d.employee.id === viewingEmployee.employee.id);
    if (updated) setViewingEmployee(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commissionPayments]);

  const openAdd = () => {
    setEditingEmployee(null);
    setForm({ name: "", role: "Sales Closer", commissionRate: "", email: "" });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (emp: Commission) => {
    setEditingEmployee(emp);
    setForm({ name: emp.name, role: emp.role, commissionRate: String(emp.commissionRate ?? ""), email: emp.email || "" });
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    const rate = parseFloat(form.commissionRate);
    if (!form.commissionRate || isNaN(rate)) e.commissionRate = "Enter a valid percentage";
    else if (rate < 0 || rate > 100) e.commissionRate = "Must be between 0 and 100";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, role: form.role, commissionRate: parseFloat(form.commissionRate),
        email: form.email.trim() || null, updatedAt: serverTimestamp() };
      if (editingEmployee) {
        await updateDoc(doc(db, "commissions", editingEmployee.id), payload);
      } else {
        await addDoc(collection(db, "commissions"), { ...payload, createdAt: serverTimestamp() });
      }
      setIsModalOpen(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this employee?")) return;
    await deleteDoc(doc(db, "commissions", id));
  };

  const handleDateChange = (start: Date | null, end: Date | null) => setDateRange({ start, end });

  const openPaymentModal = (type: PaymentType) => {
    setPaymentForm({ amount: "", note: "", type });
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!viewingEmployee) return;
    const amount = parseFloat(paymentForm.amount);
    if (!paymentForm.amount || isNaN(amount) || amount <= 0) return;
    setProcessingPayment(true);
    try {
      await addDoc(collection(db, "commissionPayments"), {
        employeeId: viewingEmployee.employee.id,
        employeeName: viewingEmployee.employee.name,
        amount,
        paymentType: paymentForm.type,
        note: paymentForm.note.trim() || null,
        createdAt: serverTimestamp(),
      });
      setPaymentModalOpen(false);
      setPaymentForm({ amount: "", note: "", type: "commission" });
    } finally { setProcessingPayment(false); }
  };

  const avgRate = (list: EmployeeCommissionData[]) =>
    list.length === 0 ? 0 : list.reduce((s, d) => s + (d.employee.commissionRate ?? 0), 0) / list.length;

  const totalCommissionAll = filteredData.reduce((s, d) => s + d.totalCommission, 0);
  const totalPaidAll = filteredData.reduce((s, d) => s + d.paidAmount, 0);
  const totalRemainingAll = filteredData.reduce((s, d) => s + d.remainingAmount, 0);
  const totalBaseSalaryAll = filteredData.reduce((s, d) => s + (d.baseSalary ?? 0), 0);
  const totalBasePaidAll = filteredData.reduce((s, d) => s + d.basePaid, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commissions</h1>
          <p className="text-slate-500 text-sm mt-1">Commission rates applied as % of project revenue, with payment tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowDateFilter(!showDateFilter)} className="gap-2">
            <Calendar size={16} />
            {dateRange.start && dateRange.end ? "Filter Active" : "Filter by Date"}
          </Button>
          <Button onClick={openAdd} className="gap-2">
            <Plus size={16} />
            Add Employee
          </Button>
        </div>
      </div>

      {showDateFilter && (
        <div className="mb-6"><DateRangePicker onDateChange={handleDateChange} /></div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-8">
        {/* Sales Closers avg rate */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg"><Users size={13} className="text-indigo-600" /></div>
            <p className="text-xs text-slate-500 font-medium">Sales Closers</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{avgRate(salesClosers).toFixed(1)}<span className="text-base text-indigo-600 ml-1">%</span></p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">avg · {salesClosers.length} emp</p>
        </div>
        {/* Cold Callers avg rate */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-amber-50 border border-amber-100 rounded-lg"><PhoneCall size={13} className="text-amber-600" /></div>
            <p className="text-xs text-slate-500 font-medium">Cold Callers</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{avgRate(coldCallers).toFixed(1)}<span className="text-base text-amber-600 ml-1">%</span></p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">avg · {coldCallers.length} emp</p>
        </div>
        {/* Lead Gen avg rate */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-teal-50 border border-teal-100 rounded-lg"><Percent size={13} className="text-teal-600" /></div>
            <p className="text-xs text-slate-500 font-medium">Lead Gen</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{avgRate(leadGens).toFixed(1)}<span className="text-base text-teal-600 ml-1">%</span></p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">avg · {leadGens.length} emp</p>
        </div>
        {/* Commission Owed */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-rose-50 border border-rose-100 rounded-lg"><DollarSign size={13} className="text-rose-600" /></div>
            <p className="text-xs text-slate-500 font-medium">Commission</p>
          </div>
          <p className="text-2xl font-bold text-rose-600">${totalCommissionAll.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">owed total</p>
        </div>
        {/* Commission Paid */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg"><DollarSign size={13} className="text-emerald-600" /></div>
            <p className="text-xs text-slate-500 font-medium">Comm. Paid</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">${totalPaidAll.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">${totalRemainingAll.toLocaleString()} left</p>
        </div>
        {/* Base Salary Total */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-violet-50 border border-violet-100 rounded-lg"><Banknote size={13} className="text-violet-600" /></div>
            <p className="text-xs text-slate-500 font-medium">Base Salary</p>
          </div>
          <p className="text-2xl font-bold text-violet-600">${totalBaseSalaryAll.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">total base</p>
        </div>
        {/* Base Paid */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-sky-50 border border-sky-100 rounded-lg"><DollarSign size={13} className="text-sky-600" /></div>
            <p className="text-xs text-slate-500 font-medium">Base Paid</p>
          </div>
          <p className="text-2xl font-bold text-sky-600">${totalBasePaidAll.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">${(totalBaseSalaryAll - totalBasePaidAll).toLocaleString()} left</p>
        </div>
      </div>

      {/* Three-column employee list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Closers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg"><Users size={14} className="text-indigo-600" /></div>
            <h2 className="text-sm font-semibold text-slate-800">Sales Closers</h2>
            <span className="text-xs text-slate-400 font-semibold">({salesClosers.length})</span>
          </div>
          <div className="space-y-3">
            {loading ? [1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
              : salesClosers.length === 0
                ? <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-center shadow-sm"><p className="text-slate-500 text-sm">No sales closers added yet</p></div>
                : salesClosers.map((data) => (
                    <EmployeeCard key={data.employee.id} data={data}
                      onEdit={() => openEdit(data.employee)} onDelete={handleDelete}
                      onView={() => setViewingEmployee(data)} />
                  ))}
          </div>
        </div>
        {/* Cold Callers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-amber-50 border border-amber-100 rounded-lg"><PhoneCall size={14} className="text-amber-600" /></div>
            <h2 className="text-sm font-semibold text-slate-800">Cold Callers</h2>
            <span className="text-xs text-slate-400 font-semibold">({coldCallers.length})</span>
          </div>
          <div className="space-y-3">
            {loading ? [1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
              : coldCallers.length === 0
                ? <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-center shadow-sm"><p className="text-slate-500 text-sm">No cold callers added yet</p></div>
                : coldCallers.map((data) => (
                    <EmployeeCard key={data.employee.id} data={data}
                      onEdit={() => openEdit(data.employee)} onDelete={handleDelete}
                      onView={() => setViewingEmployee(data)} />
                  ))}
          </div>
        </div>
        {/* Lead Gen */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-teal-50 border border-teal-100 rounded-lg"><Percent size={14} className="text-teal-600" /></div>
            <h2 className="text-sm font-semibold text-slate-800">Lead Gen</h2>
            <span className="text-xs text-slate-400 font-semibold">({leadGens.length})</span>
          </div>
          <div className="space-y-3">
            {loading ? [1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
              : leadGens.length === 0
                ? <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-center shadow-sm"><p className="text-slate-500 text-sm">No lead gen added yet</p></div>
                : leadGens.map((data) => (
                    <EmployeeCard key={data.employee.id} data={data}
                      onEdit={() => openEdit(data.employee)} onDelete={handleDelete}
                      onView={() => setViewingEmployee(data)} />
                  ))}
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEmployee ? "Edit Employee" : "Add Employee"}>
        <div className="space-y-4">
          <Input label="Full Name" placeholder="Jane Smith" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} disabled={saving} />
          {/* Email auto-fetch from team members */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Employee Email <span className="text-slate-400 font-normal ml-1">(optional — select from team)</span>
            </label>
            <select value={form.email}
              onChange={(e) => {
                const selectedEmail = e.target.value;
                const matchedUser = users.find((u) => u.email === selectedEmail);
                const updates: Partial<typeof form> = { email: selectedEmail };
                if (selectedEmail && !form.name.trim()) {
                  updates.name = matchedUser?.displayName || (selectedEmail.split("@")[0].charAt(0).toUpperCase() + selectedEmail.split("@")[0].slice(1));
                }
                if (matchedUser?.commissionPercentage !== undefined &&
                  (matchedUser.salaryType === "commission" || matchedUser.salaryType === "both")) {
                  updates.commissionRate = String(matchedUser.commissionPercentage);
                }
                setForm({ ...form, ...updates });
              }}
              disabled={saving}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:bg-slate-50"
            >
              <option value="">— Select team member email —</option>
              {users.map((u) => (
                <option key={u.uid} value={u.email}>{u.displayName ? `${u.displayName} (${u.email})` : u.email}</option>
              ))}
            </select>
            {(() => {
              const matched = users.find((u) => u.email === form.email);
              if (!matched?.salaryType) return null;
              const parts: string[] = [];
              if ((matched.salaryType === "base" || matched.salaryType === "both") && matched.baseSalary !== undefined)
                parts.push(`Base: $${matched.baseSalary.toLocaleString()}`);
              if ((matched.salaryType === "commission" || matched.salaryType === "both") && matched.commissionPercentage !== undefined)
                parts.push(`Commission: ${matched.commissionPercentage}%`);
              if (!parts.length) return null;
              return (
                <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Auto-fetched</span>
                  <span className="text-xs text-indigo-700 font-semibold">{parts.join(" · ")}</span>
                </div>
              );
            })()}
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Select a team member to auto-fill name and commission rate.</p>
          </div>
          <Select label="Role" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as EmployeeRole })}
            options={ROLES.map((r) => ({ value: r, label: r }))} disabled={saving} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Commission Rate (%)</label>
            <div className="relative">
              <input type="number" min="0" max="100" step="0.1" placeholder="e.g. 10"
                value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                disabled={saving}
                className={`w-full bg-white border rounded-xl px-3 py-2.5 pr-10 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:bg-slate-50 ${errors.commissionRate ? "border-red-500" : "border-slate-200"}`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">%</span>
            </div>
            {errors.commissionRate && <p className="text-xs text-red-500">{errors.commissionRate}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1" disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editingEmployee ? "Save Changes" : "Add Employee"}</Button>
          </div>
        </div>
      </Modal>

      {/* Employee Details Modal */}
      <Modal isOpen={!!viewingEmployee} onClose={() => setViewingEmployee(null)}
        title={viewingEmployee?.employee.name || "Employee Details"} size="lg">
        {viewingEmployee && (() => {
          const colors = ROLE_COLORS[viewingEmployee.employee.role];
          const hasBase = viewingEmployee.baseSalary !== undefined;
          return (
            <div className="space-y-5">
              {/* Employee header */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base border ${colors.avatar}`}>
                      {viewingEmployee.employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-slate-900 font-bold text-base leading-tight">{viewingEmployee.employee.name}</h3>
                      <p className="text-slate-500 text-xs font-medium mt-0.5">{viewingEmployee.employee.role}</p>
                      {viewingEmployee.employee.email && <p className="text-slate-400 text-xs mt-0.5">{viewingEmployee.employee.email}</p>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-0.5 px-3 py-1.5 rounded-xl text-sm font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                    {viewingEmployee.employee.commissionRate.toFixed(1)}<Percent size={12} />
                  </div>
                </div>
              </div>

              {/* Commission section */}
              <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-slate-800 font-semibold text-sm flex items-center gap-2">
                    <Percent size={15} className="text-indigo-500" />Commission Earnings
                  </h4>
                  <StatusBadge status={viewingEmployee.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                    <p className="text-[10px] text-slate-500 font-medium mb-1">Total Owed</p>
                    <p className="text-rose-700 font-bold text-base">${viewingEmployee.totalCommission.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <p className="text-[10px] text-slate-500 font-medium mb-1">Paid</p>
                    <p className="text-emerald-700 font-bold text-base">${viewingEmployee.paidAmount.toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-[10px] text-slate-500 font-medium mb-1">Remaining</p>
                    <p className="text-amber-700 font-bold text-base">${viewingEmployee.remainingAmount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => openPaymentModal("commission")}
                    disabled={viewingEmployee.remainingAmount === 0}>
                    Record Commission Payment
                  </Button>
                </div>
              </div>

              {/* Base Salary section — only shown when the employee has a base salary */}
              {hasBase && (
                <div className="bg-white border border-violet-200/60 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-slate-800 font-semibold text-sm flex items-center gap-2">
                      <Banknote size={15} className="text-violet-500" />Base Salary
                    </h4>
                    <StatusBadge status={viewingEmployee.baseStatus} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 font-medium mb-1">Monthly Base</p>
                      <p className="text-violet-700 font-bold text-base">${viewingEmployee.baseSalary!.toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 font-medium mb-1">Paid</p>
                      <p className="text-emerald-700 font-bold text-base">${viewingEmployee.basePaid.toLocaleString()}</p>
                    </div>
                    <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 font-medium mb-1">Remaining</p>
                      <p className="text-sky-700 font-bold text-base">${viewingEmployee.baseRemaining.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" variant="secondary" onClick={() => openPaymentModal("base")}
                      disabled={viewingEmployee.baseRemaining === 0}>
                      Mark Base Salary Paid
                    </Button>
                  </div>
                </div>
              )}

              {/* Projects List */}
              <div>
                <h4 className="text-slate-800 font-semibold mb-3 flex items-center gap-2 text-sm">
                  <DollarSign size={15} className="text-emerald-600" />
                  Projects ({viewingEmployee.projects.length})
                </h4>
                {viewingEmployee.projects.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-6 text-center">
                    <p className="text-slate-500 text-sm">No projects assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {viewingEmployee.projects.map((project) => {
                      const commission = viewingEmployee.employee.role === "Sales Closer"
                        ? project.salesCloserCommission || 0
                        : viewingEmployee.employee.role === "Cold Caller"
                        ? project.coldCallerCommission || 0
                        : project.leadGenCommission || 0;
                      return (
                        <div key={project.id} className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="text-slate-900 font-semibold text-sm">{project.name}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{project.clientName} · {project.projectType}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-600 font-bold text-sm">${commission.toLocaleString()}</p>
                            <p className="text-slate-400 text-[10px] font-semibold">Commission</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Payment Recording Modal */}
      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)}
        title={paymentForm.type === "base" ? "Record Base Salary Payment" : "Record Commission Payment"}>
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-1 font-medium">
              {paymentForm.type === "base" ? "Base salary payment for" : "Commission payment for"}
            </p>
            <p className="text-slate-800 font-bold text-base">{viewingEmployee?.employee.name}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200/60">
              <span className="text-slate-500 text-sm font-semibold">Remaining Balance</span>
              <span className={`font-bold text-base ${paymentForm.type === "base" ? "text-sky-700" : "text-amber-700"}`}>
                ${(paymentForm.type === "base" ? viewingEmployee?.baseRemaining : viewingEmployee?.remainingAmount)?.toLocaleString()}
              </span>
            </div>
          </div>
          <Input label="Payment Amount ($)" type="number" placeholder="0.00"
            value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            disabled={processingPayment} />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Note (Optional)</label>
            <textarea placeholder="Payment details..." value={paymentForm.note}
              onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
              disabled={processingPayment}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              rows={3} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPaymentModalOpen(false)} className="flex-1" disabled={processingPayment}>Cancel</Button>
            <Button onClick={handleRecordPayment} loading={processingPayment} className="flex-1">Record Payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const map = {
    Paid: { icon: <CheckCircle2 size={13} className="text-emerald-600" />, text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
    Partial: { icon: <Clock size={13} className="text-amber-600" />, text: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
    Unpaid: { icon: <AlertCircle size={13} className="text-rose-600" />, text: "text-rose-700", bg: "bg-rose-50 border-rose-100" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.icon}{status}
    </span>
  );
}

function EmployeeCard({
  data, onEdit, onDelete, onView,
}: {
  data: EmployeeCommissionData;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onView: () => void;
}) {
  const colors = ROLE_COLORS[data.employee.role];
  const rate = data.employee.commissionRate ?? 0;
  const hasBase = data.baseSalary !== undefined;

  const commStatusColor = data.status === "Paid" ? "text-emerald-600 bg-emerald-50 border-emerald-100"
    : data.status === "Partial" ? "text-amber-600 bg-amber-50 border-amber-100"
    : "text-rose-600 bg-rose-50 border-rose-100";

  const baseStatusColor = data.baseStatus === "Paid" ? "text-emerald-600 bg-emerald-50 border-emerald-100"
    : data.baseStatus === "Partial" ? "text-sky-600 bg-sky-50 border-sky-100"
    : "text-violet-600 bg-violet-50 border-violet-100";

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${colors.avatar}`}>
            {data.employee.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-900 text-sm font-semibold truncate">{data.employee.name}</p>
            <p className="text-slate-500 text-xs font-medium mt-0.5">{data.employee.role}</p>
            {data.employee.email && <p className="text-slate-400 text-[10px] mt-0.5 truncate">{data.employee.email}</p>}
          </div>
        </div>
        <div className={`flex items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${colors.pill}`}>
          {rate.toFixed(1)}<Percent size={10} />
        </div>
      </div>

      {/* Commission stats */}
      <div className="mb-2">
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1">
          <Percent size={9} />Commission
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-rose-50/55 border border-rose-100/40 rounded-lg p-2">
            <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Total</p>
            <p className="text-rose-600 font-bold text-xs">${data.totalCommission.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50/55 border border-emerald-100/40 rounded-lg p-2">
            <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Paid</p>
            <p className="text-emerald-600 font-bold text-xs">${data.paidAmount.toLocaleString()}</p>
          </div>
          <div className="bg-amber-50/55 border border-amber-100/40 rounded-lg p-2">
            <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Due</p>
            <p className="text-amber-600 font-bold text-xs">${data.remainingAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Base salary stats — only shown when applicable */}
      {hasBase && (
        <div className="mb-2">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Banknote size={9} />Base Salary
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-violet-50/55 border border-violet-100/40 rounded-lg p-2">
              <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Base</p>
              <p className="text-violet-600 font-bold text-xs">${data.baseSalary!.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50/55 border border-emerald-100/40 rounded-lg p-2">
              <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Paid</p>
              <p className="text-emerald-600 font-bold text-xs">${data.basePaid.toLocaleString()}</p>
            </div>
            <div className="bg-sky-50/55 border border-sky-100/40 rounded-lg p-2">
              <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Due</p>
              <p className="text-sky-600 font-bold text-xs">${data.baseRemaining.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status badges & actions */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${commStatusColor}`}>
            Comm: {data.status}
          </span>
          {hasBase && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${baseStatusColor}`}>
              Base: {data.baseStatus}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={onView} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <Eye size={14} />
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(data.employee.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
