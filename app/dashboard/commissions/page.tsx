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
import { Commission, EmployeeRole } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { Plus, Pencil, Trash2, Users, PhoneCall, DollarSign } from "lucide-react";

const ROLES: EmployeeRole[] = ["Sales Closer", "Cold Caller"];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Commission | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Sales Closer" as EmployeeRole, totalCommission: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "commissions"), (snap) => {
      setCommissions(snap.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ...raw,
          createdAt: raw.createdAt?.toDate?.() ?? new Date(),
          updatedAt: raw.updatedAt?.toDate?.() ?? new Date(),
        } as Commission;
      }));
      setLoading(false);
    });
    return unsub;
  }, []);

  const openAdd = () => {
    setEditingEmployee(null);
    setForm({ name: "", role: "Sales Closer", totalCommission: "" });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (emp: Commission) => {
    setEditingEmployee(emp);
    setForm({ name: emp.name, role: emp.role, totalCommission: String(emp.totalCommission || "") });
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.totalCommission || isNaN(parseFloat(form.totalCommission))) e.totalCommission = "Valid commission amount required";
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
        totalCommission: parseFloat(form.totalCommission) || 0,
        updatedAt: serverTimestamp(),
      };
      if (editingEmployee) {
        await updateDoc(doc(db, "commissions", editingEmployee.id), payload);
      } else {
        await addDoc(collection(db, "commissions"), { ...payload, createdAt: serverTimestamp() });
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

  const salesClosers = commissions.filter((c) => c.role === "Sales Closer");
  const coldCallers = commissions.filter((c) => c.role === "Cold Caller");
  const totalSales = salesClosers.reduce((s, c) => s + c.totalCommission, 0);
  const totalCold = coldCallers.reduce((s, c) => s + c.totalCommission, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Commissions</h1>
          <p className="text-slate-400 text-sm mt-1">Manage employee commissions — affects profit calculations</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus size={16} />
          Add Employee
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111827] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <Users size={16} className="text-indigo-400" />
            </div>
            <p className="text-sm text-slate-400">Sales Closers</p>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalSales)}</p>
          <p className="text-xs text-slate-500 mt-1">{salesClosers.length} employees</p>
        </div>
        <div className="bg-[#111827] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl">
              <PhoneCall size={16} className="text-yellow-400" />
            </div>
            <p className="text-sm text-slate-400">Cold Callers</p>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalCold)}</p>
          <p className="text-xs text-slate-500 mt-1">{coldCallers.length} employees</p>
        </div>
        <div className="bg-[#111827] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/10 rounded-xl">
              <DollarSign size={16} className="text-red-400" />
            </div>
            <p className="text-sm text-slate-400">Total Commission Cost</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalSales + totalCold)}</p>
          <p className="text-xs text-slate-500 mt-1">Deducted from profit</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Closers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg">
              <Users size={14} className="text-indigo-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Sales Closers</h2>
            <span className="text-xs text-slate-500">({salesClosers.length})</span>
          </div>
          <div className="space-y-3">
            {loading ? (
              [1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
            ) : salesClosers.length === 0 ? (
              <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-slate-500 text-sm">No sales closers added yet</p>
              </div>
            ) : (
              salesClosers.map((emp) => (
                <EmployeeCard key={emp.id} emp={emp} onEdit={openEdit} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>

        {/* Cold Callers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-yellow-500/10 rounded-lg">
              <PhoneCall size={14} className="text-yellow-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Cold Callers</h2>
            <span className="text-xs text-slate-500">({coldCallers.length})</span>
          </div>
          <div className="space-y-3">
            {loading ? (
              [1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
            ) : coldCallers.length === 0 ? (
              <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-slate-500 text-sm">No cold callers added yet</p>
              </div>
            ) : (
              coldCallers.map((emp) => (
                <EmployeeCard key={emp.id} emp={emp} onEdit={openEdit} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
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
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as EmployeeRole })}
            options={ROLES.map((r) => ({ value: r, label: r }))}
          />
          <Input
            label="Total Commission ($)"
            type="number"
            placeholder="2500"
            value={form.totalCommission}
            onChange={(e) => setForm({ ...form, totalCommission: e.target.value })}
            error={errors.totalCommission}
          />
          <p className="text-xs text-slate-500">
            This amount will be automatically deducted from the total revenue in the Profit calculation on the dashboard.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editingEmployee ? "Save Changes" : "Add Employee"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EmployeeCard({
  emp,
  onEdit,
  onDelete,
}: {
  emp: Commission;
  onEdit: (e: Commission) => void;
  onDelete: (id: string) => void;
}) {
  const isCloser = emp.role === "Sales Closer";
  return (
    <div className="bg-[#111827] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isCloser ? "bg-indigo-500/20 text-indigo-400" : "bg-yellow-500/20 text-yellow-400"}`}>
          {emp.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white text-sm font-medium">{emp.name}</p>
          <p className="text-slate-500 text-xs">{emp.role}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className={`font-semibold text-sm ${isCloser ? "text-indigo-400" : "text-yellow-400"}`}>
          {formatCurrency(emp.totalCommission)}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(emp)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(emp.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
