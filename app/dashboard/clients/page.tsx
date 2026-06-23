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
          <h1 className="text-2xl font-semibold text-[#111110] tracking-tight">Clients</h1>
          <p className="text-sm text-[#858580] mt-1">Manage clients — auto-added when leads close, or add manually</p>
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
      <div className="flex gap-1.5 mb-6 p-1 bg-white border border-[#e8e8e4] rounded-lg w-fit">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="relative px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-100"
            style={{
              background: activeTab === tab ? "#111110" : "transparent",
              color: activeTab === tab ? "#ffffff" : "#858580",
            }}>
            {tab}
            <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: activeTab === tab ? "rgba(255,255,255,0.15)" : "#f4f4f2",
                color: activeTab === tab ? "#ffffff" : "#858580",
              }}>
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
        <div className="bg-white border border-[#e8e8e4] rounded-xl p-14 text-center shadow-card">
          <UserCheck size={32} className="mx-auto mb-3" style={{ color: "#d0d0cc" }} />
          <p className="text-sm font-medium text-[#4a4a48] mb-1">No clients in {activeTab}</p>
          <p className="text-xs text-[#b0b0aa] mb-5">
            {dateRange.start && dateRange.end ? "Try adjusting the date filter." : "Add a client manually or close a lead."}
          </p>
          <Button size="sm" onClick={openAdd} className="gap-1.5"><Plus size={13} />Add Client</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div key={client.id}
              className="bg-white border border-[#e8e8e4] rounded-xl shadow-card hover:shadow-lift transition-shadow duration-200 p-5 flex flex-col gap-0">

              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm"
                    style={{ background: "#f4f4f2", border: "1px solid #e8e8e4", color: "#858580" }}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#111110] truncate leading-tight">{client.name}</p>
                    <p className="text-xs text-[#858580] truncate mt-0.5">{client.company}</p>
                  </div>
                </div>
                <Badge
                  variant={client.status === "Closed" ? "closed" : client.status === "Meeting" ? "meeting" : "rejected"}>
                  {client.status}
                </Badge>
              </div>

              {/* Email */}
              <p className="text-xs text-[#b0b0aa] mb-3 truncate">{client.email}</p>

              {/* Financials */}
              {client.status === "Closed" && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-lg p-3" style={{ background: "#f4f4f2", border: "1px solid #e8e8e4" }}>
                    <p className="label-caps mb-1">Value</p>
                    <p className="text-sm font-bold text-[#1a7f5a]">
                      ${Number(client.projectValue || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: "#f4f4f2", border: "1px solid #e8e8e4" }}>
                    <p className="label-caps mb-1">Upfront</p>
                    <p className="text-sm font-bold text-[#1a1a2e]">
                      ${Number(client.upfrontPaid || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-1">
                <Button variant="secondary" size="sm" onClick={() => setViewingClient(client)} className="flex-1 gap-1.5">
                  <Eye size={12} />View
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openEdit(client)} className="flex-1 gap-1.5">
                  <Pencil size={12} />Edit
                </Button>
                <button onClick={() => handleDelete(client.id)}
                  className="p-2 rounded-lg transition-colors text-[#b0b0aa] hover:text-[#c0392b] hover:bg-[#fdf1f0]"
                  style={{ border: "1px solid #e8e8e4" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
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
