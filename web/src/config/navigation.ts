import {
  BriefcaseBusiness,
  Calendar,
  Clock,
  FileText,
  LayoutDashboard,
  MonitorCog,
  Scale,
  Sliders,
  Users,
  Wallet,
  WalletCards,
  Bell,
  BookOpen,
} from "lucide-react";

export const navigation = {
  // HR Workspace Navigation Items (Active when role === 'HR' or browsing /hr)
  hrWorkspace: [
    {
      title: "HR Dashboard",
      url: "/hr",
      icon: LayoutDashboard,
    },
    {
      title: "Attendance Monitoring",
      url: "/hr/attendance",
      icon: Clock,
    },
    {
      title: "Attendance Settings",
      url: "/hr/attendance-settings",
      icon: Sliders,
    },
    {
      title: "Leave & Permissions",
      url: "/hr/leave",
      icon: Calendar,
    },
    {
      title: "Document Distribution",
      url: "/hr/documents",
      icon: FileText,
    },
    {
      title: "Payroll Distribution",
      url: "/hr/payroll",
      icon: Wallet,
    },
    {
      title: "Employee Directory",
      url: "/hr/employees",
      icon: Users,
    },
  ],

  // Employee / User Workspace Navigation Items (Active for all employees)
  userWorkspace: [
    {
      title: "My Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "My Permissions / Leave",
      url: "/leave",
      icon: Calendar,
    },
    {
      title: "My Documents",
      url: "/documents",
      icon: BookOpen,
    },
    {
      title: "My Payroll",
      url: "/payroll",
      icon: Wallet,
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: Bell,
    },
  ],

  // Future ERP Modules (Only HR is active for now, others listed without business logic)
  modules: [
    {
      title: "HRIS Module",
      url: "/hr",
      icon: Users,
      badge: "Operational",
    },
    {
      title: "Business Development",
      url: "/business-development",
      icon: BriefcaseBusiness,
      badge: "Phase 2",
    },
    {
      title: "Legal & Compliance",
      url: "/legal",
      icon: Scale,
      badge: "Phase 2",
    },
    {
      title: "Finance & Accounting",
      url: "/finance",
      icon: WalletCards,
      badge: "Phase 2",
    },
    {
      title: "IT Operations",
      url: "/it",
      icon: MonitorCog,
      badge: "Phase 2",
    },
  ],

  system: [
    {
      title: "System Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
};