"use client";

import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  Plus, Copy, Check, Pencil, Trash2, Mail, MailOpen, ChevronRight,
} from "lucide-react";

type EmailType = "initial" | "followup";

interface EmailTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
  type: EmailType;
  order: number;
  createdAt: Date;
}

interface CopiedState { [id: string]: boolean }

const TYPE_LABELS: Record<EmailType, string> = {
  initial:  "Initial Outreach",
  followup: "Follow-up",
};

const TYPE_COLORS: Record<EmailType, { dot: string; badge: string; icon: string }> = {
  initial:  { dot: "bg-[#c9a84c]", badge: "bg-[#fef9ec] text-[#b45309] border-[#fde68a]", icon: "text-[#c9a84c]" },
  followup: { dot: "bg-[#1d4ed8]", badge: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",  icon: "text-[#1d4ed8]" },
};

export default function EmailCopyPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<CopiedState>({});
  const [form, setForm] = useState({ label: "", subject: "", body: "", type: "initial" as EmailType });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeType, setActiveType] = useState<EmailType | "all">("all");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "emailTemplates"), (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data();
        return { id: d.id, label: raw.label ?? "", subject: raw.subject ?? "", body: raw.body ?? "",
          type: raw.type ?? "initial", order: raw.order ?? 0,
          createdAt: raw.createdAt?.toDate?.() ?? new Date() } as EmailTemplate;
      });
      data.sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
      setTemplates(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const openAdd = (type?: EmailType) => {
    setEditing(null);
    setForm({ label: "", subject: "", body: "", type: type ?? "initial" });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setForm({ label: t.label, subject: t.subject, body: t.body, type: t.type });
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.label.trim()) e.label = "Name is required";
    if (!form.subject.trim()) e.subject = "Subject line is required";
    if (!form.body.trim()) e.body = "Email body is required";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = { label: form.label.trim(), subject: form.subject.trim(),
        body: form.body.trim(), type: form.type, updatedAt: serverTimestamp() };
      if (editing) {
        await updateDoc(doc(db, "emailTemplates", editing.id), payload);
      } else {
        const sameType = templates.filter((t) => t.type === form.type);
        await addDoc(collection(db, "emailTemplates"), {
          ...payload, order: sameType.length, createdAt: serverTimestamp() });
      }
      setIsModalOpen(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this email template?")) return;
    await deleteDoc(doc(db, "emailTemplates", id));
  };

  const handleCopy = (t: EmailTemplate) => {
    const text = `Subject: ${t.subject}\n\n${t.body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied((prev) => ({ ...prev, [t.id]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [t.id]: false })), 2000);
    });
  };

  const filtered = activeType === "all" ? templates : templates.filter((t) => t.type === activeType);
  const initials = templates.filter((t) => t.type === "initial");
  const followups = templates.filter((t) => t.type === "followup");

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#111110] tracking-tight mb-1">Email Copy</h1>
          <p className="text-sm text-[#858580]">
            {templates.length} template{templates.length !== 1 ? "s" : ""} ·{" "}
            {initials.length} initial · {followups.length} follow-up
          </p>
        </div>
        <Button onClick={() => openAdd()} className="gap-2">
          <Plus size={14} />
          New Template
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-white border border-[#e8e8e4] rounded-lg w-fit">
        {(["all", "initial", "followup"] as const).map((t) => (
          <button key={t} onClick={() => setActiveType(t)}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-100 ${
              activeType === t
                ? "bg-[#111110] text-white shadow-sm"
                : "text-[#858580] hover:text-[#111110]"
            }`}>
            {t === "all" ? "All" : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-[#f4f4f2] border border-[#e8e8e4] rounded-xl flex items-center justify-center mb-4">
            <Mail size={20} className="text-[#b0b0aa]" />
          </div>
          <p className="text-[#4a4a48] font-medium mb-1">No templates yet</p>
          <p className="text-sm text-[#b0b0aa] mb-5">Add your first email template to get started.</p>
          <Button onClick={() => openAdd()} variant="secondary" className="gap-2">
            <Plus size={14} />
            Add Template
          </Button>
        </div>
      ) : (
        <>
          {/* Sequence view — grouped by type with flow arrows */}
          {activeType === "all" && (initials.length > 0 || followups.length > 0) ? (
            <div className="space-y-8">
              {/* Initial emails */}
              {initials.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="rule-accent" />
                    <h2 className="text-sm font-semibold text-[#111110] tracking-tight">Initial Outreach</h2>
                    <span className="text-xs text-[#b0b0aa] font-medium ml-1">({initials.length})</span>
                    <button onClick={() => openAdd("initial")}
                      className="ml-auto flex items-center gap-1.5 text-xs text-[#858580] hover:text-[#111110] font-medium transition-colors">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <EmailSequence templates={initials} onEdit={openEdit} onDelete={handleDelete}
                    onCopy={handleCopy} copied={copied} />
                </section>
              )}

              {/* Follow-ups */}
              {followups.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="rule-accent" style={{ background: "#1d4ed8" }} />
                    <h2 className="text-sm font-semibold text-[#111110] tracking-tight">Follow-up Sequence</h2>
                    <span className="text-xs text-[#b0b0aa] font-medium ml-1">({followups.length})</span>
                    <button onClick={() => openAdd("followup")}
                      className="ml-auto flex items-center gap-1.5 text-xs text-[#858580] hover:text-[#111110] font-medium transition-colors">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <EmailSequence templates={followups} onEdit={openEdit} onDelete={handleDelete}
                    onCopy={handleCopy} copied={copied} showArrows />
                </section>
              )}
            </div>
          ) : (
            /* Filtered view */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((t) => (
                <EmailCard key={t.id} template={t} onEdit={openEdit} onDelete={handleDelete}
                  onCopy={handleCopy} copied={!!copied[t.id]} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editing ? "Edit Template" : "New Email Template"} size="lg">
        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <p className="text-xs font-semibold text-[#4a4a48] tracking-wide uppercase mb-2">Type</p>
            <div className="grid grid-cols-2 gap-2">
              {(["initial", "followup"] as EmailType[]).map((t) => (
                <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    form.type === t
                      ? "bg-[#111110] text-white border-[#111110]"
                      : "bg-white text-[#4a4a48] border-[#e8e8e4] hover:border-[#d0d0cc]"
                  }`}>
                  {t === "initial" ? <Mail size={14} /> : <MailOpen size={14} />}
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <Input label="Template Name" placeholder="e.g. Cold Outreach — App Dev"
            value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
            error={errors.label} disabled={saving} />

          <Input label="Subject Line" placeholder="e.g. Quick question about your business"
            value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
            error={errors.subject} disabled={saving} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#4a4a48] tracking-wide uppercase">Email Body</label>
            <textarea
              rows={10}
              placeholder={"Hi [Name],\n\nI came across your business and wanted to reach out...\n\nBest,\n[Your Name]"}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              disabled={saving}
              className={`w-full bg-white border rounded-lg px-3 py-2.5 text-[#111110] placeholder-[#b0b0aa] text-sm font-mono
                focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-all resize-none
                disabled:bg-[#f4f4f2] ${errors.body ? "border-[#c0392b]" : "border-[#e8e8e4]"}`}
            />
            {errors.body && <p className="text-xs text-[#c0392b] font-medium">{errors.body}</p>}
            <p className="text-xs text-[#b0b0aa]">Use [Name], [Company], [Your Name] as placeholders.</p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1" disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? "Save Changes" : "Save Template"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Email sequence with flow arrows ─────────────────────────────────── */
function EmailSequence({
  templates, onEdit, onDelete, onCopy, copied, showArrows = false,
}: {
  templates: EmailTemplate[];
  onEdit: (t: EmailTemplate) => void;
  onDelete: (id: string) => void;
  onCopy: (t: EmailTemplate) => void;
  copied: CopiedState;
  showArrows?: boolean;
}) {
  return (
    <div className="space-y-2">
      {templates.map((t, i) => (
        <div key={t.id}>
          {showArrows && i > 0 && (
            <div className="flex items-center gap-2 py-1 pl-5">
              <ChevronRight size={12} className="text-[#d0d0cc]" />
              <span className="text-[10px] text-[#d0d0cc] font-medium uppercase tracking-widest">
                Follow-up {i}
              </span>
            </div>
          )}
          <EmailCard template={t} onEdit={onEdit} onDelete={onDelete}
            onCopy={onCopy} copied={!!copied[t.id]} index={showArrows ? i + 1 : undefined} />
        </div>
      ))}
    </div>
  );
}

/* ─── Individual email card ────────────────────────────────────────────── */
function EmailCard({
  template, onEdit, onDelete, onCopy, copied, index,
}: {
  template: EmailTemplate;
  onEdit: (t: EmailTemplate) => void;
  onDelete: (id: string) => void;
  onCopy: (t: EmailTemplate) => void;
  copied: boolean;
  index?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = TYPE_COLORS[template.type];

  return (
    <div className="bg-white border border-[#e8e8e4] rounded-xl shadow-card hover:shadow-lift transition-shadow duration-200">
      {/* Card header */}
      <div className="flex items-start gap-4 px-5 pt-5 pb-4">
        {/* Step number or type dot */}
        {index !== undefined ? (
          <div className="w-7 h-7 rounded-full border border-[#e8e8e4] bg-[#f4f4f2] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-semibold text-[#858580]">{index}</span>
          </div>
        ) : (
          <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${colors.dot}`} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold ${colors.badge}`}>
              {TYPE_LABELS[template.type]}
            </span>
            {template.label && (
              <span className="text-xs text-[#858580] font-medium">{template.label}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-[#111110] tracking-tight leading-snug">
            {template.subject}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onCopy(template)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all duration-150 ${
              copied
                ? "bg-[#edf7f3] border-[#a7f3d0] text-[#1a7f5a]"
                : "bg-white border-[#e8e8e4] text-[#4a4a48] hover:border-[#d0d0cc] hover:bg-[#f4f4f2]"
            }`}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={() => onEdit(template)}
            className="p-1.5 rounded-md hover:bg-[#f4f4f2] text-[#b0b0aa] hover:text-[#4a4a48] transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(template.id)}
            className="p-1.5 rounded-md hover:bg-[#fdf1f0] text-[#b0b0aa] hover:text-[#c0392b] transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#f4f4f2] mx-5" />

      {/* Body preview / expand */}
      <div className="px-5 py-4">
        <p className={`text-sm text-[#4a4a48] font-mono leading-relaxed whitespace-pre-wrap ${
          expanded ? "" : "line-clamp-3"
        }`}>
          {template.body}
        </p>
        {template.body.split("\n").length > 3 && (
          <button onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-[#858580] hover:text-[#111110] font-medium transition-colors">
            {expanded ? "Show less ↑" : "Show full email ↓"}
          </button>
        )}
      </div>
    </div>
  );
}
