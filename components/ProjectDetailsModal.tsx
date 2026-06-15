"use client";

import { Project, Client } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  DollarSign,
  Calendar,
  User,
  Users,
  PhoneCall,
  Percent,
  CheckCircle2,
} from "lucide-react";

interface ProjectDetailsModalProps {
  project: Project | null;
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectDetailsModal({
  project,
  client,
  isOpen,
  onClose,
}: ProjectDetailsModalProps) {
  if (!project) return null;

  const typeColors: Record<string, string> = {
    "App Development": "bg-indigo-50 text-indigo-700 border-indigo-200/50",
    "AI Receptionist": "bg-blue-50 text-blue-700 border-blue-200/50",
    Other: "bg-slate-50 text-slate-600 border-slate-200/50",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project Details" size="lg">
      <div className="space-y-6">
        {/* Project Header */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{project.name}</h3>
              <p className="text-slate-500 text-sm mt-1">
                Client: {client?.name || project.clientName}
              </p>
            </div>
            <span
              className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${
                typeColors[project.projectType]
              }`}
            >
              {project.projectType}
            </span>
          </div>

          {project.description && (
            <p className="text-slate-600 text-sm mb-4 bg-white border border-slate-100 rounded-xl p-3 shadow-sm leading-relaxed">
              {project.description}
            </p>
          )}

          {/* Budget Info */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-emerald-600" />
                <p className="text-slate-500 text-xs font-medium">Total Budget</p>
              </div>
              <p className="text-emerald-700 font-bold text-2xl">
                ${Number(project.budget || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-indigo-600" />
                <p className="text-slate-500 text-xs font-medium">Upfront Paid</p>
              </div>
              <p className="text-indigo-700 font-bold text-2xl">
                ${Number(project.upfrontPaid || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar size={14} />
            <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Features */}
        {project.features && project.features.length > 0 && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
            <h4 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              Features
              <span className="text-slate-400 text-sm font-medium">({project.features.length})</span>
            </h4>
            <div className="space-y-2">
              {project.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-white border border-slate-100 rounded-lg p-3 shadow-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-indigo-200">
                    {idx + 1}
                  </div>
                  <p className="text-slate-600 text-sm flex-1 leading-relaxed">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commission Breakdown */}
        {(project.coldCallerId || project.salesCloserId) && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
            <h4 className="text-slate-800 font-semibold mb-4 flex items-center gap-2">
              <Users size={18} className="text-amber-600" />
              Commission Breakdown
            </h4>

            <div className="space-y-3">
              {project.salesCloserId && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <User size={16} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-indigo-700 font-semibold text-sm">Sales Closer</p>
                        <p className="text-slate-500 text-xs mt-0.5">{project.salesCloserName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-700 font-bold text-lg">
                        ${Number(project.salesCloserCommission || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {project.coldCallerId && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <PhoneCall size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-amber-700 font-semibold text-sm">Cold Caller</p>
                        <p className="text-slate-500 text-xs mt-0.5">{project.coldCallerName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-700 font-bold text-lg">
                        ${Number(project.coldCallerCommission || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Total Commission */}
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent size={18} className="text-rose-600" />
                    <p className="text-slate-800 font-semibold">Total Commission Cost</p>
                  </div>
                  <p className="text-rose-600 font-bold text-xl">
                    ${Number(project.totalCommission || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Net Profit */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-slate-800 font-semibold">Net Profit (After Commissions)</p>
                  <p className="text-emerald-700 font-bold text-xl">
                    $
                    {Number(
                      (project.budget || 0) - (project.totalCommission || 0)
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
