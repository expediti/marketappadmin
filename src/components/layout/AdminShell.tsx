"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

interface AdminShellProps {
  children: React.ReactNode;
  adminEmail?: string;
  adminName?: string;
}

export function AdminShell({ children, adminEmail, adminName }: AdminShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | undefined>(adminEmail);
  const [checkingAuth, setCheckingAuth] = useState(!adminEmail);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/auth/session");
        if (!res.ok) {
          if (isMounted) {
            router.push("/login");
          }
          return;
        }
        const data = await res.json();
        if (isMounted) {
          if (data.authenticated && data.email) {
            setCurrentEmail(data.email);
            setCheckingAuth(false);
          } else {
            router.push("/login");
          }
        }
      } catch (err) {
        console.error("Session check failed:", err);
        if (isMounted) {
          router.push("/login");
        }
      }
    }

    if (!adminEmail) {
      checkAuth();
    } else {
      setCheckingAuth(false);
    }

    return () => {
      isMounted = false;
    };
  }, [adminEmail, router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Verifying administrator session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <AdminHeader
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          adminEmail={currentEmail}
          adminName={adminName}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
