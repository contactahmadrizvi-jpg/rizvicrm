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
  Plus, Copy, Check, Pencil, Trash2, Mail, MailOpen, ChevronRight, X,
} from "lucide-react";

type EmailType = "initial" | "followup";

interface EmailVariant {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface EmailTemplate {
  id: string;
  label: string;
  type: EmailType;
  variants: EmailVariant[];
  order: number;
  createdAt: Date;
}

interface CopiedState { [key: string]: boolean }

const TYPE_LABELS: Record<EmailType, string> = {
  initial:  "Initial Outreach",
  followup: "Follow-up",
};

const TYPE_COLORS: Record<EmailType, { dot: string; badge: string; icon: string }> = {
  initial:  { dot: "bg-[#c9a84c]", badge: "bg-[#fef9ec] text-[#b45309] border-[#fde68a]", icon: "text-[#c9a84c]" },
  followup: { dot: "bg-[#1d4ed8]", badge: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",  icon: "text-[#1d4ed8]" },
};

let variantCounter = 0;
function makeVariant(partial?: Partial<EmailVariant>): EmailVariant {
  variantCounter += 1;
  return {
    id: `new-${Date.now()}-${variantCounter}`,
    name: partial?.name ?? "",
    subject: partial?.subject ?? "",
    body: partial?.body ?? "",
    ...partial,
  };
}

export default function EmailCopyPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<CopiedState>({});
  const [form, setForm] = useState({
    label: "",
    type: "initial" as EmailType,
    variants: [makeVariant()],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeType, setActiveType] = useState<EmailType | "all">("all");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "emailTemplates"), (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data();
        const variants = Array.isArray(raw.variants)
          ? raw.variants.map((v: Record<string, string>) => ({
              id: v.id ?? "",
              name: v.name ?? "",
              subject: v.subject ?? "",
              body: v.body ?? "",
            }))
          : [];
        // Backwards compatibility: if old template has single subject/body, convert to one variant
        if (variants.length === 0 && (raw.subject || raw.body)) {
          variants.push(makeVariant({ name: raw.label ?? "", subject: raw.subject ?? "", body: raw.body ?? "" }));
        }
        return {
          id: d.id, label: raw.label ?? "", type: raw.type ?? "initial",
          variants, order: raw.order ?? 0,
          createdAt: raw.createdAt?.toDate?.() ?? new Date(),
        } as EmailTemplate;
      });
      data.sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
      setTemplates(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const openAdd = (type?: EmailType) => {
    setEditing(null);
    setForm({ label: "", type: type ?? "initial", variants: [makeVariant()] });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setForm({
      label: t.label,
      type: t.type,
      variants: t.variants.length > 0 ? t.variants.map((v) => ({ ...v })) : [makeVariant()],
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.label.trim()) e.label = "Name is required";
    form.variants.forEach((v, i) => {
      if (!v.subject.trim()) e[`variant-${i}-subject`] = "Subject line is required";
      if (!v.body.trim()) e[`variant-${i}-body`] = "Email body is required";
    });
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const variants = form.variants.map((v) => ({
        id: v.id,
        name: v.name.trim(),
        subject: v.subject.trim(),
        body: v.body.trim(),
      }));
      const payload = {
        label: form.label.trim(),
        type: form.type,
        variants,
        updatedAt: serverTimestamp(),
      };
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
    if (!confirm("Delete this email template and all its variants?")) return;
    await deleteDoc(doc(db, "emailTemplates", id));
  };

  const handleCopySubject = (templateId: string, variantId: string, subject: string) => {
    const key = `${templateId}-${variantId}-subject`;
    navigator.clipboard.writeText(subject).then(() => {
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
    });
  };

  const handleCopyBody = (templateId: string, variantId: string, body: string) => {
    const key = `${templateId}-${variantId}-body`;
    navigator.clipboard.writeText(body).then(() => {
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
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
                    copied={copied} onCopySubject={handleCopySubject} onCopyBody={handleCopyBody} />
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
                    copied={copied} onCopySubject={handleCopySubject} onCopyBody={handleCopyBody}
                    showArrows />
                </section>
              )}
            </div>
          ) : (
            /* Filtered view */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((t) => (
                <EmailCard key={t.id} template={t} onEdit={openEdit} onDelete={handleDelete}
                  copied={copied} onCopySubject={handleCopySubject} onCopyBody={handleCopyBody} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editing ? "Edit Template" : "New Email Template"} size="xl">
        <div className="space-y-5">
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

          {/* Email Variants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[#4a4a48] tracking-wide uppercase">
                Email Variants
              </p>
              <button
                type="button"
                onClick={() => setForm({ ...form, variants: [...form.variants, makeVariant()] })}
                className="flex items-center gap-1.5 text-xs text-[#1d4ed8] hover:text-[#1a1a2e] font-medium transition-colors"
              >
                <Plus size={12} /> Add Variant
              </button>
            </div>

            <div className="space-y-4">
              {form.variants.map((variant, i) => (
                <div key={variant.id}
                  className="relative border border-[#e8e8e4] rounded-lg p-4 bg-[#fafaf9] space-y-3">
                  {/* Variant header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#858580]">
                      Variant {i + 1}
                    </span>
                    {form.variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            variants: form.variants.filter((_, idx) => idx !== i),
                          })
                        }
                        className="flex items-center gap-1 text-xs text-[#c0392b] hover:text-[#a5311b] font-medium transition-colors"
                      >
                        <X size={12} /> Remove
                      </button>
                    )}
                  </div>

                  <Input
                    label="Variant Name (optional)"
                    placeholder="e.g. Friendly, Professional, Direct"
                    value={variant.name}
                    onChange={(e) => {
                      const updated = [...form.variants];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setForm({ ...form, variants: updated });
                    }}
                    disabled={saving}
                  />

                  <Input
                    label="Subject Line"
                    placeholder="e.g. Quick question about your business"
                    value={variant.subject}
                    onChange={(e) => {
                      const updated = [...form.variants];
                      updated[i] = { ...updated[i], subject: e.target.value };
                      setForm({ ...form, variants: updated });
                    }}
                    error={errors[`variant-${i}-subject`]}
                    disabled={saving}
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#4a4a48] tracking-wide uppercase">
                      Email Body
                    </label>
                    <textarea
                      rows={8}
                      placeholder={"Hi [Name],\n\nI came across your business and wanted to reach out...\n\nBest,\n[Your Name]"}
                      value={variant.body}
                      onChange={(e) => {
                        const updated = [...form.variants];
                        updated[i] = { ...updated[i], body: e.target.value };
                        setForm({ ...form, variants: updated });
                      }}
                      disabled={saving}
                      className={`w-full bg-white border rounded-lg px-3 py-2.5 text-[#111110] placeholder-[#b0b0aa] text-sm font-mono
                        focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-all resize-none
                        disabled:bg-[#f4f4f2] ${errors[`variant-${i}-body`] ? "border-[#c0392b]" : "border-[#e8e8e4]"}`}
                    />
                    {errors[`variant-${i}-body`] && (
                      <p className="text-xs text-[#c0392b] font-medium">{errors[`variant-${i}-body`]}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#b0b0aa] mt-2">
              Use [Name], [Company], [Your Name] as placeholders in any variant.
            </p>
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
  templates, onEdit, onDelete, copied, showArrows = false,
  onCopySubject, onCopyBody,
}: {
  templates: EmailTemplate[];
  onEdit: (t: EmailTemplate) => void;
  onDelete: (id: string) => void;
  copied: CopiedState;
  showArrows?: boolean;
  onCopySubject: (templateId: string, variantId: string, subject: string) => void;
  onCopyBody: (templateId: string, variantId: string, body: string) => void;
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
            copied={copied} onCopySubject={onCopySubject} onCopyBody={onCopyBody}
            index={showArrows ? i + 1 : undefined} />
        </div>
      ))}
    </div>
  );
}

/* ─── Copy button helper ──────────────────────────────────────────────── */
function CopyButton({
  label, copiedKey, copiedState, onClick, size = "xs",
}: {
  label: string;
  copiedKey: string;
  copiedState: CopiedState;
  onClick: () => void;
  size?: "xs" | "sm";
}) {
  const isCopied = !!copiedState[copiedKey];
  const sizeClasses = size === "xs"
    ? "px-2 py-1 rounded-md text-[10px] gap-1"
    : "px-2.5 py-1.5 rounded-md text-xs gap-1.5";
  const iconSize = size === "xs" ? 10 : 12;

  return (
    <button onClick={onClick}
      className={`inline-flex items-center font-medium transition-all duration-150 border ${
        sizeClasses
      } ${
        isCopied
          ? "bg-[#edf7f3] border-[#a7f3d0] text-[#1a7f5a]"
          : "bg-white border-[#e8e8e4] text-[#858580] hover:border-[#d0d0cc] hover:text-[#4a4a48] hover:bg-[#f4f4f2]"
      }`}>
      {isCopied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
      {isCopied ? "Copied" : label}
    </button>
  );
}

/* ─── Individual email card ────────────────────────────────────────────── */
function EmailCard({
  template, onEdit, onDelete, copied, index,
  onCopySubject, onCopyBody,
}: {
  template: EmailTemplate;
  onEdit: (t: EmailTemplate) => void;
  onDelete: (id: string) => void;
  copied: CopiedState;
  index?: number;
  onCopySubject: (templateId: string, variantId: string, subject: string) => void;
  onCopyBody: (templateId: string, variantId: string, body: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const colors = TYPE_COLORS[template.type];
  const hasMultipleVariants = template.variants.length > 1;

  const toggleExpand = (vId: string) => {
    setExpanded((prev) => ({ ...prev, [vId]: !prev[vId] }));
  };

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
            <span className="text-[10px] text-[#b0b0aa] font-medium">
              {template.variants.length} variant{template.variants.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
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

      {/* Variants */}
      <div className="px-5 py-4 space-y-4">
        {template.variants.map((variant, vIdx) => {
          const variantLabel = variant.name || (hasMultipleVariants ? `Variant ${vIdx + 1}` : "");
          const isExpanded = expanded[variant.id] ?? false;

          return (
            <div key={variant.id} className={hasMultipleVariants ? "border border-[#f4f4f2] rounded-lg p-3 bg-[#fafaf9]" : ""}>
              {/* Variant name */}
              {variantLabel && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold text-[#858580] uppercase tracking-wider">{variantLabel}</span>
                </div>
              )}

              {/* Subject line */}
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#858580] mb-0.5">Subject</p>
                  <p className="text-sm font-semibold text-[#111110] tracking-tight leading-snug">
                    {variant.subject}
                  </p>
                </div>
                <CopyButton
                  label="Copy"
                  copiedKey={`${template.id}-${variant.id}-subject`}
                  copiedState={copied}
                  onClick={() => onCopySubject(template.id, variant.id, variant.subject)}
                  size="xs"
                />
              </div>

              {/* Body */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#858580] mb-0.5">Body</p>
                  <p className={`text-sm text-[#4a4a48] font-mono leading-relaxed whitespace-pre-wrap ${
                    isExpanded ? "" : "line-clamp-3"
                  }`}>
                    {variant.body}
                  </p>
                  {variant.body.split("\n").length > 3 && (
                    <button onClick={() => toggleExpand(variant.id)}
                      className="mt-1.5 text-[10px] text-[#858580] hover:text-[#111110] font-medium transition-colors">
                      {isExpanded ? "Show less ↑" : "Show full email ↓"}
                    </button>
                  )}
                </div>
                <div className="shrink-0">
                  <CopyButton
                    label="Copy"
                    copiedKey={`${template.id}-${variant.id}-body`}
                    copiedState={copied}
                    onClick={() => onCopyBody(template.id, variant.id, variant.body)}
                    size="xs"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
