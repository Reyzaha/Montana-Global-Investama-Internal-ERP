"use client";

import React from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHrContext } from "@/src/features/hr/context/hr-context";

export function RoleSwitcher() {
  const { currentUser, allTestAccounts, switchUser } = useHrContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 text-xs border-border bg-card">
          <div className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground max-w-[120px] truncate">{currentUser.name}</span>
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-mono font-bold">
              {currentUser.role}
            </Badge>
          </div>
          <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-1 shadow-lg">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider px-2 py-1.5">
          Switch Test Account (Role)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {allTestAccounts.map((account) => {
          const isSelected = account.id === currentUser.id;
          return (
            <DropdownMenuItem
              key={account.id}
              onClick={() => switchUser(account.id)}
              className={`flex items-center justify-between p-2 text-xs cursor-pointer rounded-md ${
                isSelected ? "bg-primary/10 font-semibold text-primary" : ""
              }`}
            >
              <div className="flex flex-col">
                <span className="text-foreground">{account.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {account.username} • {account.department}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] font-mono">
                  {account.role}
                </Badge>
                {isSelected && <Check className="size-3.5 text-primary ml-1" />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
