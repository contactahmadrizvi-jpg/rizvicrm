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
import { Commission, CommissionPayment, EmployeeRole, Project, PaymentStatus } from "@/lib/types";
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
} from "lucide-react";

const ROLES: EmployeeRole[] = ["Sales Closer", "Cold Caller"];

interface EmployeeCommissionData {
  employee: Commission;
  projects: Project[];
  totalCommission: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
}

interface PaymentForm {
  amount: string;
  note: string;
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Commission | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "Sales Closer" as EmployeeRole,
    commissionRate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewingEmployee, setViewingEmployee] = useState<EmployeeCommissionData | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({ amount: "", note: "" });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [commissionPayments, setCommissionPayments] = useState<CommissionPayment[]>([]);

  useEffect(() => {
    let cl = false, pl = false;
    const check = () => { if (cl && pl) setLoading(false); };

    const unsub = onSnapshot(collection(db, "commissions"), (snap) => {
      setCommissions(
        snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            ...raw,
            commissionRate: raw.commissionRate ?? raw.totalCommission ?? 0,
            createdAt: raw.createdAt?.toDate?.() ?? new Date(),
            updatedAt: raw.updatedAt?.toDate?.() ?? new Date(),
          } as Commission;
        })
      );
      cl = true; check();
    });

    const unsubP = onSnapshot(collection(db, "projects"), (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
      pl = true; check();
    });

    const unsubPay = onSnapshot(collection(db, "commissionPayments"), (snap) => {
      setCommissionPayments(
        snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            ...raw,
            createdAt: raw.createdAt?.toDate?.() ?? new Date(),
          } as CommissionPayment;
        })
      );
    });

    return () => { unsub(); unsubP(); unsubPay(); };
  }, []);

  // Calculate commission data for each employee
  const getEmployeeCommissionData = (): EmployeeCommissionData[] => {
    return commissions.map((emp) => {
      const employeeProjects = projects.filter((p) => {
        const isAssigned =
          (emp.role === "Sales Closer" && p.salesCloserId === emp.id) ||
          (emp.role === "Cold Caller" && p.coldCallerId === emp.id);
        
        if (!isAssigned) return false;
        
        // Apply date filter
        if (dateRange.start && dateRange.end) {
          const projectDate = new Date(p.createdAt);
          return projectDate >= dateRange.start && projectDate <= dateRange.end;
        }
        return true;
      });

      // Sum up ACTUAL commissions from assigned projects only
      const totalCommission = employeeProjects.reduce((sum, p) => {
        const commission =
          emp.role === "Sales Closer"
            ? (p.salesCloserCommission || 0)
            : (p.coldCallerCommission || 0);
        return sum + commission;
      }, 0);

      // Real paid amount from Firestore commissionPayments
      const paidAmount = commissionPayments
        .filter((cp) => cp.employeeId === emp.id)
        .reduce((sum, cp) => sum + (cp.amount || 0), 0);

      const remainingAmount = Math.max(0, totalCommission - paidAmount);
      const status: PaymentStatus =
        totalCommission === 0 ? "Unpaid"
        : remainingAmount === 0 ? "Paid"
        : paidAmount > 0 ? "Partial"
        : "Unpaid";

      return {
        employee: emp,
        projects: employeeProjects,
        totalCommission,
        paidAmount,
        remainingAmount,
        status,
      };
    });
  };

  const employeeData = getEmployeeCommissionData();
  const filteredData = employeeData;

  const salesClosers = employeeData.filter((d) => d.employee.role === "Sales Closer");
  const coldCallers = employeeData.filter((d) => d.employee.role === "Cold Caller");

  // Keep the viewing modal in sync when payments update
  useEffect(() => {
    if (!viewingEmployee) return;
    const updated = employeeData.find(
      (d) => d.employee.id === viewingEmployee.employee.id
    );
    if (updated) setViewingEmployee(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commissionPayments]);

  const openAdd = () => {
    setEditingEmployee(null);
    setForm({ name: "", role: "Sales Closer", commissionRate: "" });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (emp: Commission) => {
    setEditingEmployee(emp);
    setForm({
      name: emp.name,
      role: emp.role,
      commissionRate: String(emp.commissionRate ?? ""),
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    const rate = parseFloat(form.commissionRate);
    if (!form.commissionRate || isNaN(rate)) {
      e.commissionRate = "Enter a valid percentage";
    } else if (rate < 0 || rate > 100) {
      e.commissionRate = "Must be between 0 and 100";
    }
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        role: form.role,
        commissionRate: parseFloat(form.commissionRate),
        updatedAt: serverTimestamp(),
      };
      if (editingEmployee) {
        await updateDoc(doc(db, "commissions", editingEmployee.id), payload);
      } else {
        await addDoc(collection(db, "commissions"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this employee?")) return;
    await deleteDoc(doc(db, "commissions", id));
  };

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
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
        note: paymentForm.note.trim() || null,
        createdAt: serverTimestamp(),
      });
      setPaymentModalOpen(false);
      setPaymentForm({ amount: "", note: "" });
    } finally {
      setProcessingPayment(false);
    }
  };

  const avgRate = (list: EmployeeCommissionData[]) =>
    list.length === 0
      ? 0
      : list.reduce((s, d) => s + (d.employee.commissionRate ?? 0), 0) / list.length;

  const totalCommissionAll = filteredData.reduce((s, d) => s + d.totalCommission, 0);
  const totalPaidAll = filteredData.reduce((s, d) => s + d.paidAmount, 0);
  const totalRemainingAll = filteredData.reduce((s, d) => s + d.remainingAmount, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commissions</h1>
          <p className="text-slate-500 text-sm mt-1">
            Commission rates applied as % of project revenue, with payment tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="gap-2"
          >
            <Calendar size={16} />
            {dateRange.start && dateRange.end ? "Filter Active" : "Filter by Date"}
          </Button>
          <Button onClick={openAdd} className="gap-2">
            <Plus size={16} />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      {showDateFilter && (
        <div className="mb-6">
          <DateRangePicker onDateChange={handleDateChange} />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl">
              <Users size={16} className="text-indigo-600" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Sales Closers</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {avgRate(salesClosers).toFixed(1)}
            <span className="text-lg text-indigo-600 ml-1">%</span>
          </p>
          <p className="text-xs text-slate-400 mt-1 font-medium">avg rate · {salesClosers.length} employees</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl">
              <PhoneCall size={16} className="text-amber-600" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Cold Callers</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {avgRate(coldCallers).toFixed(1)}
            <span className="text-lg text-amber-600 ml-1">%</span>
          </p>
          <p className="text-xs text-slate-400 mt-1 font-medium">avg rate · {coldCallers.length} employees</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl">
              <Percent size={16} className="text-rose-600" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Total Commission</p>
          </div>
          <p className="text-3xl font-bold text-rose-600">
            ${totalCommissionAll.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-medium">across {commissions.length} employees</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl">
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Total Paid</p>
          </div>
          <p className="text-3xl font-bold text-emerald-600">
            ${totalPaidAll.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-medium">${totalRemainingAll.toLocaleString()} remaining</p>
        </div>
      </div>

      {/* Two-column employee list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Closers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
              <Users size={14} className="text-indigo-600" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800">Sales Closers</h2>
            <span className="text-xs text-slate-400 font-semibold">({salesClosers.length})</span>
          </div>
          <div className="space-y-3">
            {loading ? (
              [1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
            ) : salesClosers.length === 0 ? (
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-center shadow-sm">
                <p className="text-slate-500 text-sm">No sales closers added yet</p>
              </div>
            ) : (
              salesClosers.map((data) => (
                <EmployeeCard
                  key={data.employee.id}
                  data={data}
                  onEdit={() => openEdit(data.employee)}
                  onDelete={handleDelete}
                  onView={() => setViewingEmployee(data)}
                />
              ))
            )}
          </div>
        </div>

        {/* Cold Callers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-amber-50 border border-amber-100 rounded-lg">
              <PhoneCall size={14} className="text-amber-600" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800">Cold Callers</h2>
            <span className="text-xs text-slate-400 font-semibold">({coldCallers.length})</span>
          </div>
          <div className="space-y-3">
            {loading ? (
              [1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
            ) : coldCallers.length === 0 ? (
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-center shadow-sm">
                <p className="text-slate-500 text-sm">No cold callers added yet</p>
              </div>
            ) : (
              coldCallers.map((data) => (
                <EmployeeCard
                  key={data.employee.id}
                  data={data}
                  onEdit={() => openEdit(data.employee)}
                  onDelete={handleDelete}
                  onView={() => setViewingEmployee(data)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmployee ? "Edit Employee" : "Add Employee"}
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Jane Smith"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            disabled={saving}
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as EmployeeRole })}
            options={ROLES.map((r) => ({ value: r, label: r }))}
            disabled={saving}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Commission Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g. 10"
                value={form.commissionRate}
                onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                disabled={saving}
                className={`w-full bg-white border rounded-xl px-3 py-2.5 pr-10
                  text-slate-900 text-sm placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                  transition-all disabled:bg-slate-50 disabled:text-slate-400 ${
                    errors.commissionRate ? "border-red-500 focus:ring-red-500/20" : "border-slate-200"
                  }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                %
              </span>
            </div>
            {errors.commissionRate && (
              <p className="text-xs text-red-500">{errors.commissionRate}</p>
            )}
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              This % of the project revenue will be counted as commission cost.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editingEmployee ? "Save Changes" : "Add Employee"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Employee Details Modal */}
      <Modal
        isOpen={!!viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        title={viewingEmployee?.employee.name || "Employee Details"}
        size="lg"
      >
        {viewingEmployee && (
          <div className="space-y-6">
            {/* Employee Info */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border
                      ${
                        viewingEmployee.employee.role === "Sales Closer"
                          ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                          : "bg-amber-100 text-amber-700 border-amber-200"
                      }`}
                  >
                    {viewingEmployee.employee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-lg leading-tight">
                      {viewingEmployee.employee.name}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium mt-0.5">{viewingEmployee.employee.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs font-semibold mb-1">Commission Rate</p>
                  <div
                    className={`flex items-center gap-0.5 px-3 py-1.5 rounded-xl text-sm font-bold border
                      ${
                        viewingEmployee.employee.role === "Sales Closer"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200/40"
                          : "bg-amber-50 text-amber-700 border-amber-200/40"
                      }`}
                  >
                    {viewingEmployee.employee.commissionRate.toFixed(1)}
                    <Percent size={12} />
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                  <p className="text-xs text-slate-500 font-medium mb-1">Total Commission</p>
                  <p className="text-rose-700 font-bold text-lg">
                    ${viewingEmployee.totalCommission.toLocaleString()}
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-xs text-slate-500 font-medium mb-1">Paid</p>
                  <p className="text-emerald-700 font-bold text-lg">
                    ${viewingEmployee.paidAmount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs text-slate-500 font-medium mb-1">Remaining</p>
                  <p className="text-amber-700 font-bold text-lg">
                    ${viewingEmployee.remainingAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Payment Status */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {viewingEmployee.status === "Paid" ? (
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  ) : viewingEmployee.status === "Partial" ? (
                    <Clock size={18} className="text-amber-600" />
                  ) : (
                    <AlertCircle size={18} className="text-rose-600" />
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      viewingEmployee.status === "Paid"
                        ? "text-emerald-700"
                        : viewingEmployee.status === "Partial"
                        ? "text-amber-700"
                        : "text-rose-700"
                    }`}
                  >
                    {viewingEmployee.status}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setPaymentModalOpen(true)}
                  disabled={viewingEmployee.remainingAmount === 0}
                >
                  Record Payment
                </Button>
              </div>
            </div>

            {/* Projects List */}
            <div>
              <h4 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-600" />
                Projects ({viewingEmployee.projects.length})
              </h4>
              {viewingEmployee.projects.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-8 text-center">
                  <p className="text-slate-500 text-sm">No projects assigned yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {viewingEmployee.projects.map((project) => {
                    const commission =
                      viewingEmployee.employee.role === "Sales Closer"
                        ? project.salesCloserCommission || 0
                        : project.coldCallerCommission || 0;
                    return (
                      <div
                        key={project.id}
                        className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-slate-900 font-semibold text-sm">{project.name}</p>
                            <p className="text-slate-500 text-xs mt-1">
                              {project.clientName} • {project.projectType}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-600 font-bold text-sm">
                              ${commission.toLocaleString()}
                            </p>
                            <p className="text-slate-400 text-xs font-semibold">Commission</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Recording Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Record Payment"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-2 font-medium">Payment for</p>
            <p className="text-slate-800 font-bold text-lg leading-tight">{viewingEmployee?.employee.name}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200/60">
              <span className="text-slate-500 text-sm font-semibold">Remaining Balance</span>
              <span className="text-amber-700 font-bold text-lg">
                ${viewingEmployee?.remainingAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <Input
            label="Payment Amount ($)"
            type="number"
            placeholder="0.00"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            disabled={processingPayment}
          />

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Note (Optional)
            </label>
            <textarea
              placeholder="Payment details..."
              value={paymentForm.note}
              onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
              disabled={processingPayment}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setPaymentModalOpen(false)}
              className="flex-1"
              disabled={processingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              loading={processingPayment}
              className="flex-1"
            >
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EmployeeCard({
  data,
  onEdit,
  onDelete,
  onView,
}: {
  data: EmployeeCommissionData;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onView: () => void;
}) {
  const isCloser = data.employee.role === "Sales Closer";
  const rate = data.employee.commissionRate ?? 0;

  const statusColor =
    data.status === "Paid"
      ? "text-emerald-600 bg-emerald-50 border-emerald-100"
      : data.status === "Partial"
      ? "text-amber-600 bg-amber-50 border-amber-100"
      : "text-rose-600 bg-rose-50 border-rose-100";

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border
              ${isCloser ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}
          >
            {data.employee.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-900 text-sm font-semibold truncate leading-snug">{data.employee.name}</p>
            <p className="text-slate-500 text-xs font-medium mt-0.5">{data.employee.role}</p>
          </div>
        </div>

        {/* Rate badge */}
        <div
          className={`flex items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border
            ${
              isCloser
                ? "bg-indigo-50 text-indigo-700 border-indigo-150"
                : "bg-amber-50 text-amber-700 border-amber-150"
            }`}
        >
          {rate.toFixed(1)}
          <Percent size={10} />
        </div>
      </div>

      {/* Commission Summary */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-rose-50/55 border border-rose-100/40 rounded-lg p-2">
          <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Total</p>
          <p className="text-rose-600 font-bold text-sm">${data.totalCommission.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-50/55 border border-emerald-100/40 rounded-lg p-2">
          <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Paid</p>
          <p className="text-emerald-600 font-bold text-sm">${data.paidAmount.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50/55 border border-amber-100/40 rounded-lg p-2">
          <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Due</p>
          <p className="text-amber-600 font-bold text-sm">
            ${data.remainingAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>{data.status}</span>
        <div className="flex gap-1">
          <button
            onClick={onView}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(data.employee.id)}
            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
