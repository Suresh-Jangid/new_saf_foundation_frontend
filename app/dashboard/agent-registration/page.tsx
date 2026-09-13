"use client";

import { DataTable } from "@/components/data-table";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useCRUD } from "@/hooks/use-crud";
import { API_ENDPOINTS } from "@/lib/api";
import { APIService } from "@/lib/services";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RoleGuard } from "@/components/role-guard";

interface AgentRecord {
  id: string;
  date: string;
  employee_id: string;
  name: string;
  fatherName: string;
  gotra: string;
  age: string;
  village: string;
  address: string;
  tehsil: string;
  district: string;
  mobile: string;
  aadhaar: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  nomineeName: string;
  nomineeMobile: string;
  nomineeRelation: string;
  workArea: string;
  gender: string;
  doj: string;
  designation: string;
  profile_image?: string;
  senior_name?: string;
  seniorName?: string;
  senior_code?: string;
  seniorCode?: string;
  seniorId?: string;
  senior_id?: string;
  level?: string | number;
  parent_agent_id?: string;
  parentAgentId?: string;
  parentEmployeeId?: string;
  parent_employee_id?: string;
  parentName?: string;
  parent_name?: string;
  senior_employee_id?: string;
  seniorEmployeeId?: string;
  senior?: { name?: string; employee_id?: string };
  agentProfile?: any;
  agent_profile?: any;
  createdAt: string;
}

// Define columns for the DataTable with 2-level hierarchy display
const columns = [
  { 
    key: "employee_id", 
    label: "एजेंट कोड / Agent Code",
    render: (_: any, record: AgentRecord) => {
      const code = record.employee_id || record.agentProfile?.employeeId || record.agent_profile?.employee_id || (record as any).employeeId || "-";
      return <span className="font-semibold text-gray-900">{code}</span>;
    }
  },
  { 
    key: "name", 
    label: "नाम / Name",
    render: (_: any, record: AgentRecord) => {
      return <span>{record.name || "-"}</span>;
    }
  },
  {
    key: "level",
    label: "स्तर / Level",
    render: (_: any, record: AgentRecord) => {
      const rawLevel = String(
        record.level ||
        record.agentProfile?.level ||
        record.agent_profile?.level ||
        (record as any).hierarchy?.level ||
        ""
      ).toUpperCase();
      const hasParent = Boolean(
        record.parentAgentId ||
        record.parent_agent_id ||
        record.seniorId ||
        record.senior_id ||
        record.parentEmployeeId ||
        record.agentProfile?.parentAgentId ||
        record.agent_profile?.parent_agent_id ||
        (record.seniorCode && record.seniorCode !== "ADMIN") ||
        (record.senior_code && record.senior_code !== "ADMIN") ||
        (record.agentProfile?.seniorCode && record.agentProfile?.seniorCode !== "ADMIN") ||
        (record.seniorName && record.seniorName !== "Super Admin")
      );
      const isLevel2 =
        rawLevel === "LEVEL_2" ||
        rawLevel === "LEVEL-2" ||
        rawLevel === "2" ||
        (rawLevel !== "LEVEL_1" && rawLevel !== "LEVEL-1" && hasParent);
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
            isLevel2
              ? "bg-purple-100 text-purple-800 border border-purple-200"
              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
          }`}
        >
          {isLevel2 ? "LEVEL-2" : "LEVEL-1"}
        </span>
      );
    },
  },
  {
    key: "senior_name",
    label: "सीनियर / Senior",
    render: (_: any, record: AgentRecord) => {
      const rawLevel = String(
        record.level ||
        record.agentProfile?.level ||
        record.agent_profile?.level ||
        (record as any).hierarchy?.level ||
        ""
      ).toUpperCase();
      const hasParent = Boolean(
        record.parentAgentId ||
        record.parent_agent_id ||
        record.seniorId ||
        record.senior_id ||
        record.parentEmployeeId ||
        record.agentProfile?.parentAgentId ||
        record.agent_profile?.parent_agent_id ||
        (record.seniorCode && record.seniorCode !== "ADMIN") ||
        (record.senior_code && record.senior_code !== "ADMIN") ||
        (record.agentProfile?.seniorCode && record.agentProfile?.seniorCode !== "ADMIN") ||
        (record.seniorName && record.seniorName !== "Super Admin")
      );
      const isLevel2 =
        rawLevel === "LEVEL_2" ||
        rawLevel === "LEVEL-2" ||
        rawLevel === "2" ||
        (rawLevel !== "LEVEL_1" && rawLevel !== "LEVEL-1" && hasParent);

      const seniorName =
        record.seniorName ||
        record.senior_name ||
        (record as any).parentName ||
        record.agentProfile?.seniorName ||
        record.agent_profile?.senior_name ||
        (record as any).hierarchy?.seniorName ||
        record.senior?.name ||
        (isLevel2 ? "-" : "Super Admin");
      return <span className="font-medium text-gray-800">{seniorName}</span>;
    },
  },
  {
    key: "senior_code",
    label: "सीनियर कोड / Senior Code",
    render: (_: any, record: AgentRecord) => {
      const rawLevel = String(
        record.level ||
        record.agentProfile?.level ||
        record.agent_profile?.level ||
        (record as any).hierarchy?.level ||
        ""
      ).toUpperCase();
      const hasParent = Boolean(
        record.parentAgentId ||
        record.parent_agent_id ||
        record.seniorId ||
        record.senior_id ||
        record.parentEmployeeId ||
        record.agentProfile?.parentAgentId ||
        record.agent_profile?.parent_agent_id ||
        (record.seniorCode && record.seniorCode !== "ADMIN") ||
        (record.senior_code && record.senior_code !== "ADMIN") ||
        (record.agentProfile?.seniorCode && record.agentProfile?.seniorCode !== "ADMIN") ||
        (record.seniorName && record.seniorName !== "Super Admin")
      );
      const isLevel2 =
        rawLevel === "LEVEL_2" ||
        rawLevel === "LEVEL-2" ||
        rawLevel === "2" ||
        (rawLevel !== "LEVEL_1" && rawLevel !== "LEVEL-1" && hasParent);

      const seniorCode =
        record.seniorCode ||
        record.senior_code ||
        (record as any).parentEmployeeId ||
        record.agentProfile?.seniorCode ||
        record.agent_profile?.senior_code ||
        (record as any).hierarchy?.seniorCode ||
        record.senior?.employee_id ||
        (isLevel2 ? "-" : "ADMIN");
      return (
        <span className="font-mono text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border">
          {seniorCode}
        </span>
      );
    },
  },
  { 
    key: "fatherName", 
    label: "पिता / Father",
    render: (_: any, record: AgentRecord) => {
      return <span>{record.fatherName || record.agentProfile?.fatherName || record.agent_profile?.father_name || "-"}</span>;
    }
  },
  { 
    key: "gotra", 
    label: "गोत्र / Gotra",
    render: (_: any, record: AgentRecord) => {
      return <span>{record.gotra || record.agentProfile?.gotra || record.agent_profile?.gotra || "-"}</span>;
    }
  },
  { 
    key: "age", 
    label: "आयु / Age",
    render: (_: any, record: AgentRecord) => {
      return <span>{record.age || record.agentProfile?.age || record.agent_profile?.age || "-"}</span>;
    }
  },
  { 
    key: "village", 
    label: "गांव / Village",
    render: (_: any, record: AgentRecord) => {
      return <span>{record.village || record.agentProfile?.village || record.agent_profile?.village || "-"}</span>;
    }
  },
  { 
    key: "mobile", 
    label: "मोबाइल / Mobile",
    render: (_: any, record: AgentRecord) => {
      return <span>{record.mobile || record.agentProfile?.mobile || record.agent_profile?.mobile || "-"}</span>;
    }
  },
  { 
    key: "district", 
    label: "जिला / District",
    render: (_: any, record: AgentRecord) => {
      return <span>{record.district || record.agentProfile?.district || record.agent_profile?.district || "-"}</span>;
    }
  },
  { 
    key: "workArea", 
    label: "कार्य क्षेत्र / Work Area",
    render: (_: any, record: AgentRecord) => {
      return <span>{record.workArea || record.agentProfile?.workArea || record.agent_profile?.work_area || "-"}</span>;
    }
  },
];

export default function AgentRegistrationList() {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [currentGenderFilter, setCurrentGenderFilter] = useState<string>("all");
  const [currentVillageFilter, setCurrentVillageFilter] = useState<string>("all");

  const {
    records: agents,
    loading,
    readApi,
    deleteApi,
  } = useCRUD<AgentRecord>("agentRecords", [], {
    create: API_ENDPOINTS.CREATE_AGENT,
    read: "/v1/agents",
    update: API_ENDPOINTS.UPDATE_AGENT,
    delete: API_ENDPOINTS.DELETE_AGENT,
  });

  // Get unique villages for filter dropdown
  const uniqueVillages = Array.from(new Set(agents.map(agent => agent.village).filter(Boolean))).sort();

  // Apply filters whenever they change
  useEffect(() => {
    console.log('[AgentRegistration] Filter effect running:', { currentGenderFilter, currentVillageFilter });
    
    const activeFilters: Record<string, any> = {};
    
    if (currentGenderFilter !== "all") {
      activeFilters.gender = currentGenderFilter;
    }
    
    if (currentVillageFilter !== "all") {
      activeFilters.village = currentVillageFilter;
    }
    
    // Call readApi directly instead of through fetchAgents
    const applyFilters = async () => {
      try {
        console.log('[AgentRegistration] Applying filters:', activeFilters);
        await readApi(Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
      } catch (error) {
        console.error("Error fetching agents:", error);
        toast.error("Failed to fetch agents from server");
      }
    };
    
    applyFilters();
  }, [currentGenderFilter, currentVillageFilter]); // Removed readApi dependency

  const fetchAgents = useCallback(async (filters?: Record<string, any>) => {
    try {
      await readApi(filters);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  }, [readApi]);

  // Handle gender filter change
  const handleGenderFilterChange = (gender: string) => {
    setCurrentGenderFilter(gender);
  };

  // Handle village filter change
  const handleVillageFilterChange = (village: string) => {
    setCurrentVillageFilter(village);
  };

  // Handle delete action
  const handleDelete = (id: string) => {
    setRecordToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      await deleteApi(recordToDelete);
    } catch (error) {
      console.error("Error deleting agent:", error);
    } finally {
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };



  const handleGeneratePDF = async (record: AgentRecord) => {
    try {
      // Prepare data with DOJ and designation for ID card generation
      const idCardData = {
        ...record,
        doj: record.doj || '',
        designation: record.designation || ''
      };
      
      // Generate PDF using the service with profile image if available
      const pdfBlob = await APIService.generateAgentPDF(idCardData, record.profile_image);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent_id_card_${record.employee_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Agent ID Card PDF generated successfully');
    } catch (error) {
      console.error('Error generating agent PDF:', error);
      toast.error('Failed to generate agent PDF');
    }
  };

  const handleGenerateApplicationFormPDF = async (record: AgentRecord) => {
    try {
      // Prepare data for application form generation
      const applicationFormData = {
        ...record,
        employee_id: record.employee_id || '',
        doj: record.doj || '',
        designation: record.designation || ''
      };
      
      // Generate PDF using the service with profile image if available
      const pdfBlob = await APIService.generateAgentApplicationFormPDF(applicationFormData, record.profile_image);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent_application_form_${record.employee_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Agent Application Form PDF generated successfully');
    } catch (error) {
      console.error('Error generating agent application form PDF:', error);
      toast.error('Failed to generate agent application form PDF');
    }
  };

  const handleGenerateAdikartFormPDF = async (record: AgentRecord) => {
    try {
      // Prepare data for adikart form generation
      const adikartFormData = {
        ...record,
        employee_id: record.employee_id || '',
        doj: record.doj || '',
        designation: record.designation || ''
      };
      
      // Generate PDF using the service with profile image if available
      const pdfBlob = await APIService.generateAgentAdikartFormPDF(adikartFormData, record.profile_image);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent_adikart_form_${record.employee_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Agent Adikart Form PDF generated successfully');
    } catch (error) {
      console.error('Error generating agent adikart form PDF:', error);
      toast.error('Failed to generate agent adikart form PDF');
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading agents...</div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requiredModule="agent_registration" requiredAction="view">
      <>
        <DataTable
          data={agents}
          columns={columns}
          title="एजेंट सूची"
          subtitle="Agent Registration List"
          addNewUrl="/dashboard/agent-registration/add"
          addNewLabel="नया एजेंट जोड़ें / Add New Agent"
          onDelete={handleDelete}
          onGeneratePDFForm={handleGeneratePDF}
          onGenerateApplicationForm={handleGenerateApplicationFormPDF}
          onGenerateAdikartForm={handleGenerateAdikartFormPDF}
          editUrlPattern="/dashboard/agent-registration/edit/[id]"
          searchFields={["employee_id", "name", "fatherName", "village", "mobile"]}
          itemsPerPage={10}
          showGenderFilter={true}
          genderField="gender"
          onGenderFilterChange={handleGenderFilterChange}
          currentGenderFilter={currentGenderFilter}
          showAddressFilter={true}
          addressField="village"
          onAddressFilterChange={handleVillageFilterChange}
          currentAddressFilter={currentVillageFilter}
          uniqueAddresses={uniqueVillages}
          module="agent_registration"
          pdfFormButtonLabel="Generate ID Card"
          pdfFormButtonTooltip="Generate Agent ID Card"
          applicationFormButtonLabel="Application Form"
          applicationFormButtonTooltip="Generate Agent Application Form"
          adikartFormButtonLabel="Adikart Form"
          adikartFormButtonTooltip="Generate Agent Adikart Form"
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>एजेंट हटाएं</AlertDialogTitle>
              <AlertDialogDescription>
                क्या आप इस एजेंट को हटाना चाहते हैं?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>रद्द करें</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>हाँ</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </RoleGuard>
  );
}
