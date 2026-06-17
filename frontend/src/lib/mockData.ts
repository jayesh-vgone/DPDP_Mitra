export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Risk {
  name: string;
  level: RiskLevel;
  description: string;
}

export const institution = {
  name: 'Sunrise Public School',
  type: 'School (K-12)',
  location: 'Pune, Maharashtra',
  studentCount: 2840,
  staffCount: 180,
  board: 'CBSE',
  plan: 'Institution Pro',
};

export const complianceScore = 72;

export const scoreTrend = [41, 48, 55, 60, 66, 72];

export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export const risks: Risk[] = [
  { name: 'Consent Risk', level: 'MEDIUM', description: 'Parental consent records need updating' },
  { name: 'Data Security Risk', level: 'LOW', description: 'Security controls are well maintained' },
  { name: 'Vendor Risk', level: 'HIGH', description: '3 vendors lack data processing agreements' },
  { name: 'Retention Risk', level: 'MEDIUM', description: 'Data retention policy needs review' },
];
