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
  createdAt: string;
}

// Define columns for the DataTable
const columns = [
  { key: "employee_id", label: "एजेंट कोड / Agent Code" },
  { key: "employee_id", label: "कर्मचारी आईडी" },
  { key: "name", label: "नाम" },
  { key: "fatherName", label: "पिता" },
  { key: "gotra", label: "गोत्र" },
  { key: "age", label: "आयु" },
  { key: "village", label: "गांव" },
  { key: "mobile", label: "मोबाइल" },
  { key: "district", label: "जिला" },
  { key: "workArea", label: "कार्य क्षेत्र" },
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
    read: API_ENDPOINTS.GET_AGENTS,
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
