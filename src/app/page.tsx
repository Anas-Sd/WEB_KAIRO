"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function HomePage() {
  const router = useRouter();
  const { user, isInitialized, initSession } = useAuthStore();

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    if (isInitialized) {
      if (user?.code) {
        router.replace("/tasks");
      } else {
        router.replace("/login");
      }
    }
  }, [isInitialized, user, router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090B]">
      <div className="w-8 h-8 rounded-full border-2 border-[#5A45FF] border-t-transparent animate-spin" />
    </div>
  );
}
