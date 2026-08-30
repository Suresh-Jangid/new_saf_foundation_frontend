"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBilingual } from "@/lib/translations"
import {
  Users,
  Gift,
  Bike,
  Award,
  FileText,
  UserPlus,
  Handshake,
  Gauge,
  Shield,
  Receipt,
  BadgeCheck,
  UserCog,
  Heart,
  UserCheck,
  } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getUserRole, getAgentData, isAdmin, isAgent } from "@/lib/permissions"
import { Progress } from "@radix-ui/react-progress"
import { dashboardAPI, syncAuthSession } from "@/lib/api"

// Removed recent activity helpers since data now comes from API counts only

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string>("admin")
  const [agentInfo, setAgentInfo] = useState<any>(null)
  const [counts, setCounts] = useState({
    totalCounts: {
      agent_registration: 0,
      applications: 0,
      application_insurance: 0,
      disability_cycle: 0,
      financial_help: 0,
      loan_applications: 0,
      marriage_congratulations: 0,
      marriage_sewing_machine: 0,
      pension_yojana: 0,
      sewing_machine_camp: 0,
      suraksha_bima_yojana: 0,
    },
    last7DaysCount: 0,
  })

  useEffect(() => {
    // Determine role and agent info from localStorage
    const role = getUserRole()
    const userData = typeof window !== 'undefined' ? localStorage.getItem("user") : null
    const agentData = getAgentData()

    let actualRole = role
    if (agentData) {
      actualRole = "agent"
      setAgentInfo(agentData)
    } else if (userData) {
      actualRole = "admin"
    }
    setUserRole(actualRole)

    // Fetch dashboard counts from API
    const fetchCounts = async () => {
      try {
        syncAuthSession()
        const data = await dashboardAPI.getCounts()
        if ((data?.success || data?.status) && data?.dashboard) {
          const apiCounts = data.dashboard
          setCounts({
            totalCounts: {
              agent_registration: apiCounts.total_counts?.agent_registration ?? 0,
              applications: apiCounts.total_counts?.applications ?? 0,
              application_insurance: apiCounts.total_counts?.application_insurance ?? 0,
              disability_cycle: apiCounts.total_counts?.disability_cycle ?? 0,
              financial_help: apiCounts.total_counts?.financial_help ?? 0,
              loan_applications: apiCounts.total_counts?.loan_applications ?? 0,
              marriage_congratulations: apiCounts.total_counts?.marriage_congratulations ?? 0,
              marriage_sewing_machine: apiCounts.total_counts?.marriage_sewing_machine ?? 0,
              pension_yojana: apiCounts.total_counts?.pension_yojana ?? 0,
              sewing_machine_camp: apiCounts.total_counts?.sewing_machine_camp ?? 0,
              suraksha_bima_yojana: apiCounts.total_counts?.suraksha_bima_yojana ?? 0,
            },
            last7DaysCount: apiCounts.last_7_days_count ?? 0,
          })
        }
      } catch (_e) {
        // Ignore network errors; counts stay at zero
      }
    }

    fetchCounts()
  }, [])

  // Define the cards to display based on user role using API counts only
  const getCardsForRole = () => {
    const baseCards = [
      {
        title: formatBilingual("dashboard.generalApplications"),
        value: counts.totalCounts.applications,
        icon: <FileText className="h-5 w-5 text-primary" />,
        color: "border-primary/10",
        subtitle: formatBilingual("dashboard.generalApplications"),
      },
      {
        title: formatBilingual("dashboard.recentApplications"),
        value: counts.last7DaysCount,
        icon: <Handshake className="h-5 w-5 text-green-500" />,
        color: "border-green-500/10",
        subtitle: formatBilingual("dashboard.last7Days"),
      },
    ]

    if (isAdmin()) {
      return [
        ...baseCards,
        {
          title: formatBilingual("dashboard.financialHelp"),
          value: counts.totalCounts.financial_help,
          icon: <Gift className="h-5 w-5 text-yellow-500" />,
          color: "border-yellow-500/10",
          subtitle: formatBilingual("dashboard.financialHelp"),
        },
        {
          title: formatBilingual("dashboard.marriageCongratulations"),
          value: counts.totalCounts.marriage_congratulations,
          icon: <Award className="h-5 w-5 text-purple-500" />,
          color: "border-purple-500/10",
          subtitle: formatBilingual("dashboard.marriageCongratulations"),
        },
        {
          title: formatBilingual("dashboard.disabilityCycle"),
          value: counts.totalCounts.disability_cycle,
          icon: <Bike className="h-5 w-5 text-blue-500" />,
          color: "border-blue-500/10",
          subtitle: formatBilingual("dashboard.disabilityCycle"),
        },
        {
          title: "Agent Registration",
          value: counts.totalCounts.agent_registration,
          icon: <UserPlus className="h-5 w-5 text-lime-500" />,
          color: "border-lime-500/10",
          subtitle: "Agent Registration",
        },
        {
          title: "Insurance Bima Application",
          value: counts.totalCounts.application_insurance,
          icon: <Shield className="h-5 w-5 text-indigo-500" />,
          color: "border-indigo-500/10",
          subtitle: "Insurance Bima Application",
        },
        {
          title: "Loan Application Payment",
          value: counts.totalCounts.loan_applications,
          icon: <Receipt className="h-5 w-5 text-orange-500" />,
          color: "border-orange-500/10",
          subtitle: "Loan Application Payment",
        },
        {
          title: "Marriage Sewing Machine",
          value: counts.totalCounts.marriage_sewing_machine,
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          color: "border-pink-500/10",
          subtitle: "Marriage Sewing Machine",
        },
        {
          title: "Pension Yojana Application Payment",
          value: counts.totalCounts.pension_yojana,
          icon: <BadgeCheck className="h-5 w-5 text-teal-500" />,
          color: "border-teal-500/10",
          subtitle: "Pension Yojana Application Payment",
        },
        {
          title: "Sewing Machine Camp",
          value: counts.totalCounts.sewing_machine_camp,
          icon: <Gauge className="h-5 w-5 text-pink-500" />,
          color: "border-pink-500/10",
          subtitle: "Sewing Machine Camp",
        },
        {
          title: "Insurance Bima Payment",
          value: counts.totalCounts.suraksha_bima_yojana,
          icon: <Shield className="h-5 w-5 text-blue-500" />,
          color: "border-blue-500/10",
          subtitle: "Insurance Bima Payment",
        },
      ]
    } else {
      const agentCards = [...baseCards]
      if (agentInfo?.permissions) {
        if (agentInfo.permissions.financial_help?.includes("view")) {
          agentCards.push({
            title: formatBilingual("dashboard.financialHelp"),
            value: counts.totalCounts.financial_help,
            icon: <Gift className="h-5 w-5 text-yellow-500" />,
            color: "border-yellow-500/10",
            subtitle: formatBilingual("dashboard.financialHelp"),
          })
        }
        if (agentInfo.permissions.applicant_registration?.includes("view")) {
          agentCards.push({
            title: formatBilingual("dashboard.generalApplications"),
            value: counts.totalCounts.applications,
            icon: <FileText className="h-5 w-5 text-gray-500" />,
            color: "border-gray-500/10",
            subtitle: formatBilingual("dashboard.generalApplications"),
          })
        }
        if (agentInfo.permissions.marriage_congratulations?.includes("view")) {
          agentCards.push({
            title: formatBilingual("dashboard.marriageCongratulations"),
            value: counts.totalCounts.marriage_congratulations,
            icon: <Award className="h-5 w-5 text-purple-500" />,
            color: "border-purple-500/10",
            subtitle: formatBilingual("dashboard.marriageCongratulations"),
          })
        }
        if (agentInfo.permissions.disability_cycle_distribution?.includes("view")) {
          agentCards.push({
            title: formatBilingual("dashboard.disabilityCycle"),
            value: counts.totalCounts.disability_cycle,
            icon: <Bike className="h-5 w-5 text-blue-500" />,
            color: "border-blue-500/10",
            subtitle: formatBilingual("dashboard.disabilityCycle"),
          })
        }
      }
      return agentCards
    }
  }

  const cards = getCardsForRole()

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{formatBilingual("common.dashboard")}</h2>
          <div className="text-sm text-muted-foreground">
            {isAgent() && agentInfo 
              ? `Welcome, ${agentInfo.name} (${agentInfo.employee_id})`
              : formatBilingual("login.subtitle")
            }
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAgent() && agentInfo && (
            <div className="text-right mr-4">
              <p className="text-sm text-muted-foreground">Agent: {agentInfo.name}</p>
              <p className="text-xs text-muted-foreground">ID: {agentInfo.employee_id}</p>
            </div>
          )}
          <Badge variant="outline" className="text-base px-4 py-2 flex items-center gap-2">
            {isAdmin() ? (
              <>
                <Shield className="h-4 w-4" />
                {formatBilingual("roles.adminPanel")}
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                {formatBilingual("roles.agentPanel")}
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card:any, idx) => (
          <Card key={idx} className={`shadow-lg border-2 ${card.color}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              {card?.progress !== undefined && (
                <Progress value={card?.progress} className="my-2" />
              )}
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
