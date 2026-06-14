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
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lead, LeadStatus } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { Plus, Pencil, Trash2, UserPlus } from "lucide-react";

const TABS: LeadStatus[] = ["Meeting", "Closed", "Rejected"];

const statusBadge = (s: LeadStatus) => {
  if (s === "Meeting") return "meeting";
  if (s === "Closed") return "closed";
  return "rejected";
};

interface CloseLeadFormData {
  projectValue: string;
  upfrontPaid: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeadStatus>("Meeting");

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);

  // Close lead modal (ask for project value)
  const [closeModal, setCloseModal] = useState(false);
  const [closingLead, setClosingLead] = useState<Lead | null>(null);
  const [closeForm, setCloseForm] = useState<CloseLeadFormData>({ projectValue: "", upfrontPaid: "" });
  const [closeSaving, setCloseSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({ name: "", email: "", company: "", status: "Meeting" as LeadStatus });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "leads"), (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ...raw,
          createdAt: raw.createdAt?.toDate?.() ?? new Date(),
          updatedAt: raw.updatedAt?.toDate?.() ?? new Date(),
        } as Lead;
      });
      setLeads(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const openAddModal = () => {
    setEditingLead(null);
    setForm({ name: "", email: "", company: "", status: "Meeting" });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setForm({ name: lead.name, email: lead.email, company: lead.company, status: lead.status });
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    if (!form.company.trim()) e.company = "Company is required";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      if (editingLead) {
        // If status changed to Closed, trigger close modal
        if (form.status === "Closed" && editingLead.status !== "Closed") {
          setIsModalOpen(false);
          setClosingLead({ ...editingLead, ...form });
          setCloseForm({ projectValue: "", upfrontPaid: "" });
          setCloseModal(true);
          setSaving(false);
          return;
        }
        await updateDoc(doc(db, "leads", editingLead.id), {
          ...form,
          updatedAt: serverTimestamp(),
        });
      } else {
        const newLead = {
          ...form,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        // If new lead is Closed right away, ask for value
        if (form.status === "Closed") {
          const docRef = await addDoc(collection(db, "leads"), newLead);
          setIsModalOpen(false);
          setClosingLead({ id: docRef.id, ...form, createdAt: new Date(), updatedAt: new Date() });
          setCloseForm({ projectValue: "", upfrontPaid: "" });
          setCloseModal(true);
          setSaving(false);
          return;
        }
        await addDoc(collection(db, "leads"), newLead);
      }
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseLead = async () => {
    if (!closingLead) return;
    const pv = parseFloat(closeForm.projectValue);
    const up = parseFloat(closeForm.upfrontPaid);
    if (!closeForm.projectValue || isNaN(pv)) return;
    setCloseSaving(true);
    try {
      // Update lead
      await updateDoc(doc(db, "leads", closingLead.id), {
        status: "Closed",
        projectValue: pv,
        upfrontPaid: up || 0,
        updatedAt: serverTimestamp(),
      });
      // Upsert client
      await setDoc(doc(db, "clients", closingLead.id), {
        leadId: closingLead.id,
        name: closingLead.name,
        email: closingLead.email,
        company: closingLead.company,
        status: "Closed",
        projectValue: pv,
        upfrontPaid: up || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCloseModal(false);
    } finally {
      setCloseSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    await deleteDoc(doc(db, "leads", id));
  };

  const handleStatusChange = async (lead: Lead, newStatus: LeadStatus) => {
    if (newStatus === "Closed" && lead.status !== "Closed") {
      setClosingLead(lead);
      setCloseForm({ projectValue: String(lead.projectValue || ""), upfrontPaid: String(lead.upfrontPaid || "") });
      setCloseModal(true);
      return;
    }
    await updateDoc(doc(db, "leads", lead.id), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  };

  const filteredLeads = leads.filter((l) => l.status === activeTab);
  const counts = TABS.reduce((acc, t) => {
    acc[t] = leads.filter((l) => l.status === t).length;
    return acc;
  }, {} as Record<LeadStatus, number>);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and track your sales pipeline</p>
        </div>
        <Button onClick={openAddModal} className="gap-2">
          <Plus size={16} />
          Add Lead
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab
                ? "bg-indigo-600 text-white"
                : "bg-[#111827] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            {tab}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab ? "bg-white/20" : "bg-white/10"
            }`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Leads Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus size={36} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No leads in {activeTab} status</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  {activeTab === "Closed" && (
                    <>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Project Value</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Upfront Paid</th>
                    </>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">{lead.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{lead.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{lead.company}</td>
                    <td className="px-6 py-4">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead, e.target.value as LeadStatus)}
                        className="bg-transparent border-none text-sm focus:outline-none cursor-pointer"
                      >
                        {TABS.map((s) => (
                          <option key={s} value={s} className="bg-[#111827]">{s}</option>
                        ))}
                      </select>
                    </td>
                    {activeTab === "Closed" && (
                      <>
                        <td className="px-6 py-4 text-sm text-green-400 font-medium text-right">
                          ${(lead.projectValue || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400 text-right">
                          ${(lead.upfrontPaid || 0).toLocaleString()}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(lead)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLead ? "Edit Lead" : "Add New Lead"}
      >
        <div className="space-y-4">
          <Input
            label="Lead Name"
            placeholder="John Doe"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <Input
            label="Email"
            type="email"
            placeholder="john@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <Input
            label="Company"
            placeholder="Acme Corp"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            error={errors.company}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
            options={TABS.map((t) => ({ value: t, label: t }))}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editingLead ? "Save Changes" : "Add Lead"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close Lead Modal */}
      <Modal
        isOpen={closeModal}
        onClose={() => setCloseModal(false)}
        title="Close Lead — Add Deal Info"
      >
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">
            Enter the project details for <span className="text-white font-medium">{closingLead?.name}</span>
          </p>
          <Input
            label="Project Value ($)"
            type="number"
            placeholder="5000"
            value={closeForm.projectValue}
            onChange={(e) => setCloseForm({ ...closeForm, projectValue: e.target.value })}
          />
          <Input
            label="Upfront Paid ($)"
            type="number"
            placeholder="1000"
            value={closeForm.upfrontPaid}
            onChange={(e) => setCloseForm({ ...closeForm, upfrontPaid: e.target.value })}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCloseModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCloseLead} loading={closeSaving} className="flex-1" color="green">
              Close Deal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
