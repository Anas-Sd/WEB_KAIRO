"use client";

import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  Search,
  X,
  Settings,
  MoreVertical,
  CheckCircle2,
  CloudOff,
  RefreshCw,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAuthStore } from "@/store/useAuthStore";

interface AppHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  onOpenSettings?: () => void;
  moreMenuItems?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    destructive?: boolean;
  }[];
}

export function AppHeader({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  onOpenSettings,
  moreMenuItems = [],
}: AppHeaderProps) {
  const { user } = useAuthStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const displayName = user?.name || "User";
  const todayStr = format(new Date(), "EEEE, MMM d");

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    onSearchChange("");
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#09090B]/90 backdrop-blur-md border-b border-[#1C1C20] px-4 py-3">
      <div className="flex items-center justify-between min-h-[44px]">
        {isSearchOpen ? (
          <div className="flex items-center w-full gap-2 transition-all duration-200">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#918EA2]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-[#161619] border border-[#474556]/50 rounded-xl pl-9 pr-9 py-2 text-sm text-[#E3E1EC] placeholder-[#918EA2] focus:outline-none focus:border-[#C5C0FF]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#918EA2] hover:text-[#E3E1EC]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleCloseSearch}
              className="p-2 rounded-xl text-[#918EA2] hover:text-[#E3E1EC] hover:bg-[#161619]"
              title="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            {/* Left: Greeting + Date + Sync dot */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">Hi, {displayName}</span>
                {/* Sync status pill */}
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${
                    !isOnline
                      ? "bg-[#FFB77D]/10 border-[#FFB77D]/30 text-[#FFB77D]"
                      : isSyncing
                      ? "bg-[#C5C0FF]/10 border-[#C5C0FF]/30 text-[#C5C0FF]"
                      : "bg-[#68DBA9]/10 border-[#68DBA9]/30 text-[#68DBA9]"
                  }`}
                  title={!isOnline ? "Offline" : isSyncing ? "Syncing..." : "Live Synced"}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      !isOnline
                        ? "bg-[#FFB77D]"
                        : isSyncing
                        ? "bg-[#C5C0FF] animate-pulse"
                        : "bg-[#68DBA9]"
                    }`}
                  />
                  <span>{!isOnline ? "Offline" : isSyncing ? "Syncing" : "Synced"}</span>
                </div>
              </div>
              <span className="text-xs text-[#918EA2]">{todayStr}</span>
            </div>

            {/* Right: Search, Settings (mobile only), 3-dots */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-xl text-[#918EA2] hover:text-[#E3E1EC] hover:bg-[#161619] transition-colors"
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Mobile Settings Gear */}
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="lg:hidden p-2 rounded-xl text-[#918EA2] hover:text-[#E3E1EC] hover:bg-[#161619] transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}

              {/* 3-dots Menu */}
              {moreMenuItems.length > 0 && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className="p-2 rounded-xl text-[#918EA2] hover:text-[#E3E1EC] hover:bg-[#161619] transition-colors"
                      title="More options"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={8}
                      className="z-50 min-w-[160px] bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-xl animate-in fade-in-80"
                    >
                      {moreMenuItems.map((item, idx) => (
                        <DropdownMenu.Item
                          key={idx}
                          onClick={item.onClick}
                          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none transition-colors ${
                            item.destructive
                              ? "text-[#FFB4AB] hover:bg-[#93000A]/30"
                              : "text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF]"
                          }`}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
