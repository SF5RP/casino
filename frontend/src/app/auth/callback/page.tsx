"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { handleCallback } = useAuth();

  useEffect(() => {
    async function completeAuth() {
      const success = await handleCallback();

      if (success) {
        window.history.replaceState({}, document.title, "/auth/callback");
        // Redirect to home page or where they came from
        const returnUrl = sessionStorage.getItem("auth_return_url") || "/";
        sessionStorage.removeItem("auth_return_url");
        router.push(returnUrl);
      } else {
        // Auth failed, redirect to home with error
        router.push("/?auth=failed");
      }
    }

    completeAuth();
  }, [handleCallback, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4" />
        <h2 className="text-xl font-semibold text-white">Авторизация...</h2>
        <p className="text-gray-400 mt-2">Пожалуйста, подождите</p>
      </div>
    </div>
  );
}
