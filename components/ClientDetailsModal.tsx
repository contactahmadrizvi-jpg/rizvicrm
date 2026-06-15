"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Client, Project } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Mail, Building2, DollarSign, Calendar, FolderKanban } from "lucide-react";

interface ClientDetailsModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ClientDetailsModal({ client, isOpen, onClose }: ClientDetailsModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!client?.id || !isOpen) {
      setProjects([]);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "projects"), where("clientId", "==", client.id));
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
      setLoading(false);
    });

    return unsub;
  }, [client?.id, isOpen]);

  if (!client) return null;

  const totalProjectBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalCommissions = projects.reduce((sum, p) => sum + (p.totalCommission || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Client Details" size="lg">
      <div className="space-y-6">
        {/* Client Info */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{client.name}</h3>
              <p className="text-slate-500 text-sm mt-1">{client.company}</p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                <Mail size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Email</p>
                <p className="text-slate-800 font-semibold">{client.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-purple-50 border border-purple-100 rounded-xl">
                <Building2 size={16} className="text-purple-600" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Company</p>
                <p className="text-slate-800 font-semibold">{client.company}</p>
              </div>
            </div>

            {client.status === "Closed" && (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <DollarSign size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-medium">Project Value</p>
                    <p className="text-slate-800 font-bold">
                      ${Number(client.projectValue || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl">
                    <DollarSign size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-medium">Upfront Paid</p>
                    <p className="text-slate-800 font-bold">
                      ${Number(client.upfrontPaid || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl">
                <Calendar size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Created</p>
                <p className="text-slate-800 font-semibold">
                  {new Date(client.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-slate-800 font-semibold flex items-center gap-2">
              <FolderKanban size={18} className="text-indigo-600" />
              Associated Projects
              <span className="text-slate-400 text-sm font-medium">({projects.length})</span>
            </h4>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-8 text-center">
              <FolderKanban size={32} className="text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No projects for this client</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-slate-900 font-semibold text-sm">{project.name}</p>
                        <p className="text-slate-500 text-xs mt-1 font-medium">{project.projectType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-600 font-bold text-sm">
                          ${Number(project.budget || 0).toLocaleString()}
                        </p>
                        <p className="text-slate-400 text-xs font-medium">Budget</p>
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-slate-600 text-xs mt-2 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-xs mb-1 font-medium">Total Project Budget</p>
                    <p className="text-slate-900 font-bold text-lg">
                      ${totalProjectBudget.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-1 font-medium">Total Commissions</p>
                    <p className="text-indigo-700 font-bold text-lg">
                      ${totalCommissions.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
