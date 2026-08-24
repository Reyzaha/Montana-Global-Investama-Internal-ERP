"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { EmployeeProfile } from "../types/employee.types";
import { INITIAL_TEST_EMPLOYEES, mockHrStore } from "../mocks/hr-store";
import { hasPermission } from "../constants/permissions.constants";

interface HrContextValue {
  currentUser: EmployeeProfile;
  activeRole: string;
  allTestAccounts: EmployeeProfile[];
  switchUser: (userIdOrEmail: string) => void;
  can: (permission: string) => boolean;
  storeVersion: number;
}

const HrContext = createContext<HrContextValue | null>(null);

const CURRENT_USER_STORAGE_KEY = "mgi_active_test_user";

export function HrProvider({
  children,
  initialUserEmail,
}: {
  children: React.ReactNode;
  initialUserEmail?: string;
}) {
  const [currentUser, setCurrentUser] = useState<EmployeeProfile>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (stored) {
        const found = INITIAL_TEST_EMPLOYEES.find(
          (e) => e.username === stored || e.id === stored,
        );
        if (found) return found;
      }
    }
    if (initialUserEmail) {
      const found = INITIAL_TEST_EMPLOYEES.find(
        (e) => e.username.toLowerCase() === initialUserEmail.toLowerCase(),
      );
      if (found) return found;
    }
    // Default to HR for first visit
    return INITIAL_TEST_EMPLOYEES[0];
  });

  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = mockHrStore.subscribe(() => {
      setVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  const switchUser = (userIdOrEmail: string) => {
    const target = INITIAL_TEST_EMPLOYEES.find(
      (e) => e.id === userIdOrEmail || e.username.toLowerCase() === userIdOrEmail.toLowerCase(),
    );
    if (target) {
      setCurrentUser(target);
      if (typeof window !== "undefined") {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, target.username);
      }
    }
  };

  const can = (permission: string) => {
    return hasPermission(currentUser.role, permission);
  };

  return (
    <HrContext.Provider
      value={{
        currentUser,
        activeRole: currentUser.role,
        allTestAccounts: INITIAL_TEST_EMPLOYEES,
        switchUser,
        can,
        storeVersion: version,
      }}
    >
      {children}
    </HrContext.Provider>
  );
}

export function useHrContext() {
  const context = useContext(HrContext);
  if (!context) {
    throw new Error("useHrContext must be used within an HrProvider");
  }
  return context;
}
