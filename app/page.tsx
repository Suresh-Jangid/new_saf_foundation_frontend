
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Eye, EyeOff, User, Lock, LogIn, Shield, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Preload translations on mount to avoid blocking render
let formatBilingualFn: ((key: string, separator?: string) => string) | null = null;
let translationsLoaded = false;

const loadTranslations = async () => {
  if (translationsLoaded && formatBilingualFn) return formatBilingualFn;
  const mod = await import("@/lib/translations");
  formatBilingualFn = mod.formatBilingual;
  translationsLoaded = true;
  return formatBilingualFn;
};


export default function LoginPage() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin"); // Default to admin
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [translationsReady, setTranslationsReady] = useState(false);

  const router = useRouter();

  // Preload translations on mount
  useEffect(() => {
    loadTranslations().then(() => {
      setTranslationsReady(true);
    });
  }, []);

  // Helper function to get translations
  const formatBilingual = useCallback((key: string, separator: string = ' / '): string => {
    if (!formatBilingualFn) {
      // Fallback if translations not loaded yet
      return key;
    }
    return formatBilingualFn(key, separator);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Dynamically import heavy dependencies only when needed
      const [{ post, setAuthSession }, { formatBilingual }, { storeAgentData }] = await Promise.all([
        import("../lib/api"),
        import("@/lib/translations"),
        import("@/lib/permissions")
      ]);
      
      const formData = new FormData();
      formData.append("mobile", mobile);
      formData.append("password", password);
      
      // Use different API endpoints based on role
      const apiEndpoint = role === "agent" ? "?apicall=agentLogin" : "?apicall=login";
      
      const response: any = await post(apiEndpoint, formData);
      
      if (response.data.error) {
        toast.error(response.data.message);
      } else {
        if (role === "agent") {
          const token = response.data.agent?.token;
          if (!token) {
            toast.error("Login succeeded but no token received. Please try again.");
            return;
          }
          storeAgentData(response.data.agent);
          setAuthSession({ role: "agent", token, agent: response.data.agent });
        } else {
          const token = response.data.user?.token;
          if (!token) {
            toast.error("Login succeeded but no token received. Please try again.");
            return;
          }
          setAuthSession({ role: "admin", token, user: response.data.user });
        }
        const { formatBilingual: formatBilingualAsync } = await import("@/lib/translations");
        toast.success(role === "admin" ? formatBilingualAsync("messages.adminLoginSuccess") : formatBilingualAsync("messages.agentLoginSuccess"));
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.log("error message ", err);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [mobile, password, role, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-orange-600 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      {/* Main login card */}
      <div className="relative w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 transform transition-all duration-300 hover:scale-[1.02]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-6">
              {/* Logo/Brand Area */}
              
              <h1 className="text-2xl font-bold text-white mb-2">
                {translationsReady ? formatBilingual("login.title") : "Login / लॉगिन"}
              </h1>
              <div className="flex flex-col items-center justify-center my-4">
                <div className="bg-white rounded-full p-2 shadow-xl border border-white/20 mb-3 transform hover:scale-105 transition-transform duration-200">
                  <img
                    src="/assets/images/logo.png"
                    alt="SAF Foundation Logo"
                    className="h-28 w-28 md:h-32 md:w-32 object-contain rounded-full"
                  />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
                  SAF <span className="text-[#ff5c00]">FOUNDATION</span>
                </h2>
                <p className="text-sm font-medium text-white/90 mt-1">
                  शिक्षा अमृतम फाउंडेशन
                </p>
              </div>

              <p className="text-sm text-white/70 leading-relaxed">
                {translationsReady ? formatBilingual("login.subtitle") : "Secure access to your account"}
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection with Radio Buttons */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Select Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Admin Radio Button */}
                <label className={`relative flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                  role === "admin" 
                    ? "border-orange-400 bg-orange-500/20 text-white" 
                    : "border-white/20 bg-white/5 text-white/70 hover:bg-white/10"
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === "admin"}
                    onChange={(e) => setRole(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="h-6 w-6" />
                    <span className="font-medium text-sm">Admin</span>
                  </div>
                  {role === "admin" && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-orange-400 rounded-full"></div>
                  )}
                </label>

                {/* Agent Radio Button */}
                <label className={`relative flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                  role === "agent" 
                    ? "border-orange-400 bg-orange-500/20 text-white" 
                    : "border-white/20 bg-white/5 text-white/70 hover:bg-white/10"
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="agent"
                    checked={role === "agent"}
                    onChange={(e) => setRole(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <UserCheck className="h-6 w-6" />
                    <span className="font-medium text-sm">Agent</span>
                  </div>
                  {role === "agent" && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-orange-400 rounded-full"></div>
                  )}
                </label>
              </div>
            </div>

            {/* Username Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-white/60" />
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                placeholder={translationsReady ? formatBilingual("placeholders.enterMobile") : "Enter Mobile Number"}
                required
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-white/60" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                placeholder={translationsReady ? formatBilingual("placeholders.enterPassword") : "Enter Password"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white transition-colors duration-200"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{translationsReady ? formatBilingual("login.signingIn") : "Signing In..."}</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>{translationsReady ? formatBilingual("login.signIn") : "Sign In"}</span>
                </>
              )}
            </button>
        
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-xs text-white/60">
              {translationsReady ? formatBilingual("login.secureAccess") : "Secure access to your account"}
            </p>
          </div>
        </div>

        {/* Additional decorative elements */}
        <div className="absolute -z-10 top-4 left-4 right-4 bottom-4 bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-3xl blur-xl"></div>
      </div>
    </div>
  );
}
