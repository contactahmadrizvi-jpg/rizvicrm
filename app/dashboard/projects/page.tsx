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
import { Project, Client, ProjectType, Commission } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { ProjectDetailsModal } from "@/components/ProjectDetailsModal";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Plus, Pencil, Trash2, FolderKanban, X, Eye, Calendar } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const PROJECT_TYPES: ProjectType[] = ["App Development", "AI Receptionist", "Other"];

interface ProjectForm {
  name: string;
  description: string;
  clientId: string;
  projectType: ProjectType;
  features: string[];
  budget: string;
  upfrontPaid: string;
  assignedEmployeeId: string;
  assignedEmployeeType: "Sales Closer" | "Cold Caller" | "";
  startDate: string;
  deadline: string;
}

const emptyForm: ProjectForm = {
  name: "",
  description: "",
  clientId: "",
  projectType: "App Development",
  features: [],
  budget: "",
  upfrontPaid: "",
  assignedEmployeeId: "",
  assignedEmployeeType: "",
  startDate: "",
  deadline: "",
};

export default function ProjectsPage() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [closedClients, setClosedClients] = useState<Client[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [newFeature, setNewFeature] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentProject, setPaymentProject] = useState<Project | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [deadlineType, setDeadlineType] = useState<"specific" | "days" | "weeks">("specific");
  const [deadlineValue, setDeadlineValue] = useState<number>(0);

  const calculateDeadline = (start: string, value: number, unit: "days" | "weeks") => {
    if (!start || !value) return "";
    const startDateObj = new Date(start);
    if (isNaN(startDateObj.getTime())) return "";
    const daysToAdd = unit === "days" ? value : value * 7;
    startDateObj.setDate(startDateObj.getDate() + daysToAdd);
    return startDateObj.toISOString().split("T")[0];
  };

  useEffect(() => {
    let pl = false, cl = false, cm = false;
    const check = () => { if (pl && cl && cm) setLoading(false); };

    const unsubP = onSnapshot(collection(db, "projects"), (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
      pl = true; check();
    });

    const unsubC = onSnapshot(collection(db, "clients"), (snap) => {
      setClosedClients(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Client))
          .filter((c) => c.status === "Closed")
      );
      cl = true; check();
    });

    const unsubCom = onSnapshot(collection(db, "commissions"), (snap) => {
      setCommissions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Commission)));
      cm = true; check();
    });

    return () => { unsubP(); unsubC(); unsubCom(); };
  }, []);

  const openAdd = () => {
    setEditingProject(null);
    setForm(emptyForm);
    setDeadlineType("specific");
    setDeadlineValue(0);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    const assignedEmployeeId = project.salesCloserId || project.coldCallerId || "";
    const assignedEmployeeType = project.salesCloserId
      ? "Sales Closer"
      : project.coldCallerId
      ? "Cold Caller"
      : "";
    setForm({
      name: project.name,
      description: project.description,
      clientId: project.clientId,
      projectType: project.projectType,
      features: project.features || [],
      budget: String(project.budget || ""),
      upfrontPaid: String(project.upfrontPaid || ""),
      assignedEmployeeId,
      assignedEmployeeType,
      startDate: project.startDate || "",
      deadline: project.deadline || "",
    });

    if (project.startDate && project.deadline) {
      const start = new Date(project.startDate);
      const dead = new Date(project.deadline);
      const diffTime = dead.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        if (diffDays % 7 === 0) {
          setDeadlineType("weeks");
          setDeadlineValue(diffDays / 7);
        } else {
          setDeadlineType("days");
          setDeadlineValue(diffDays);
        }
      } else {
        setDeadlineType("specific");
        setDeadlineValue(0);
      }
    } else {
      setDeadlineType("specific");
      setDeadlineValue(0);
    }

    setErrors({});
    setIsModalOpen(true);
  };

  const handleClientSelect = (clientId: string) => {
    const client = closedClients.find((c) => c.id === clientId);
    setForm({
      ...form,
      clientId,
      budget: client ? String(client.projectValue || "") : form.budget,
      upfrontPaid: client ? String(client.upfrontPaid || "") : form.upfrontPaid,
    });
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setForm({ ...form, features: [...form.features, newFeature.trim()] });
      setNewFeature("");
    }
  };

  const removeFeature = (idx: number) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== idx) });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Project name is required";
    if (!form.clientId) e.clientId = "Please select a client";
    if (!form.budget || isNaN(parseFloat(form.budget))) e.budget = "Budget is required";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    const client = closedClients.find((c) => c.id === form.clientId);
    const assignedEmployee = commissions.find((c) => c.id === form.assignedEmployeeId);
    
    const budget = parseFloat(form.budget) || 0;
    const upfrontPaid = parseFloat(form.upfrontPaid) || 0;
    const employeeCommission = assignedEmployee ? (budget * assignedEmployee.commissionRate) / 100 : 0;

    const isSalesCloser = form.assignedEmployeeType === "Sales Closer";
    const isColdCaller = form.assignedEmployeeType === "Cold Caller";

    // Calculate payment status
    const totalPaid = editingProject ? editingProject.totalPaid || upfrontPaid : upfrontPaid;
    const remainingPayment = budget - totalPaid;
    const paymentStatus = 
      totalPaid >= budget ? "Paid" 
      : totalPaid > 0 ? "Partial" 
      : "Unpaid";

    try {
      const payload = {
        name: form.name,
        description: form.description,
        clientId: form.clientId,
        clientName: client?.name || "",
        projectType: form.projectType,
        features: form.features,
        budget,
        upfrontPaid,
        totalPaid,
        remainingPayment,
        paymentStatus,
        salesCloserId: isSalesCloser ? form.assignedEmployeeId : null,
        salesCloserName: isSalesCloser ? assignedEmployee?.name || null : null,
        salesCloserCommission: isSalesCloser ? employeeCommission : null,
        coldCallerId: isColdCaller ? form.assignedEmployeeId : null,
        coldCallerName: isColdCaller ? assignedEmployee?.name || null : null,
        coldCallerCommission: isColdCaller ? employeeCommission : null,
        totalCommission: employeeCommission || null,
        startDate: form.startDate || null,
        deadline: form.deadline || null,
        updatedAt: serverTimestamp(),
      };
      if (editingProject) {
        await updateDoc(doc(db, "projects", editingProject.id), payload);
      } else {
        await addDoc(collection(db, "projects"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const openPaymentModal = (project: Project) => {
    setPaymentProject(project);
    setPaymentAmount("");
    setPaymentModalOpen(true);
  };

  const handleMarkAsPaid = async (project: Project) => {
    if (!confirm(`Mark "${project.name}" as fully paid?`)) return;
    await updateDoc(doc(db, "projects", project.id), {
      totalPaid: project.budget,
      remainingPayment: 0,
      paymentStatus: "Paid",
      updatedAt: serverTimestamp(),
    });
  };

  const handleUpdatePayment = async () => {
    if (!paymentProject) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const newTotalPaid = (paymentProject.totalPaid || 0) + amount;
    const remainingPayment = paymentProject.budget - newTotalPaid;
    const paymentStatus = 
      newTotalPaid >= paymentProject.budget ? "Paid" 
      : newTotalPaid > 0 ? "Partial" 
      : "Unpaid";

    await updateDoc(doc(db, "projects", paymentProject.id), {
      totalPaid: newTotalPaid,
      remainingPayment: Math.max(0, remainingPayment),
      paymentStatus,
      updatedAt: serverTimestamp(),
    });

    setPaymentModalOpen(false);
    setPaymentProject(null);
    setPaymentAmount("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await deleteDoc(doc(db, "projects", id));
  };

  const typeColors: Record<ProjectType, string> = {
    "App Development": "bg-indigo-50 text-indigo-700 border-indigo-200/50",
    "AI Receptionist": "bg-blue-50 text-blue-700 border-blue-200/50",
    "Other": "bg-slate-50 text-slate-600 border-slate-200/50",
  };

  const salesClosers = commissions.filter((c) => c.role === "Sales Closer");
  const coldCallers = commissions.filter((c) => c.role === "Cold Caller");

  // Filter projects by date range
  const filteredProjects = projects.filter((project) => {
    if (!dateRange.start || !dateRange.end) return true;
    const projectDate = new Date(project.createdAt);
    return projectDate >= dateRange.start && projectDate <= dateRange.end;
  });

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
  };

  const viewingClient = closedClients.find((c) => c.id === viewingProject?.clientId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">Manage client projects and budgets</p>
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
          {isAdmin && (
            <Button onClick={openAdd} className="gap-2">
              <Plus size={16} />
              New Project
            </Button>
          )}
        </div>
      </div>

      {/* Date Filter */}
      {showDateFilter && (
        <div className="mb-6">
          <DateRangePicker onDateChange={handleDateChange} />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-12 text-center shadow-sm">
          <FolderKanban size={40} className="text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500 text-sm mb-4">
            {dateRange.start && dateRange.end
              ? "No projects in selected date range"
              : "No projects yet"}
          </p>
          {isAdmin && <Button onClick={openAdd} size="sm">Create First Project</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card key={project.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-semibold text-sm truncate">{project.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{project.clientName}</p>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${typeColors[project.projectType]}`}>
                  {project.projectType}
                </span>
              </div>

              {project.description && (
                <p className="text-slate-600 text-xs mb-3 line-clamp-2 leading-relaxed">{project.description}</p>
              )}

              {project.features && project.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.features.slice(0, 3).map((f, i) => (
                    <span key={i} className="text-xs bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200/60 font-medium">
                      {f}
                    </span>
                  ))}
                  {project.features.length > 3 && (
                    <span className="text-xs text-slate-400">+{project.features.length - 3} more</span>
                  )}
                </div>
              )}

              {/* Deadline badge on card */}
              {project.deadline && (() => {
                const now = new Date();
                const dl = new Date(project.deadline);
                const diffDays = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays < 0;
                const isSoon = diffDays >= 0 && diffDays <= 7;
                return (
                  <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg mb-3 w-fit border ${
                    isOverdue ? "bg-rose-50 text-rose-700 border-rose-200/50"
                    : isSoon   ? "bg-amber-50 text-amber-700 border-amber-200/50"
                                : "bg-slate-50 text-slate-500 border-slate-200/50"
                  }`}>
                    <Calendar size={11} />
                    <span className="font-medium">
                      {isOverdue
                        ? `Overdue by ${Math.abs(diffDays)}d`
                        : isSoon
                        ? `Due in ${diffDays}d`
                        : `Deadline: ${dl.toLocaleDateString()}`}
                    </span>
                  </div>
                );
              })()}

              {/* Financial grid — admin only */}
              {isAdmin && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
                    <p className="text-[10px] text-slate-500 mb-0.5 font-semibold">Budget</p>
                    <p className="text-emerald-700 font-bold text-sm">${Number(project.budget || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5">
                    <p className="text-[10px] text-slate-500 mb-0.5 font-semibold">Paid</p>
                    <p className="text-blue-700 font-bold text-sm">${Number(project.totalPaid || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-2.5">
                    <p className="text-[10px] text-slate-500 mb-0.5 font-semibold">Remaining</p>
                    <p className="text-orange-700 font-bold text-sm">${Number(project.remainingPayment || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Payment status — admin only */}
              {isAdmin && (
                <div className="mb-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      project.paymentStatus === "Paid"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                        : project.paymentStatus === "Partial"
                        ? "bg-amber-50 text-amber-700 border-amber-200/50"
                        : "bg-rose-50 text-rose-700 border-rose-200/50"
                    }`}
                  >
                    {project.paymentStatus || "Unpaid"}
                  </span>
                </div>
              )}

              <div className="flex gap-2 mb-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewingProject(project)}
                  className="flex-1 gap-1"
                >
                  <Eye size={12} />
                  View
                </Button>
                {isAdmin && (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(project)} className="flex-1 gap-1">
                      <Pencil size={12} />
                      Edit
                    </Button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors border border-slate-200/60"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>

              {/* Payment buttons — admin only */}
              {isAdmin && project.paymentStatus !== "Paid" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => openPaymentModal(project)} className="flex-1 text-xs">
                    Update Payment
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleMarkAsPaid(project)} className="flex-1 text-xs">
                    Mark as Paid
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? "Edit Project" : "New Project"}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            placeholder="My Awesome Project"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            disabled={saving}
          />
          <Textarea
            label="Description"
            placeholder="What does this project do?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            disabled={saving}
          />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Client (Closed Only)
            </label>
            <select
              value={form.clientId}
              onChange={(e) => handleClientSelect(e.target.value)}
              disabled={saving}
              className={`w-full bg-white border rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${errors.clientId ? "border-red-500" : "border-slate-200"}`}
            >
              <option value="" className="bg-white text-slate-900">Select a client...</option>
              {closedClients.map((c) => (
                <option key={c.id} value={c.id} className="bg-white text-slate-900">
                  {c.name} — {c.company}
                </option>
              ))}
            </select>
            {errors.clientId && <p className="text-xs text-red-500 mt-1">{errors.clientId}</p>}
            {closedClients.length === 0 && (
              <p className="text-xs text-amber-600 font-semibold mt-1">No closed clients yet. Close a lead first.</p>
            )}
          </div>

          <Select
            label="Project Type"
            value={form.projectType}
            onChange={(e) => setForm({ ...form, projectType: e.target.value as ProjectType })}
            options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))}
            disabled={saving}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Budget ($)"
              type="number"
              placeholder="Auto-filled from client"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              error={errors.budget}
              disabled={saving}
            />
            <Input
              label="Upfront Paid ($)"
              type="number"
              placeholder="Auto-filled from client"
              value={form.upfrontPaid}
              onChange={(e) => setForm({ ...form, upfrontPaid: e.target.value })}
              disabled={saving}
            />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  disabled={saving}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setForm((prev) => {
                      const updated = { ...prev, startDate: newStart };
                      if (newStart && deadlineType !== "specific") {
                        updated.deadline = calculateDeadline(newStart, deadlineValue, deadlineType);
                      }
                      return updated;
                    });
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Deadline Format</label>
                <select
                  value={deadlineType}
                  disabled={saving}
                  onChange={(e) => {
                    const type = e.target.value as "specific" | "days" | "weeks";
                    setDeadlineType(type);
                    if (type === "specific") {
                      // Reset value
                    } else {
                      const val = deadlineValue || 7;
                      if (!deadlineValue) setDeadlineValue(val);
                      if (form.startDate) {
                        setForm((prev) => ({
                          ...prev,
                          deadline: calculateDeadline(prev.startDate, val, type),
                        }));
                      }
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="specific">Specific Date</option>
                  <option value="days">After X Days</option>
                  <option value="weeks">After Y Weeks</option>
                </select>
              </div>
            </div>

            <div>
              {deadlineType === "specific" ? (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    disabled={saving}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      {deadlineType === "days" ? "Number of Days" : "Number of Weeks"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={deadlineValue || ""}
                      disabled={saving}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setDeadlineValue(val);
                        if (form.startDate && val > 0) {
                          setForm((prev) => ({
                            ...prev,
                            deadline: calculateDeadline(prev.startDate, val, deadlineType),
                          }));
                        }
                      }}
                      placeholder={deadlineType === "days" ? "e.g. 10" : "e.g. 4"}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="py-2 px-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600 shadow-inner">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Calculated Deadline</span>
                    <span className="font-semibold text-slate-700">
                      {form.deadline
                        ? new Date(form.deadline + "T00:00:00").toLocaleDateString(undefined, { dateStyle: "medium" })
                        : "Select start date & inputs"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Commission Assignment - Single Employee Only */}
          <div className="border-t border-slate-100 pt-4 mt-2">
            <h4 className="text-slate-800 font-semibold mb-3 text-sm">
              Commission Assignment (Select One)
            </h4>
            <div className="space-y-3">
              {/* Employee Type Selection */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Employee Type
                </label>
                <select
                  value={form.assignedEmployeeType}
                  disabled={saving}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      assignedEmployeeType: e.target.value as any,
                      assignedEmployeeId: "",
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">None</option>
                  <option value="Sales Closer">Sales Closer</option>
                  <option value="Cold Caller">Cold Caller</option>
                </select>
              </div>

              {/* Employee Selection */}
              {form.assignedEmployeeType && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Select {form.assignedEmployeeType}
                  </label>
                  <select
                    value={form.assignedEmployeeId}
                    disabled={saving}
                    onChange={(e) => setForm({ ...form, assignedEmployeeId: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Select employee...</option>
                    {(form.assignedEmployeeType === "Sales Closer"
                      ? salesClosers
                      : coldCallers
                    ).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.commissionRate}%)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Commission Preview */}
              {form.assignedEmployeeId && form.budget && (
                <div
                  className={`${
                    form.assignedEmployeeType === "Sales Closer"
                      ? "bg-indigo-50 border-indigo-100"
                      : "bg-amber-50 border-amber-100"
                  } border rounded-xl p-4 shadow-sm`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500 font-medium">Employee</p>
                    <p
                      className={`text-sm font-semibold ${
                        form.assignedEmployeeType === "Sales Closer"
                          ? "text-indigo-700"
                          : "text-amber-700"
                      }`}
                    >
                      {
                        (form.assignedEmployeeType === "Sales Closer"
                          ? salesClosers
                          : coldCallers
                        ).find((e) => e.id === form.assignedEmployeeId)?.name
                      }
                    </p>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500 font-medium">Commission Rate</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {
                        (form.assignedEmployeeType === "Sales Closer"
                          ? salesClosers
                          : coldCallers
                        ).find((e) => e.id === form.assignedEmployeeId)?.commissionRate
                      }
                      %
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <p className="text-sm font-semibold text-slate-800">Total Commission</p>
                    <p className="text-rose-600 font-bold text-lg">
                      $
                      {(
                        (parseFloat(form.budget) *
                          ((form.assignedEmployeeType === "Sales Closer"
                            ? salesClosers
                            : coldCallers
                          ).find((e) => e.id === form.assignedEmployeeId)?.commissionRate ||
                            0)) /
                        100
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Features</label>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="Add a feature..."
                value={newFeature}
                disabled={saving}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
              />
              <Button variant="secondary" size="sm" onClick={addFeature} disabled={saving}>Add</Button>
            </div>
            {form.features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.features.map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200/60 font-semibold shadow-sm">
                    {f}
                    <button onClick={() => removeFeature(i)} disabled={saving} className="text-slate-400 hover:text-rose-600 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editingProject ? "Save Changes" : "Create Project"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Project Details Modal */}
      <ProjectDetailsModal
        project={viewingProject}
        client={viewingClient || null}
        isOpen={!!viewingProject}
        onClose={() => setViewingProject(null)}
      />

      {/* Payment Update Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Update Payment"
      >
        {paymentProject && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <p className="text-slate-500 text-sm mb-2 font-medium">Project</p>
              <p className="text-slate-900 font-bold mb-4">{paymentProject.name}</p>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-slate-400 text-xs mb-1 font-semibold">Budget</p>
                  <p className="text-slate-800 font-bold text-sm">
                    ${paymentProject.budget.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1 font-semibold">Already Paid</p>
                  <p className="text-emerald-700 font-bold text-sm">
                    ${(paymentProject.totalPaid || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1 font-semibold">Remaining</p>
                  <p className="text-orange-700 font-bold text-sm">
                    ${(paymentProject.remainingPayment || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <Input
              label="Payment Amount ($)"
              type="number"
              placeholder="Enter amount received"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleUpdatePayment} className="flex-1">
                Record Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
