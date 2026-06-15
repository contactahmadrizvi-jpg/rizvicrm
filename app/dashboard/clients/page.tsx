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
import { Client, LeadStatus } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { ClientDetailsModal } from "@/components/ClientDetailsModal";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Pencil, Trash2, UserCheck, Plus, Eye, Calendar } from "lucide-react";

const TABS: LeadStatus[] = ["Meeting", "Closed", "Rejected"];

const emptyForm = {
  name: "",
  email: "",
  company: "",
  status: "Closed" as LeadStatus,
  projectValue: "",
  upfrontPaid: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeadStatus>("Closed");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "clients"), (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ...raw,
          createdAt: raw.createdAt?.toDate?.() ?? new Date(),
          updatedAt: raw.updatedAt?.toDate?.() ?? new Date(),
        } as Client;
      });
      setClients(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const openAdd = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email,
      company: client.company,
      status: client.status,
      projectValue: String(client.projectValue || ""),
      upfrontPaid: String(client.upfrontPaid || ""),
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
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        company: form.company,
        status: form.status,
        projectValue: parseFloat(form.projectValue) || 0,
        upfrontPaid: parseFloat(form.upfrontPaid) || 0,
        updatedAt: serverTimestamp(),
      };

      if (editingClient) {
        await updateDoc(doc(db, "clients", editingClient.id), payload);
        // Sync to lead if it exists
        await updateDoc(doc(db, "leads", editingClient.id), payload).catch(() => {});
      } else {
        // Add as a brand-new client (not linked to a lead)
        await addDoc(collection(db, "clients"), {
          ...payload,
          leadId: "",
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this client?")) return;
    await deleteDoc(doc(db, "clients", id));
  };

  const filtered = clients.filter((c) => {
    if (c.status !== activeTab) return false;
    if (!dateRange.start || !dateRange.end) return true;
    const clientDate = new Date(c.createdAt);
    return clientDate >= dateRange.start && clientDate <= dateRange.end;
  });

  const counts = TABS.reduce((acc, t) => {
    acc[t] = clients.filter((c) => c.status === t).length;
    return acc;
  }, {} as Record<LeadStatus, number>);

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage clients — auto-added when leads close, or add manually
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
            Add Client
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      {showDateFilter && (
        <div className="mb-6">
          <DateRangePicker onDateChange={handleDateChange} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/10"
                : "bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            {tab}
            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
              activeTab === tab 
                ? "bg-white/20 text-white border-transparent" 
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-12 text-center shadow-sm">
          <UserCheck size={36} className="text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-4">
            {dateRange.start && dateRange.end
              ? `No clients in ${activeTab} status for selected date range`
              : `No clients in ${activeTab} status`}
          </p>
          <Button size="sm" onClick={openAdd}>
            <Plus size={14} className="mr-1" />
            Add Client
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <Card key={client.id} className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-semibold text-sm truncate">{client.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{client.company}</p>
                </div>
                <Badge
                  variant={
                    client.status === "Closed"
                      ? "closed"
                      : client.status === "Meeting"
                      ? "meeting"
                      : "rejected"
                  }
                >
                  {client.status}
                </Badge>
              </div>
              <p className="text-slate-400 text-xs mb-3 truncate">{client.email}</p>
              {client.status === "Closed" && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">Project Value</p>
                    <p className="text-emerald-700 font-bold text-sm">
                      ${Number(client.projectValue || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">Upfront Paid</p>
                    <p className="text-indigo-700 font-bold text-sm">
                      ${Number(client.upfrontPaid || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewingClient(client)}
                  className="flex-1 gap-1"
                >
                  <Eye size={12} />
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEdit(client)}
                  className="flex-1 gap-1"
                >
                  <Pencil size={12} />
                  Edit
                </Button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors border border-slate-200/60"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? "Edit Client" : "Add New Client"}
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            disabled={saving}
          />
          <Input
            label="Email"
            type="email"
            placeholder="john@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
            disabled={saving}
          />
          <Input
            label="Company"
            placeholder="Acme Corp"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            error={errors.company}
            disabled={saving}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
            options={TABS.map((t) => ({ value: t, label: t }))}
            disabled={saving}
          />
          {form.status === "Closed" && (
            <>
              <Input
                label="Project Value ($)"
                type="number"
                placeholder="5000"
                value={form.projectValue}
                onChange={(e) => setForm({ ...form, projectValue: e.target.value })}
                disabled={saving}
              />
              <Input
                label="Upfront Paid ($)"
                type="number"
                placeholder="1000"
                value={form.upfrontPaid}
                onChange={(e) => setForm({ ...form, upfrontPaid: e.target.value })}
                disabled={saving}
              />
            </>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editingClient ? "Save Changes" : "Add Client"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Client Details Modal */}
      <ClientDetailsModal
        client={viewingClient}
        isOpen={!!viewingClient}
        onClose={() => setViewingClient(null)}
      />
    </div>
  );
}
