"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBilingual } from "@/lib/translations"
import { cn } from "@/lib/utils"
import {
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
  UserCheck,
  HeartHandshake,
  Home,
  Sparkles,
  KeyRound,
  FileBarChart,
  BriefcaseBusiness,
  Wallet,
  Scissors,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getUserRole, getAgentData, isAdmin, isAgent, hasModulePermission } from "@/lib/permissions"
import { Progress } from "@radix-ui/react-progress"
import { dashboardAPI, syncAuthSession } from "@/lib/api"
import { DhundhotsavService } from "@/lib/dhundhotsav-service"
import { JanniDeliveryService } from "@/lib/janni-delivery-service"
import { LadoBahinService } from "@/lib/lado-bahin-service"
import { ShubhLaxmiService } from "@/lib/shubh-laxmi-service"
import { AawasService } from "@/lib/aawas-service"
import { EpinService } from "@/lib/epin-service"

export default function DashboardPage() {
  const [, setUserRole] = useState<string>("admin")
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
      mayra_registration: 0,
      mayra_congratulations: 0,
      janni_delivery: 0,
      janni_congress_payment: 0,
      aawas_home: 0,
      lado_bahin: 0,
      dhundhotsav: 0,
      shubh_laxmi: 0,
      epin_management: 0,
      agent_commission: 0,
      agent_commission_report: 0,
      bulk_marriage_emi: 0,
      bulk_suraksha_bima_emi: 0,
      bulk_mayra_emi: 0,
      payment_management: 0,
    },
    last7DaysCount: 0,
  })

  useEffect(() => {
    // Determine role and agent info from localStorage
    const role = getUserRole()
    const userData = typeof window !== "undefined" ? localStorage.getItem("user") : null
    const agentData = getAgentData()

    let actualRole = role
    if (agentData) {
      actualRole = "agent"
      setAgentInfo(agentData)
    } else if (userData) {
      actualRole = "admin"
    }
    setUserRole(actualRole)

    // Fetch dashboard counts from API and active slot services concurrently
    const fetchCounts = async () => {
      try {
        syncAuthSession()

        // Concurrent fetch: centralized dashboard stats + individual slot counts
        const [dashRes, dhundhRes, janniRes, ladoRes, shubhRes, aawasRes, epinRes] =
          await Promise.allSettled([
            dashboardAPI.getCounts(),
            DhundhotsavService.getAllRegistrations({ limit: 1 }),
            JanniDeliveryService.getAllRegistrations({ limit: 1 }),
            LadoBahinService.getAllRegistrations({ limit: 1 }),
            ShubhLaxmiService.getAllRegistrations({ limit: 1 }),
            AawasService.getAllRegistrations({ limit: 1 }),
            EpinService.getInventory({ limit: 1 }),
          ])

        let apiCounts: any = {}
        let last7Days = 0

        if (dashRes.status === "fulfilled") {
          const data = dashRes.value
          if ((data?.success || data?.status) && data?.dashboard) {
            apiCounts = data.dashboard.total_counts || {}
            last7Days = data.dashboard.last_7_days_count ?? 0
          }
        }

        const dhundhCount =
          dhundhRes.status === "fulfilled"
            ? (dhundhRes.value?.pagination?.total ?? (Array.isArray(dhundhRes.value?.data) ? dhundhRes.value.data.length : 0))
            : 0

        const janniCount =
          janniRes.status === "fulfilled"
            ? (janniRes.value?.pagination?.total ?? (Array.isArray(janniRes.value?.data) ? janniRes.value.data.length : 0))
            : 0

        const ladoCount =
          ladoRes.status === "fulfilled"
            ? (ladoRes.value?.pagination?.total ?? (Array.isArray(ladoRes.value?.data) ? ladoRes.value.data.length : 0))
            : 0

        const shubhCount =
          shubhRes.status === "fulfilled"
            ? (shubhRes.value?.pagination?.total ?? (Array.isArray(shubhRes.value?.data) ? shubhRes.value.data.length : 0))
            : 0

        const aawasCount =
          aawasRes.status === "fulfilled"
            ? (aawasRes.value?.pagination?.total ?? (Array.isArray(aawasRes.value?.data) ? aawasRes.value.data.length : 0))
            : 0

        const epinCount =
          epinRes.status === "fulfilled"
            ? (epinRes.value?.summary?.total ?? epinRes.value?.totalCount ?? (Array.isArray(epinRes.value?.data) ? epinRes.value.data.length : 0))
            : 0

        setCounts({
          totalCounts: {
            agent_registration: apiCounts.agent_registration ?? 0,
            applications: apiCounts.applications ?? 0,
            application_insurance: apiCounts.application_insurance ?? 0,
            disability_cycle: apiCounts.disability_cycle ?? 0,
            financial_help: apiCounts.financial_help ?? 0,
            loan_applications: apiCounts.loan_applications ?? 0,
            marriage_congratulations: apiCounts.marriage_congratulations ?? 0,
            marriage_sewing_machine: apiCounts.marriage_sewing_machine ?? 0,
            pension_yojana: apiCounts.pension_yojana ?? 0,
            sewing_machine_camp: apiCounts.sewing_machine_camp ?? 0,
            suraksha_bima_yojana: apiCounts.suraksha_bima_yojana ?? 0,
            mayra_registration: apiCounts.mayra_registration ?? 0,
            mayra_congratulations: apiCounts.mayra_congratulations ?? apiCounts.marriage_congratulations ?? 0,
            janni_delivery: janniCount,
            janni_congress_payment: janniCount,
            aawas_home: aawasCount,
            lado_bahin: ladoCount,
            dhundhotsav: dhundhCount,
            shubh_laxmi: shubhCount,
            epin_management: epinCount,
            agent_commission: apiCounts.agent_commission ?? 0,
            agent_commission_report: apiCounts.agent_commission_report ?? 0,
            bulk_marriage_emi: apiCounts.bulk_marriage_emi ?? 0,
            bulk_suraksha_bima_emi: apiCounts.bulk_suraksha_bima_emi ?? 0,
            bulk_mayra_emi: apiCounts.bulk_mayra_emi ?? 0,
            payment_management: apiCounts.payment_management ?? 0,
          },
          last7DaysCount: last7Days,
        })
      } catch (_e) {
        // Ignore network errors; counts stay at zero
      }
    }

    fetchCounts()
  }, [])

  // Check whether current user (Admin or Agent) has permission to view this card
  const canViewCard = (permissionKey?: string): boolean => {
    if (isAdmin()) return true
    if (!permissionKey || permissionKey === "dashboard") return true
    if (permissionKey === "agent_permission" || permissionKey === "system_settings") return false
    if (!agentInfo?.permissions) return hasModulePermission(permissionKey, "view")
    return agentInfo.permissions[permissionKey]?.includes("view") || hasModulePermission(permissionKey, "view")
  }

  // Define the complete list of cards with authentic counts, bilingual titles, and routes
  const getAllCards = () => {
    return [
      // 1. Existing Base Cards
      {
        id: "applicant_registration",
        title: formatBilingual("dashboard.generalApplications"),
        value: counts.totalCounts.applications,
        icon: <FileText className="h-5 w-5 text-primary" />,
        color: "border-primary/10",
        subtitle: formatBilingual("dashboard.generalApplications"),
        route: "/dashboard/general-applications",
        permissionKey: "applicant_registration",
      },
      {
        id: "recent_applications",
        title: formatBilingual("dashboard.recentApplications"),
        value: counts.last7DaysCount,
        icon: <Handshake className="h-5 w-5 text-green-500" />,
        color: "border-green-500/10",
        subtitle: formatBilingual("dashboard.last7Days"),
        route: "/dashboard/general-applications",
        permissionKey: "dashboard",
      },
      {
        id: "financial_help",
        title: formatBilingual("dashboard.financialHelp"),
        value: counts.totalCounts.financial_help,
        icon: <Gift className="h-5 w-5 text-yellow-500" />,
        color: "border-yellow-500/10",
        subtitle: formatBilingual("dashboard.financialHelp"),
        route: "/dashboard/financal-help",
        permissionKey: "financial_help",
      },
      {
        id: "marriage_congratulations",
        title: formatBilingual("dashboard.marriageCongratulations"),
        value: counts.totalCounts.marriage_congratulations,
        icon: <Award className="h-5 w-5 text-purple-500" />,
        color: "border-purple-500/10",
        subtitle: formatBilingual("dashboard.marriageCongratulations"),
        route: "/dashboard/marriage-congratulations",
        permissionKey: "marriage_congratulations",
      },
      {
        id: "disability_cycle_distribution",
        title: formatBilingual("dashboard.disabilityCycle"),
        value: counts.totalCounts.disability_cycle,
        icon: <Bike className="h-5 w-5 text-blue-500" />,
        color: "border-blue-500/10",
        subtitle: formatBilingual("dashboard.disabilityCycle"),
        route: "/dashboard/disability-cycle",
        permissionKey: "disability_cycle_distribution",
      },
      {
        id: "agent_registration",
        title: "एजेंट आवेदन / Agent Registration",
        value: counts.totalCounts.agent_registration,
        icon: <UserPlus className="h-5 w-5 text-lime-500" />,
        color: "border-lime-500/10",
        subtitle: "एजेंट पंजीकरण / Agent Registration",
        route: "/dashboard/agent-registration",
        permissionKey: "agent_registration",
      },
      {
        id: "security_application",
        title: "सुरक्षा बीमा हेतु सामान्य आवेदन / Insurance Bima Application",
        value: counts.totalCounts.application_insurance,
        icon: <Shield className="h-5 w-5 text-indigo-500" />,
        color: "border-indigo-500/10",
        subtitle: "सुरक्षा बीमा आवेदन / Insurance Bima Application",
        route: "/dashboard/general-applications-insurance",
        permissionKey: "security_application",
      },
      {
        id: "balika_loan_application",
        title: "बालिका ऋण आवेदन / Balika Loan Application",
        value: counts.totalCounts.loan_applications,
        icon: <Receipt className="h-5 w-5 text-orange-500" />,
        color: "border-orange-500/10",
        subtitle: "बालिका ऋण आवेदन फॉर्म / Loan Application Payment",
        route: "/dashboard/loan-application",
        permissionKey: "balika_loan_application",
      },
      {
        id: "marriage_sewing_machine_distribution",
        title: "विवाह सिलाई मशीन वितरण / Marriage Sewing Machine",
        value: counts.totalCounts.marriage_sewing_machine,
        icon: <Gauge className="h-5 w-5 text-pink-500" />,
        color: "border-pink-500/10",
        subtitle: "सिलाई मशीन वितरण / Marriage Sewing Machine",
        route: "/dashboard/marriage-congratulations/sewing-machine-distribution",
        permissionKey: "marriage_sewing_machine_distribution",
      },
      {
        id: "salakar_pension_yojana",
        title: "सहलाकर पेंशन योजना / Pension Yojana Application Payment",
        value: counts.totalCounts.pension_yojana,
        icon: <BadgeCheck className="h-5 w-5 text-teal-500" />,
        color: "border-teal-500/10",
        subtitle: "पेंशन योजना आवेदन / Pension Yojana Payment",
        route: "/dashboard/pension-yojana",
        permissionKey: "salakar_pension_yojana",
      },
      {
        id: "sewing_machine_camp",
        title: "निशुल्क सिलाई मशीन शिविर / Sewing Machine Camp",
        value: counts.totalCounts.sewing_machine_camp,
        icon: <Scissors className="h-5 w-5 text-pink-500" />,
        color: "border-pink-500/10",
        subtitle: "सिलाई मशीन शिविर कैम्प / Sewing Machine Camp",
        route: "/dashboard/sewing-machine",
        permissionKey: "sewing_machine_camp",
      },
      {
        id: "suraksha_bima_yojana",
        title: "सुरक्षा बीमा योजना / Insurance Bima Payment",
        value: counts.totalCounts.suraksha_bima_yojana,
        icon: <Wallet className="h-5 w-5 text-blue-500" />,
        color: "border-blue-500/10",
        subtitle: "सुरक्षा बीमा किस्त भुगतान / Insurance Bima Payment",
        route: "/dashboard/suraksha-bima-yojana",
        permissionKey: "suraksha_bima_yojana",
      },

      // 2. Additional Active Scheme / Yojana Modules
      {
        id: "mayra_registration",
        title: "मायरा फॉर्म आवेदन पत्र / Mayra General Application",
        value: counts.totalCounts.mayra_registration,
        icon: <FileText className="h-5 w-5 text-amber-500" />,
        color: "border-amber-500/10",
        subtitle: "मायरा सामान्य आवेदन / Mayra Registration",
        route: "/dashboard/mayra-registration",
        permissionKey: "mayra_registration",
      },
      {
        id: "mayra_congratulations",
        title: "मायरा बधाई पत्र / Mayra Congratulation Payment",
        value: counts.totalCounts.mayra_congratulations,
        icon: <Gift className="h-5 w-5 text-rose-500" />,
        color: "border-rose-500/10",
        subtitle: "मायरा विवाह बधाई पत्र / Mayra Congratulation",
        route: "/dashboard/mayra-congratulations",
        permissionKey: "mayra_registration",
      },
      {
        id: "janni_delivery",
        title: "जननी प्रसूति पंजीकरण / Janni Delivery Registration",
        value: counts.totalCounts.janni_delivery,
        icon: <HeartHandshake className="h-5 w-5 text-red-500" />,
        color: "border-red-500/10",
        subtitle: "जननी प्रसूति आवेदन / Janni Delivery Application",
        route: "/dashboard/janni-delivery",
        permissionKey: "janni_delivery",
      },
      {
        id: "janni_congress_payment",
        title: "जननी प्रसूति बधाई पत्र / Janni Congress Payment",
        value: counts.totalCounts.janni_congress_payment,
        icon: <Gift className="h-5 w-5 text-pink-500" />,
        color: "border-pink-500/10",
        subtitle: "जननी प्रसूति सहायता भुगतान / Janni Congress Payment",
        route: "/dashboard/janni-delivery/congress-payment",
        permissionKey: "janni_delivery",
      },
      {
        id: "aawas_home",
        title: "आवास योजना पंजीकरण / Aawas (Home) Registration",
        value: counts.totalCounts.aawas_home,
        icon: <Home className="h-5 w-5 text-sky-500" />,
        color: "border-sky-500/10",
        subtitle: "गृह प्रवेश आवास योजना / Aawas Registration",
        route: "/dashboard/aawas",
        permissionKey: "aawas_home",
      },
      {
        id: "lado_bahin",
        title: "लाडो बहिन पंजीकरण / Lado Bahin Registration",
        value: counts.totalCounts.lado_bahin,
        icon: <Sparkles className="h-5 w-5 text-violet-500" />,
        color: "border-violet-500/10",
        subtitle: "लाडो बहिन आवेदन / Lado Bahin Application",
        route: "/dashboard/lado-bahin",
        permissionKey: "lado_bahin",
      },
      {
        id: "dhundhotsav",
        title: "ढूंढोत्सव पंजीकरण / Dhundhotsav Registration",
        value: counts.totalCounts.dhundhotsav,
        icon: <Gift className="h-5 w-5 text-orange-500" />,
        color: "border-orange-500/10",
        subtitle: "ढूंढोत्सव आवेदन / Dhundhotsav Application",
        route: "/dashboard/dhundhotsav",
        permissionKey: "dhundhotsav",
      },
      {
        id: "shubh_laxmi",
        title: "शुभलक्ष्मी पंजीकरण / ShubhLaxmi Registration",
        value: counts.totalCounts.shubh_laxmi,
        icon: <Sparkles className="h-5 w-5 text-emerald-500" />,
        color: "border-emerald-500/10",
        subtitle: "शुभलक्ष्मी आवेदन / ShubhLaxmi Application",
        route: "/dashboard/shubh-laxmi",
        permissionKey: "shubh_laxmi",
      },
      {
        id: "epin_management",
        title: "ई-पिन प्रबंधन / E-PIN Management",
        value: counts.totalCounts.epin_management,
        icon: <KeyRound className="h-5 w-5 text-cyan-500" />,
        color: "border-cyan-500/10",
        subtitle: "ई-पिन आवंटन व रिकॉर्ड / E-PIN Inventory",
        route: "/dashboard/epin-management",
        permissionKey: "epin_management",
      },

      // 3. Financial, Bulk EMI & Management Modules
      {
        id: "agent_commission",
        title: "एजेंट कमिशन भुगतान / Agent Commission Payment",
        value: counts.totalCounts.agent_commission,
        icon: <FileBarChart className="h-5 w-5 text-teal-500" />,
        color: "border-teal-500/10",
        subtitle: "एजेंट कमिशन का भुगतान करे / Commission Payment",
        route: "/dashboard/agent-commission",
        permissionKey: "agent_commission",
      },
      {
        id: "agent_commission_report",
        title: "एजेंट कमिशन रिपोर्ट / Agent Commission Report",
        value: counts.totalCounts.agent_commission_report,
        icon: <FileBarChart className="h-5 w-5 text-blue-500" />,
        color: "border-blue-500/10",
        subtitle: "एजेंट कमिशन रिपोर्ट / Commission Summary Report",
        route: "/dashboard/agent-commission-report",
        permissionKey: "agent_commission_report",
      },
      {
        id: "bulk_marriage_emi",
        title: "बल्क विवाह ईएमआई / Bulk Marriage EMI",
        value: counts.totalCounts.bulk_marriage_emi,
        icon: <Receipt className="h-5 w-5 text-indigo-500" />,
        color: "border-indigo-500/10",
        subtitle: "बल्क विवाह ईएमआई प्रबंधन / Bulk Marriage EMI",
        route: "/dashboard/bulk-marriage-emi",
        permissionKey: "bulk_marriage_emi",
      },
      {
        id: "bulk_suraksha_bima_emi",
        title: "बल्क सुरक्षा बीमा ईएमआई / Bulk Insurance Bima EMI",
        value: counts.totalCounts.bulk_suraksha_bima_emi,
        icon: <Shield className="h-5 w-5 text-blue-600" />,
        color: "border-blue-600/10",
        subtitle: "बल्क सुरक्षा बीमा ईएमआई / Bulk Insurance EMI",
        route: "/dashboard/bulk-suraksha-bima-emi",
        permissionKey: "bulk_suraksha_bima_emi",
      },
      {
        id: "bulk_mayra_emi",
        title: "बल्क मायरा ईएमआई / Bulk Mayra EMI",
        value: counts.totalCounts.bulk_mayra_emi,
        icon: <Receipt className="h-5 w-5 text-amber-600" />,
        color: "border-amber-600/10",
        subtitle: "बल्क मायरा ईएमआई प्रबंधन / Bulk Mayra EMI",
        route: "/dashboard/bulk-mayra-emi",
        permissionKey: "bulk_mayra_emi",
      },
      {
        id: "payment_management",
        title: "भुगतान प्रबंधन / Payment Management",
        value: counts.totalCounts.payment_management,
        icon: <BriefcaseBusiness className="h-5 w-5 text-emerald-600" />,
        color: "border-emerald-600/10",
        subtitle: "संपूर्ण भुगतान प्रबंधन / Payment Management",
        route: "/dashboard/payment-management",
        permissionKey: "payment_management",
      },
    ]
  }

  const cards = getAllCards().filter((card) => canViewCard(card.permissionKey))

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{formatBilingual("common.dashboard")}</h2>
          <div className="text-sm text-muted-foreground">
            {isAgent() && agentInfo
              ? `Welcome, ${agentInfo.name} (${agentInfo.employee_id})`
              : formatBilingual("login.subtitle")}
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
        {cards.map((card: any, idx) => {
          const cardContent = (
            <Card
              className={cn(
                "shadow-lg border-2 h-full transition-all duration-200",
                card.color,
                card.route && "cursor-pointer hover:shadow-xl hover:border-primary/40 hover:-translate-y-0.5"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                {card?.progress !== undefined && (
                  <Progress value={card?.progress} className="my-2" />
                )}
                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
              </CardContent>
            </Card>
          )

          if (card.route) {
            return (
              <Link key={idx} href={card.route} className="block no-underline">
                {cardContent}
              </Link>
            )
          }

          return <div key={idx}>{cardContent}</div>
        })}
      </div>
    </div>
  )
}
