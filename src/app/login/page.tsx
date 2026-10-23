"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, isLoading, error, clearError, initSession } = useAuthStore();
  const [accessCode, setAccessCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    if (user?.code) {
      router.replace("/tasks");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(accessCode);
    if (success) {
      router.replace("/tasks");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090B] px-4 py-12">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5A45FF] to-[#C5C0FF] flex items-center justify-center shadow-2xl shadow-[#5A45FF]/30 mb-4">
            <span className="font-black text-black text-2xl tracking-tighter">K</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wider">KAIRO</h1>
          <p className="text-sm text-[#918EA2] mt-1.5 text-center">
            Enter your workspace access code
          </p>
        </div>

        {/* Card Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full bg-[#0C0C0F] border border-[#1C1C20] rounded-3xl p-6 shadow-2xl space-y-4"
        >
          <div>
            <label
              htmlFor="access-code"
              className="text-xs font-semibold text-[#918EA2] uppercase tracking-wider block mb-2"
            >
              Access Code
            </label>
            <div className="relative">
              <input
                id="access-code"
                type={showPassword ? "text" : "password"}
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value.toUpperCase());
                  if (error) clearError();
                }}
                placeholder="ACCESS CODE"
                autoComplete="off"
                autoFocus
                className="w-full bg-[#161619] border border-[#474556]/30 focus:border-[#C5C0FF] rounded-xl px-4 py-3 text-white font-mono tracking-widest text-sm focus:outline-none transition-colors pr-10 uppercase placeholder:text-[#918EA2]/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#918EA2] hover:text-white transition-colors"
                title={showPassword ? "Hide code" : "Show code"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-[#FFB4AB] mt-2 font-medium animate-in fade-in">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !accessCode.trim()}
            className="w-full py-3 px-4 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-[#5A45FF]/25 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Entering Workspace...</span>
              </>
            ) : (
              <>
                <span>Enter Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-[#918EA2]/60 mt-8 text-center">
          KAIRO Web Productivity • Connected to live mobile sync
        </p>
      </div>
    </div>
  );
}
