export interface Lead {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified' | 'lost';
  source: 'website' | 'referral' | 'social' | 'direct' | 'other';
  notes?: string;
  assignedTo: string;
  createdBy: string;
  value: number;
  lastContact?: Date;
  nextFollowUp?: Date;
  createdAt: Date;
  updatedAt: Date;
}