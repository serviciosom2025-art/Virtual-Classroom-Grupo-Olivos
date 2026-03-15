"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui/spinner";

export default function HomePage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth/login");
      } else if (profile) {
        if (profile.role === "admin") {
          router.replace("/admin");
        } else if (profile.role === "teacher") {
          router.replace("/teacher");
        } else {
          router.replace("/student");
        }
      }
    }
  }, [user, profile, loading, router]);

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center">
        <Spinner className="w-8 h-8 text-blue-500 mx-auto" />
        <p className="mt-4 text-slate-400">Loading...</p>
      </div>
    </div>
  );
}
