"use client";

import React from "react";
import { Menu, Shield, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface AdminHeaderProps {
  onMenuToggle: () => void;
  adminEmail?: string;
  adminName?: string;
}

export function AdminHeader({ onMenuToggle, adminEmail, adminName }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-[#0c1222]/90 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Badge variant="purple" className="hidden sm:inline-flex">
            <Shield className="w-3 h-3 mr-1" />
            Admin Mode
          </Badge>
          <span className="text-xs text-slate-500 hidden md:inline">
            admin.marketmyidea.online
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a
          href="https://marketmyidea.online"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-300 transition-colors"
        >
          <span>Live Site</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-medium text-slate-200">
              {adminName || adminEmail || "Administrator"}
            </div>
            <div className="text-[11px] text-indigo-400 font-mono">Role: admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
