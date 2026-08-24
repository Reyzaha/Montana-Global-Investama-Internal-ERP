export type LegalRole =
  | "LEGAL_PIC"
  | "LEGAL_STAFF"
  | "BUSINESS_DEV_PIC"
  | "FINANCE_PIC"
  | "PROJECT_PIC"
  | "DIRECTOR"
  | "ADMIN"

export type Department =
  | "Legal"
  | "Business Development"
  | "Finance & Accounting"
  | "Project & Investment"
  | "HR & GA"
  | "IT"
  | "Board of Directors"

export interface UserReference {
  id: string
  name: string
  email: string
  department: Department
  role: LegalRole
  title: string
  avatar?: string
}

export interface LegalUser extends UserReference {
  permissions: string[]
  isActive: boolean
}
