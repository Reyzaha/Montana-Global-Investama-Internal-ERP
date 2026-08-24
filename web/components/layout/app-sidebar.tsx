"use client";

import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { navigation } from "@/src/config/navigation";
import { useHrContext } from "@/src/features/hr/context/hr-context";
import { LogOut } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { currentUser } = useHrContext();

  const isHrRole = currentUser.role === "HR";

  const isActive = (url: string) => {
    if (url === "/dashboard" || url === "/hr") {
      return pathname === url;
    }
    return pathname.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            M
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none">
              MGI ERP
            </span>

            <span className="text-xs text-muted-foreground mt-0.5">
              Montana Global Investama
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* HR Workspace Section (Only for HR Role or when user has HR permissions) */}
        {isHrRole && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>HR Workspace</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-primary/10 text-primary border-primary/20">
                Admin
              </Badge>
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.hrWorkspace.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<a href={item.url} />}
                      isActive={isActive(item.url)}
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* User / Employee Workspace */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {isHrRole ? "Employee View" : "Employee Workspace"}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.userWorkspace.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<a href={item.url} />}
                    isActive={isActive(item.url)}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ERP Enterprise Modules */}
        <SidebarGroup>
          <SidebarGroupLabel>Enterprise Modules</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.modules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<a href={item.url} />}
                    isActive={isActive(item.url)}
                  >
                    <item.icon className="size-4" />
                    <span className="truncate">{item.title}</span>
                    {item.badge && (
                      <span
                        className={`ml-auto text-[9px] px-1 py-0.5 rounded font-medium ${
                          item.badge === "Operational"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold truncate text-foreground">{currentUser.name}</span>
              <span className="text-[10px] text-muted-foreground truncate">{currentUser.department}</span>
            </div>
          </div>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              title="Logout"
              className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}