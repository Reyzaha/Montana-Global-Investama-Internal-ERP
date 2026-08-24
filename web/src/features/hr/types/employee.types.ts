export interface EmployeeProfile {
  id: string;
  username: string; // email
  name: string;
  role: string;
  department: string;
  position?: string;
  joinDate?: string;
  isActive: boolean;
  avatarUrl?: string;
  phone?: string;
}
