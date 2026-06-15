export type LeadStatus = "Initial Email" | "Follow Up" | "Meeting" | "Closed" | "Rejected";
export type EmployeeRole = "Sales Closer" | "Cold Caller";
export type ProjectType = "App Development" | "AI Receptionist" | "Other";
export type PaymentStatus = "Unpaid" | "Partial" | "Paid";
export type UserRole = "admin" | "member";

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}


export interface CommissionPayment {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  note?: string;
  createdAt: Date;
}

export interface FollowUpNote {
  id: string;
  note: string;
  date: string; // ISO date string
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  status: LeadStatus;
  projectValue?: number;
  upfrontPaid?: number;
  followUps?: FollowUpNote[];
  serviceType?: "AI Receptionist" | "App Development";
  phoneNumber?: string;
  submittedBy?: string;
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
  totalPaid: number;
  remainingPayment: number;
  paymentStatus: PaymentStatus;
  startDate?: string;   // ISO date string "YYYY-MM-DD"
  deadline?: string;    // ISO date string "YYYY-MM-DD"
  // Commission fields
  coldCallerId?: string;
  coldCallerName?: string;
  coldCallerCommission?: number;
  salesCloserId?: string;
  salesCloserName?: string;
  salesCloserCommission?: number;
  totalCommission?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Commission {
  id: string;
  name: string;
  role: EmployeeRole;
  commissionRate: number; // percentage e.g. 10 = 10%
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionPayment {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: EmployeeRole;
  projectId: string;
  projectName: string;
  commissionAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  paymentHistory: PaymentRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecord {
  amount: number;
  date: Date;
  note?: string;
}
