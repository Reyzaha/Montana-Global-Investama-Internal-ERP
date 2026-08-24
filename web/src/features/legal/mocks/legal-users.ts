import { UserReference } from "../types/user.types"

export const MOCK_USERS: Record<string, UserReference> = {
  LEGAL_PIC: {
    id: "usr-legal-01",
    name: "Bambang Prakoso, S.H., LL.M.",
    email: "bambang.prakoso@montanaglobal.co.id",
    department: "Legal",
    role: "LEGAL_PIC",
    title: "Senior Legal Specialist & Compliance Lead",
  },
  LEGAL_STAFF: {
    id: "usr-legal-02",
    name: "Sarah Wijaya, S.H.",
    email: "sarah.wijaya@montanaglobal.co.id",
    department: "Legal",
    role: "LEGAL_STAFF",
    title: "Junior Legal Associate",
  },
  BUSINESS_DEV_PIC: {
    id: "usr-bd-01",
    name: "Dewi Lestari, S.E.",
    email: "dewi.lestari@montanaglobal.co.id",
    department: "Business Development",
    role: "BUSINESS_DEV_PIC",
    title: "Business Development Lead",
  },
  DIRECTOR: {
    id: "usr-dir-01",
    name: "Ir. Suryo Montana, M.B.A.",
    email: "suryo.montana@montanaglobal.co.id",
    department: "Board of Directors",
    role: "DIRECTOR",
    title: "Managing Director & CEO",
  },
  FINANCE_PIC: {
    id: "usr-fin-01",
    name: "Hendrik Setiawan, Ak., C.A.",
    email: "hendrik.s@montanaglobal.co.id",
    department: "Finance & Accounting",
    role: "FINANCE_PIC",
    title: "Finance & Treasury Lead",
  },
  PROJECT_PIC: {
    id: "usr-proj-01",
    name: "Ahmad Rizky, S.T., PMP",
    email: "ahmad.rizky@montanaglobal.co.id",
    department: "Project & Investment",
    role: "PROJECT_PIC",
    title: "Heavy Equipment Project Manager",
  },
}
