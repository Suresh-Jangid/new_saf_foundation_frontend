"use client"

import type React from "react"

import { useEffect, useState, useMemo, memo, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileSidebar } from "@/components/sidebar"
import { formatBilingual } from "@/lib/translations"
import { getUserRole, isAdmin } from "@/lib/permissions"
import { syncAuthSession } from "@/lib/api"

// Memoized loading component
const LoadingSpinner = memo(() => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      <p className="mt-2 text-gray-600">Loading...</p>
    </div>
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

// Memoized header component
const MobileHeader = memo(({ userRole }: { userRole: string }) => (
  <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
    <h1 className="text-lg font-semibold">
      {isAdmin() ? formatBilingual("roles.foundationAdmin") : formatBilingual("roles.foundationAgent")}
    </h1>
    <MobileSidebar />
  </header>
));

MobileHeader.displayName = 'MobileHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string>("admin")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check authentication only on client side
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    const auth = localStorage.getItem("isAuthenticated")
    const role = getUserRole()
    const hasAuth = !!auth

    if (!hasAuth) {
      // Use replace instead of push to avoid adding to history
      router.replace("/")
      setIsLoading(false)
      return
    }

    const token = syncAuthSession()
    if (!token) {
      router.replace("/")
      setIsLoading(false)
      return
    }

    setIsAuthenticated(true)
    setUserRole(role)
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-[312px] lg:flex-col lg:fixed lg:inset-y-0 z-20 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col min-h-0">
            <Sidebar />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:pl-[312px] overflow-hidden">
          {/* Mobile Header */}
          <MobileHeader userRole={userRole} />

          {/* Page Content */}
          <main className="flex-1">
            <Suspense fallback={<LoadingSpinner />}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}
