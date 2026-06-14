"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
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
import { Pencil, Trash2, UserCheck } from "lucide-react";

const TABS: LeadStatus[] = ["Meeting", "Closed", "Rejected"];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeadStatus>("Closed");

  const [editModal, setEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    status: "Closed" as LeadStatus,
    projectValue: "",
    upfrontPaid: "",
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
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!editingClient) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "clients", editingClient.id), {
        name: form.name,
        email: form.email,
        company: form.company,
        status: form.status,
        projectValue: parseFloat(form.projectValue) || 0,
        upfrontPaid: parseFloat(form.upfrontPaid) || 0,
        updatedAt: serverTimestamp(),
      });
      // Also update lead
      await updateDoc(doc(db, "leads", editingClient.id), {
        name: form.name,
        email: form.email,
        company: form.company,
        status: form.status,
        projectValue: parseFloat(form.projectValue) || 0,
        upfrontPaid: parseFloat(form.upfrontPaid) || 0,
        updatedAt: serverTimestamp(),
      }).catch(() => {}); // Lead may not exist
      setEditModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this client?")) return;
    await deleteDoc(doc(db, "clients", id));
  };

  const filtered = clients.filter((c) => c.status === activeTab);
  const counts = TABS.reduce((acc, t) => {
    acc[t] = clients.filter((c) => c.status === t).length;
    return acc;
  }, {} as Record<LeadStatus, number>);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clients</h1>
        <p className="text-slate-400 text-sm mt-1">
          Clients are automatically added when leads are closed
        </p>
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

      {/* Clients Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111827] border border-white/10 rounded-2xl p-12 text-center">
          <UserCheck size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No clients in {activeTab} status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <Card key={client.id} className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{client.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">{client.company}</p>
                </div>
                <Badge variant={client.status === "Closed" ? "closed" : client.status === "Meeting" ? "meeting" : "rejected"}>
                  {client.status}
                </Badge>
              </div>
              <p className="text-slate-500 text-xs mb-3 truncate">{client.email}</p>
              {client.status === "Closed" && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-500/10 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">Project Value</p>
                    <p className="text-green-400 font-semibold text-sm">
                      ${(client.projectValue || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-indigo-500/10 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">Upfront Paid</p>
                    <p className="text-indigo-400 font-semibold text-sm">
                      ${(client.upfrontPaid || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-2">
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
                  className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors border border-white/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Client"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
            options={TABS.map((t) => ({ value: t, label: t }))}
          />
          <Input
            label="Project Value ($)"
            type="number"
            value={form.projectValue}
            onChange={(e) => setForm({ ...form, projectValue: e.target.value })}
          />
          <Input
            label="Upfront Paid ($)"
            type="number"
            value={form.upfrontPaid}
            onChange={(e) => setForm({ ...form, upfrontPaid: e.target.value })}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
