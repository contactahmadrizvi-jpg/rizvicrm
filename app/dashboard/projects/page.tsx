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
import { Project, Client, ProjectType } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Plus, Pencil, Trash2, FolderKanban, X } from "lucide-react";

const PROJECT_TYPES: ProjectType[] = ["App Development", "AI Receptionist", "Other"];

interface ProjectForm {
  name: string;
  description: string;
  clientId: string;
  projectType: ProjectType;
  features: string[];
  budget: string;
  upfrontPaid: string;
}

const emptyForm: ProjectForm = {
  name: "",
  description: "",
  clientId: "",
  projectType: "App Development",
  features: [],
  budget: "",
  upfrontPaid: "",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [closedClients, setClosedClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [newFeature, setNewFeature] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let pl = false, cl = false;
    const check = () => { if (pl && cl) setLoading(false); };

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

    return () => { unsubP(); unsubC(); };
  }, []);

  const openAdd = () => {
    setEditingProject(null);
    setForm(emptyForm);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      name: project.name,
      description: project.description,
      clientId: project.clientId,
      projectType: project.projectType,
      features: project.features || [],
      budget: String(project.budget || ""),
      upfrontPaid: String(project.upfrontPaid || ""),
    });
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
    try {
      const payload = {
        name: form.name,
        description: form.description,
        clientId: form.clientId,
        clientName: client?.name || "",
        projectType: form.projectType,
        features: form.features,
        budget: parseFloat(form.budget) || 0,
        upfrontPaid: parseFloat(form.upfrontPaid) || 0,
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await deleteDoc(doc(db, "projects", id));
  };

  const typeColors: Record<ProjectType, string> = {
    "App Development": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "AI Receptionist": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Other": "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 text-sm mt-1">Manage client projects and budgets</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus size={16} />
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-[#111827] border border-white/10 rounded-2xl p-12 text-center">
          <FolderKanban size={40} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-sm mb-4">No projects yet</p>
          <Button onClick={openAdd} size="sm">Create First Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{project.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">{project.clientName}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[project.projectType]}`}>
                  {project.projectType}
                </span>
              </div>

              {project.description && (
                <p className="text-slate-500 text-xs mb-3 line-clamp-2">{project.description}</p>
              )}

              {project.features && project.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.features.slice(0, 3).map((f, i) => (
                    <span key={i} className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded-full border border-white/10">
                      {f}
                    </span>
                  ))}
                  {project.features.length > 3 && (
                    <span className="text-xs text-slate-500">+{project.features.length - 3} more</span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-green-500/10 rounded-xl p-2.5">
                  <p className="text-xs text-slate-400 mb-0.5">Budget</p>
                  <p className="text-green-400 font-semibold text-sm">${project.budget.toLocaleString()}</p>
                </div>
                <div className="bg-indigo-500/10 rounded-xl p-2.5">
                  <p className="text-xs text-slate-400 mb-0.5">Upfront</p>
                  <p className="text-indigo-400 font-semibold text-sm">${project.upfrontPaid.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(project)} className="flex-1 gap-1">
                  <Pencil size={12} />
                  Edit
                </Button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors border border-white/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
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
          />
          <Textarea
            label="Description"
            placeholder="What does this project do?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1">
              Client (Closed Only)
            </label>
            <select
              value={form.clientId}
              onChange={(e) => handleClientSelect(e.target.value)}
              className={`w-full bg-[#0F172A] border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all ${errors.clientId ? "border-red-500/50" : "border-white/10"}`}
            >
              <option value="" className="bg-[#111827]">Select a client...</option>
              {closedClients.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#111827]">
                  {c.name} — {c.company}
                </option>
              ))}
            </select>
            {errors.clientId && <p className="text-xs text-red-400 mt-1">{errors.clientId}</p>}
            {closedClients.length === 0 && (
              <p className="text-xs text-yellow-400 mt-1">No closed clients yet. Close a lead first.</p>
            )}
          </div>

          <Select
            label="Project Type"
            value={form.projectType}
            onChange={(e) => setForm({ ...form, projectType: e.target.value as ProjectType })}
            options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Budget ($)"
              type="number"
              placeholder="Auto-filled from client"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              error={errors.budget}
            />
            <Input
              label="Upfront Paid ($)"
              type="number"
              placeholder="Auto-filled from client"
              value={form.upfrontPaid}
              onChange={(e) => setForm({ ...form, upfrontPaid: e.target.value })}
            />
          </div>

          {/* Features */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Features</label>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="Add a feature..."
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
              />
              <Button variant="secondary" size="sm" onClick={addFeature}>Add</Button>
            </div>
            {form.features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.features.map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs bg-white/5 text-slate-300 px-3 py-1.5 rounded-full border border-white/10">
                    {f}
                    <button onClick={() => removeFeature(i)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editingProject ? "Save Changes" : "Create Project"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
