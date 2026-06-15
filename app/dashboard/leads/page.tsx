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
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lead, LeadStatus, FollowUpNote } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";

function getSubmitterName(email?: string) {
  if (!email) return "System";
  const prefix = email.split("@")[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}
import {
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";

const STAGES: LeadStatus[] = [
  "Initial Email",
  "Follow Up",
  "Meeting",
  "Closed",
  "Rejected",
];

const STAGE_COLORS: Record<LeadStatus, string> = {
  "Initial Email": "bg-blue-500",
  "Follow Up": "bg-violet-500",
  Meeting: "bg-amber-500",
  Closed: "bg-emerald-500",
  Rejected: "bg-rose-500",
};

const STAGE_PILL: Record<LeadStatus, string> = {
  "Initial Email": "bg-blue-50 text-blue-700 border-blue-200",
  "Follow Up": "bg-violet-50 text-violet-700 border-violet-200",
  Meeting: "bg-amber-50 text-amber-700 border-amber-200",
  Closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function LeadsPage() {
  const { appUser } = useAuth();
  const [selectedSubmitter, setSelectedSubmitter] = useState<string>("All");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeadStatus>("Initial Email");

  // Expanded follow-up rows
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newFollowUpNote, setNewFollowUpNote] = useState("");
  const [addingFollowUp, setAddingFollowUp] = useState(false);

  // Copy-to-clipboard feedback: "leadId:field"
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (value: string, key: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    status: "Initial Email" as LeadStatus,
    serviceType: "" as "AI Receptionist" | "App Development" | "",
    phoneNumber: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Close lead modal
  const [closeModal, setCloseModal] = useState(false);
  const [closingLead, setClosingLead] = useState<Lead | null>(null);
  const [closeForm, setCloseForm] = useState({ projectValue: "", upfrontPaid: "" });
  const [closeSaving, setCloseSaving] = useState(false);

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

  const openAdd = () => {
    setEditingLead(null);
    setForm({ name: "", email: "", company: "", status: "Initial Email", serviceType: "", phoneNumber: "" });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name,
      email: lead.email,
      company: lead.company,
      status: lead.status,
      serviceType: lead.serviceType || "",
      phoneNumber: lead.phoneNumber || "",
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    if (!form.company.trim()) e.company = "Company is required";
    if (!form.serviceType) e.serviceType = "Service type is required";
    if (form.serviceType === "AI Receptionist" && !form.phoneNumber.trim()) {
      e.phoneNumber = "Phone number is required for AI Receptionist";
    }
    return e;
  };

  const triggerClose = (lead: Lead) => {
    setIsModalOpen(false);
    setClosingLead(lead);
    setCloseForm({ projectValue: String(lead.projectValue || ""), upfrontPaid: String(lead.upfrontPaid || "") });
    setCloseModal(true);
    setSaving(false);
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      email: form.email,
      company: form.company,
      status: form.status,
      serviceType: form.serviceType ? form.serviceType : undefined,
      phoneNumber: form.serviceType === "AI Receptionist" ? form.phoneNumber : undefined,
      submittedBy: editingLead ? (editingLead.submittedBy || appUser?.email || "Unknown") : (appUser?.email || "Unknown"),
    };
    try {
      if (editingLead) {
        if (form.status === "Closed" && editingLead.status !== "Closed") {
          triggerClose({ ...editingLead, ...payload });
          return;
        }
        await updateDoc(doc(db, "leads", editingLead.id), { ...payload, updatedAt: serverTimestamp() });
      } else {
        if (form.status === "Closed") {
          const ref = await addDoc(collection(db, "leads"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          triggerClose({ id: ref.id, ...payload, createdAt: new Date(), updatedAt: new Date() });
          return;
        }
        await addDoc(collection(db, "leads"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDeal = async () => {
    if (!closingLead) return;
    const pv = parseFloat(closeForm.projectValue);
    const up = parseFloat(closeForm.upfrontPaid);
    if (!closeForm.projectValue || isNaN(pv)) return;
    setCloseSaving(true);
    try {
      await updateDoc(doc(db, "leads", closingLead.id), {
        status: "Closed", projectValue: pv, upfrontPaid: up || 0, updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, "clients", closingLead.id), {
        leadId: closingLead.id, name: closingLead.name, email: closingLead.email,
        company: closingLead.company, status: "Closed", projectValue: pv, upfrontPaid: up || 0,
        serviceType: closingLead.serviceType || "",
        phoneNumber: closingLead.phoneNumber || "",
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setCloseModal(false);
      setActiveTab("Closed");
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
      triggerClose(lead);
      return;
    }
    await updateDoc(doc(db, "leads", lead.id), { status: newStatus, updatedAt: serverTimestamp() });
  };

  const handleAddFollowUp = async (lead: Lead) => {
    if (!newFollowUpNote.trim()) return;
    setAddingFollowUp(true);
    const note: FollowUpNote = {
      id: generateId(),
      note: newFollowUpNote.trim(),
      date: new Date().toISOString().slice(0, 10),
    };
    try {
      await updateDoc(doc(db, "leads", lead.id), {
        followUps: arrayUnion(note),
        updatedAt: serverTimestamp(),
      });
      setNewFollowUpNote("");
    } finally {
      setAddingFollowUp(false);
    }
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.status === activeTab &&
      (selectedSubmitter === "All" || (l.submittedBy || "Unknown") === selectedSubmitter)
  );

  const allSubmitters = Array.from(
    new Set(leads.map((l) => l.submittedBy || "Unknown"))
  ).filter(Boolean);

  const counts = STAGES.reduce((acc, t) => {
    acc[t] = leads.filter(
      (l) =>
        l.status === t &&
        (selectedSubmitter === "All" || (l.submittedBy || "Unknown") === selectedSubmitter)
    ).length;
    return acc;
  }, {} as Record<LeadStatus, number>);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-slate-500 text-sm mt-1">Track your sales pipeline</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus size={16} />
          Add Lead
        </Button>
      </div>

      {/* Simple Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STAGES.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              activeTab === tab
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                activeTab === tab ? "bg-white/60" : STAGE_COLORS[tab]
              }`}
            />
            {tab}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Submitter Categories Filter */}
      {allSubmitters.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap bg-slate-50 border border-slate-200/60 p-2 rounded-2xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">By Submitter:</span>
          <button
            onClick={() => setSelectedSubmitter("All")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              selectedSubmitter === "All"
                ? "bg-white text-slate-800 border-slate-200 shadow-sm font-bold"
                : "text-slate-500 border-transparent hover:text-slate-800"
            }`}
          >
            All
          </button>
          {allSubmitters.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubmitter(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                selectedSubmitter === sub
                  ? "bg-white text-slate-800 border-slate-200 shadow-sm font-bold"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              {getSubmitterName(sub)}
            </button>
          ))}
        </div>
      )}

      {/* Leads List */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-10 text-center">
            <UserPlus size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No leads in <strong>{activeTab}</strong></p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLeads.map((lead) => {
              const followUps = lead.followUps || [];
              const isExpanded = expandedId === lead.id;
              const isFollowUpTab = activeTab === "Follow Up";

              return (
                <div key={lead.id}>
                  {/* Lead Row */}
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${STAGE_PILL[activeTab]}`}
                    >
                      {lead.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info — copyable chips */}
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                      {/* Name */}
                      <CopyChip
                        value={lead.name}
                        uid={`${lead.id}:name`}
                        copiedKey={copiedKey}
                        onCopy={copyToClipboard}
                        color="slate"
                      />
                      {/* Email */}
                      <CopyChip
                        value={lead.email}
                        uid={`${lead.id}:email`}
                        copiedKey={copiedKey}
                        onCopy={copyToClipboard}
                        color="blue"
                      />
                      {/* Company */}
                      <CopyChip
                        value={lead.company}
                        uid={`${lead.id}:company`}
                        copiedKey={copiedKey}
                        onCopy={copyToClipboard}
                        color="violet"
                      />
                      {/* Service Type */}
                      {lead.serviceType && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                          lead.serviceType === "AI Receptionist"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}>
                          {lead.serviceType}
                        </span>
                      )}
                      {/* Phone Number */}
                      {lead.serviceType === "AI Receptionist" && lead.phoneNumber && (
                        <CopyChip
                          value={lead.phoneNumber}
                          uid={`${lead.id}:phoneNumber`}
                          copiedKey={copiedKey}
                          onCopy={copyToClipboard}
                          color="slate"
                        />
                      )}
                      {/* Submitted By */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border bg-slate-100/30 text-slate-500 border-slate-200">
                        Added by: {getSubmitterName(lead.submittedBy)}
                      </span>
                    </div>

                    {/* Closed amounts */}
                    {activeTab === "Closed" && (
                      <div className="hidden sm:flex items-center gap-4 mr-2">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-semibold">PROJECT VALUE</p>
                          <p className="text-sm font-bold text-emerald-600">${Number(lead.projectValue || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-semibold">UPFRONT</p>
                          <p className="text-sm font-semibold text-slate-600">${Number(lead.upfrontPaid || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    )}

                    {/* Follow-up count badge (Follow Up tab) */}
                    {isFollowUpTab && (
                      <span className="text-xs px-2.5 py-1 rounded-full border bg-violet-50 text-violet-700 border-violet-200 font-semibold shrink-0">
                        {followUps.length === 0
                          ? "No follow-ups"
                          : `${followUps.length} follow-up${followUps.length !== 1 ? "s" : ""}`}
                      </span>
                    )}

                    {/* Stage dropdown */}
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead, e.target.value as LeadStatus)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shrink-0"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isFollowUpTab && (
                        <button
                          onClick={() => {
                            setExpandedId(isExpanded ? null : lead.id);
                            setNewFollowUpNote("");
                          }}
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors"
                          title="Follow-ups"
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(lead)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Follow-up panel (expandable, Follow Up tab only) */}
                  {isFollowUpTab && isExpanded && (
                    <div className="bg-slate-50/70 border-t border-slate-100 px-5 py-4">
                      {/* Existing follow-ups */}
                      {followUps.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {followUps.map((fu, idx) => (
                            <div key={fu.id} className="flex items-start gap-3">
                              {/* Number badge */}
                              <div className="w-6 h-6 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center text-[11px] font-bold text-violet-700 shrink-0 mt-0.5">
                                {idx + 1}
                              </div>
                              <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
                                <p className="text-sm text-slate-800">{fu.note}</p>
                                <p className="text-[11px] text-slate-400 mt-1">{fu.date}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add follow-up input */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-violet-50 border border-violet-200 border-dashed flex items-center justify-center text-[11px] font-bold text-violet-400 shrink-0">
                          {followUps.length + 1}
                        </div>
                        <input
                          type="text"
                          value={newFollowUpNote}
                          onChange={(e) => setNewFollowUpNote(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddFollowUp(lead); }}
                          placeholder={`Follow Up ${followUps.length + 1} — add a note...`}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                          disabled={addingFollowUp}
                        />
                        <button
                          onClick={() => handleAddFollowUp(lead)}
                          disabled={addingFollowUp || !newFollowUpNote.trim()}
                          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors shrink-0"
                        >
                          {addingFollowUp ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <MessageSquarePlus size={15} />
                          )}
                          Add
                        </button>
                      </div>

                      {followUps.length === 0 && (
                        <p className="text-xs text-slate-400 mt-3 ml-8">
                          No follow-ups yet. Add your first one above.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLead ? "Edit Lead" : "Add Lead"}>
        <div className="space-y-4">
          <Input label="Name" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} disabled={saving} />
          <Input label="Email" type="email" placeholder="john@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} disabled={saving} />
          <Input label="Company" placeholder="Acme Corp" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} error={errors.company} disabled={saving} />
          <Select label="Stage" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })} options={STAGES.map((t) => ({ value: t, label: t }))} disabled={saving} />
          
          <Select
            label="Service Type"
            value={form.serviceType}
            onChange={(e) => setForm({ ...form, serviceType: e.target.value as "AI Receptionist" | "App Development" | "" })}
            options={[
              { value: "", label: "Select Service" },
              { value: "AI Receptionist", label: "AI Receptionist" },
              { value: "App Development", label: "App Development" },
            ]}
            error={errors.serviceType}
            disabled={saving}
          />

          {form.serviceType === "AI Receptionist" && (
            <Input
              label="Phone Number"
              placeholder="+1 (555) 019-2834"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              error={errors.phoneNumber}
              disabled={saving}
            />
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1" disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editingLead ? "Save" : "Add Lead"}</Button>
          </div>
        </div>
      </Modal>

      {/* Close Deal Modal */}
      <Modal isOpen={closeModal} onClose={() => setCloseModal(false)} title="Close Deal">
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-slate-900 font-bold text-sm">{closingLead?.name}</p>
              <p className="text-slate-500 text-xs">{closingLead?.company} · Auto-added to Clients on save</p>
            </div>
          </div>
          <Input label="Project Value ($)" type="number" placeholder="5000" value={closeForm.projectValue} onChange={(e) => setCloseForm({ ...closeForm, projectValue: e.target.value })} disabled={closeSaving} />
          <Input label="Upfront Paid ($)" type="number" placeholder="1000" value={closeForm.upfrontPaid} onChange={(e) => setCloseForm({ ...closeForm, upfrontPaid: e.target.value })} disabled={closeSaving} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCloseModal(false)} className="flex-1" disabled={closeSaving}>Cancel</Button>
            <Button onClick={handleCloseDeal} loading={closeSaving} className="flex-1">Close Deal & Add Client</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── CopyChip ────────────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, { pill: string; icon: string; copied: string }> = {
  slate: {
    pill: "bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    icon: "text-slate-400 hover:text-slate-600",
    copied: "text-emerald-600",
  },
  blue: {
    pill: "bg-blue-50 border-blue-100 text-blue-700 hover:border-blue-200 hover:bg-blue-50",
    icon: "text-blue-300 hover:text-blue-500",
    copied: "text-emerald-600",
  },
  violet: {
    pill: "bg-violet-50 border-violet-100 text-violet-700 hover:border-violet-200 hover:bg-violet-50",
    icon: "text-violet-300 hover:text-violet-500",
    copied: "text-emerald-600",
  },
};

function CopyChip({
  value,
  uid,
  copiedKey,
  onCopy,
  color,
}: {
  value: string;
  uid: string;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => void;
  color: "slate" | "blue" | "violet";
}) {
  const isCopied = copiedKey === uid;
  const c = COLOR_MAP[color];

  return (
    <button
      type="button"
      onClick={() => onCopy(value, uid)}
      title={`Copy ${value}`}
      className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all duration-150 ${c.pill}`}
    >
      <span className="max-w-[160px] truncate">{value}</span>
      {isCopied ? (
        <Check size={11} className={c.copied} strokeWidth={2.5} />
      ) : (
        <Copy size={11} className={`${c.icon} transition-colors`} />
      )}
    </button>
  );
}
