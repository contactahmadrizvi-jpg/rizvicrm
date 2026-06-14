export type LeadStatus = "Meeting" | "Closed" | "Rejected";
export type EmployeeRole = "Sales Closer" | "Cold Caller";
export type ProjectType = "App Development" | "AI Receptionist" | "Other";

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  status: LeadStatus;
  projectValue?: number;
  upfrontPaid?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  leadId: string;
  name: string;
  email: string;
  company: string;
  status: LeadStatus;
  projectValue?: number;
  upfrontPaid?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  clientId: string;
  clientName: string;
  projectType: ProjectType;
  features: string[];
  budget: number;
  upfrontPaid: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Commission {
  id: string;
  name: string;
  role: EmployeeRole;
  totalCommission: number;
  createdAt: Date;
  updatedAt: Date;
}
