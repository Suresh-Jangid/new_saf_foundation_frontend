import { 
  authAPI, 
  generalApplicationsAPI, 
  insuranceApplicationsAPI, 
  loanApplicationsAPI, 
  financialHelpAPI, 
  financialHelpInstallmentsAPI,
  disabilityCycleAPI, 
  agentRegistrationAPI, 
  marriageCongratulationsAPI, 
  marriageSewingMachineAPI, 
  pensionYojanaAPI, 
  sewingMachineCampAPI, 
  surakshaBimaYojanaAPI, 
  paymentManagementAPI, 
  marriageDetailsAPI,
  applicationInstallmentsAPI,
  ApiResponse,
  insuranceApplicationInstallmentsAPI,
  mayraCongratsAPI,
  mayraApplicationAPI,
  mayraInstallmentAPI,
  mayraOtherAPI,
  janniDeliveryAPI,
  post
} from './api';

// Type definitions for all entities
export interface GeneralApplication {
  sr_no :string;
  id?: string;
  formNumber: string;
  applicationDate: string;
  applicantName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  aadharNumber: string;
  gotra: string;
  mobile: string;
  address: string;
  pinCode: string;
  tehsil: string;
  district: string;
  state: string;
  nomineeName: string;
  nomineeRelation: string;
  workerName: string;
  workerMobile: string;
  affidavit: string;
  passportPhoto?: File | string;
  gender: string;
  category: string;
  paymentAmount: string;
  paymentMode: string;
  paymentDate: string;
  totalAmount?: number;
  pendingAmount?: number;
}

export interface InsuranceApplication {
  sr_no? :string;
  id?: string;
  formNumber?: string;
  applicationDate: string;
  applicantName: string;
  fatherName: string;
  wifeName: string;
  motherName: string;
  dateOfBirth: string;
  aadharNumber: string;
  gotra: string;
  mobile: string;
  address: string;
  pinCode: string;
  tehsil: string;
  district: string;
  state: string;
  nomineeName: string;
  nomineeRelation: string;
  affidavit: string;
  passportPhoto?: File | string;
  gender: string;
  category: string;
  paymentAmount: string;
  paymentMode: string;
  paymentDate: string;
  totalAmount?: string;
  pendingAmount?: string;
  is_paid?: number;
  payment_status?: number;
  addedby?: string;
  addedby_id?: string | number;
  selectedAgentId?: string;
  created_at?: string;
  age?: number;
  is_active?: number;
}

export interface LoanApplication {
  id?: string;
  date: string;
  applicantName: string;
  fatherName: string;
  motherName: string;
  address: string;
  reason: string;
  aadhaar?: File | string;
  incomeCertificate?: File | string;
  moolNiwas?: File | string;
  photo?: File | string;
}

export interface FinancialHelp {
  id?: string;
  formNumber?: string;
  date: string;
  name: string;
  gender: string;
  fatherName: string;
  address: string;
  district: string;
  village: string;
  tehsil: string;
  phone: string;
  donatedAmount: string;
}

export interface DisabilityCycle {
  id?: string;
  formNumber: string;
  applicationDate: string;
  applicantName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  aadharNumber: string;
  gotra: string;
  age: number;
  mobile: string;
  address: string;
  pinCode: string;
  tehsil: string;
  district: string;
  state: string;
}

export interface AgentRegistration {
  id?: string;
  date: string;
  employee_id: string;
  name: string;
  fatherName: string;
  gotra: string;
  age: number;
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
}

export interface MarriageCongratulations {
  id?: string;
  date: string;
  codeNumber: string;
  marriageNumber: string;
  applicantName: string;
  fatherName: string;
  wifeOf: string;
  gotra: string;
  address: string;
  membershipJoinDate: string;
  associatedUntil: string;
  permanentFee: number;
  installmentAmount: number;
  totalGrantAmount: number;
  totalMembersServing: number;
  rate100: number;
  rate200: number;
  rate300: number;
  deductionPercent: number;
  deductedAmount: number;
  totalPaidAmount: number;
  gender: string;
}

export interface MarriageSewingMachine {
  id?: string;
  marriageNumber: string;
  formNumber: string;
  applicationDate: string;
  applicantName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  aadharNumber: string;
  gotra: string;
  age: number;
  mobile: string;
  address: string;
  pinCode: string;
  tehsil: string;
  district: string;
  state: string;
  gender: string;
}

export interface PensionYojana {
  id?: string;
  date: string;
  name: string;
  fatherName: string;
  gotra: string;
  age: number;
  gender: string;
  village: string;
  tehsil: string;
  district: string;
  mobile: string;
  photo?: File | string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  monthlyPension: string;
}

export interface SewingMachineCamp {
  id?: string;
  campNumber: string;
  formNumber: string;
  applicationDate: string;
  applicantName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  aadharNumber: string;
  gotra: string;
  age: number;
  mobile: string;
  address: string;
  pinCode: string;
  tehsil: string;
  district: string;
  state: string;
}

export interface SurakshaBimaYojana {
  id?: string;
  date: string;
  codeNumber: string;
  bimaNumber: string;
  applicantName: string;
  fatherName: string;
  wifeOf: string;
  gotra: string;
  address: string;
  membershipJoinDate: string;
  associatedUntil: string;
  permanentFee: number;
  installmentAmount: number;
  totalGrantAmount: number;
  totalMembersServing: number;
  rate200: number;
  deducted10Percent: number;
  deducted25Percent: number;
  totalPaidAmount: number;
  remark: string;
}

export interface MayraCongratulations {
  id?: string;
  date: string;
  codeNumber: string;
  mayraNumber: string;
  applicantName: string;
  fatherName: string;
  wifeOf: string;
  gotra: string;
  address: string;
  membershipJoinDate: string;
  associatedUntil: string;
  permanentFee: string;
  installmentAmount: string;
  totalGrantAmount: string;
  totalMembersServing: number;
  rate200: number;
  rate300: number;
  deductionPercent: string;
  deductedAmount: string;
  totalPaidAmount: string;
  gender: string;
  payment_status: number;
  mayra_id: string;
  formNumber: string;
  paymentAmount: string;
  totalAmount: string;
  pendingAmount: string;
}

export interface PaymentManagement {
  id?: string;
  date: string;
  type: string;
  amount: number;
  remark: string;
}

export interface MarriageDetails {
  congratulationsData: MarriageCongratulations | null;
  sewingMachineData: MarriageSewingMachine | null;
}

// Filter interfaces
export interface ApplicationFilters {
  id?: string;
  applicationDate?: string;
  fromDate?: string;
  toDate?: string;
  applicantName?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  gender?: string;
  is_active?: number;
  aadharNumber?: string;
  mobile?: string;
  search?: string;
  addedBy?: string;
  addedby_id?: number;
}

export interface PaymentFilters {
  id?: string;
  date?: string;
  from?: string;
  to?: string;
  type?: string;
  amount?: number;
  remark?: string;
  search?: string;
  source?: string;
  page?: number;
  limit?: number;
}

export interface PaymentListPagination {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaymentListItem {
  id: string | number;
  date: string;
  amount: string | number;
  name?: string;
  remark?: string;
  source: string;
  type?: string;
  application_insurance_id?: string;
  pay_in_wedding_application_id?: string;
}

export interface PaymentListResponse {
  status: boolean;
  message: string;
  totalIncome?: number;
  totalExpenses?: number;
  netBalance?: number;
  pagination?: PaymentListPagination;
  data?: PaymentListItem[];
}

// Comprehensive API Service
export class APIService {
  // Authentication
  static login = authAPI.login;
  static logout = authAPI.logout;
  static register = authAPI.register;

  // General Applications
  static createGeneralApplication = (data: GeneralApplication) => 
    generalApplicationsAPI.create(data);
  
  static getGeneralApplications = (filters?: ApplicationFilters) => 
    generalApplicationsAPI.getAll(filters);
  
  static getGeneralApplicationById = (id: string) => 
    generalApplicationsAPI.getById(id);
  
  static updateGeneralApplication = (id: string, data: Partial<GeneralApplication>) => 
    generalApplicationsAPI.update(id, data);
  
  static deleteGeneralApplication = (id: string) => 
    generalApplicationsAPI.delete(id);

  // Insurance Applications
  static createInsuranceApplication = (data: InsuranceApplication) => 
    insuranceApplicationsAPI.create(data);
  
  static getInsuranceApplications = (filters?: ApplicationFilters) => 
    insuranceApplicationsAPI.getAll(filters);
  
  static getInsuranceApplicationById = (id: string) => 
    insuranceApplicationsAPI.getById(id);
  
  static updateInsuranceApplication = (id: string, data: Partial<InsuranceApplication>) => 
    insuranceApplicationsAPI.update(id, data);
  
  static toggleInsuranceApplicationActiveStatus = (id: string, currentStatus: number) =>
    insuranceApplicationsAPI.toggleActiveStatus(id, currentStatus);

  static deleteInsuranceApplication = (id: string) => 
    insuranceApplicationsAPI.delete(id);

  // Loan Applications
  static createLoanApplication = (data: LoanApplication) => 
    loanApplicationsAPI.create(data);
  
  static getLoanApplications = (filters?: ApplicationFilters) => 
    loanApplicationsAPI.getAll(filters);
  
  static updateLoanApplication = (id: string, data: Partial<LoanApplication>) => 
    loanApplicationsAPI.update(id, data);
  
  static deleteLoanApplication = (id: string) => 
    loanApplicationsAPI.delete(id);

  // Financial Help
  static createFinancialHelp = (data: FinancialHelp) => 
    financialHelpAPI.create(data);
  
  static getFinancialHelps = (filters?: ApplicationFilters) => 
    financialHelpAPI.getAll(filters);
  
  static updateFinancialHelp = (id: string, data: Partial<FinancialHelp>) => 
    financialHelpAPI.update(id, data);
  
  static deleteFinancialHelp = (id: string) => 
    financialHelpAPI.delete(id);

  static getFinancialHelpInstallments = (financialHelpId: string | number) =>
    financialHelpInstallmentsAPI.getByFinancialHelpId(financialHelpId);

  static addFinancialHelpInstallment = (data: {
    financial_help_id: string | number;
    amount: string | number;
    date: string;
    note?: string;
  }) => financialHelpInstallmentsAPI.create(data);

  // Disability Cycle
  static createDisabilityCycle = (data: DisabilityCycle) => 
    disabilityCycleAPI.create(data);
  
  static getDisabilityCycles = (filters?: ApplicationFilters) => 
    disabilityCycleAPI.getAll(filters);
  
  static updateDisabilityCycle = (id: string, data: Partial<DisabilityCycle>) => 
    disabilityCycleAPI.update(id, data);
  
  static deleteDisabilityCycle = (id: string) => 
    disabilityCycleAPI.delete(id);

  // Agent Registration
  static createAgent = (data: AgentRegistration) => 
    agentRegistrationAPI.create(data);
  
  static getAgents = (filters?: ApplicationFilters) => 
    agentRegistrationAPI.getAll(filters);
  
  static updateAgent = (id: string, data: Partial<AgentRegistration>) => 
    agentRegistrationAPI.update(id, data);
  
  static deleteAgent = (id: string) => 
    agentRegistrationAPI.delete(id);

  // Marriage Congratulations
  static createMarriageCongratulations = (data: MarriageCongratulations) => 
    marriageCongratulationsAPI.create(data);
  
  static getMarriageCongratulations = (filters?: ApplicationFilters) => 
    marriageCongratulationsAPI.getAll(filters);
  
  static updateMarriageCongratulations = (id: string, data: Partial<MarriageCongratulations>) => 
    marriageCongratulationsAPI.update(id, data);
  
  static deleteMarriageCongratulations = (id: string) => 
    marriageCongratulationsAPI.delete(id);

  // Marriage Sewing Machine
  static createMarriageSewingMachine = (data: MarriageSewingMachine) => 
    marriageSewingMachineAPI.create(data);
  
  static getMarriageSewingMachines = (filters?: ApplicationFilters) => 
    marriageSewingMachineAPI.getAll(filters);
  
  static updateMarriageSewingMachine = (id: string, data: Partial<MarriageSewingMachine>) => 
    marriageSewingMachineAPI.update(id, data);
  
  static deleteMarriageSewingMachine = (id: string) => 
    marriageSewingMachineAPI.delete(id);

  // Pension Yojana
  static createPensionYojana = (data: PensionYojana) => 
    pensionYojanaAPI.create(data);
  
  static getPensionYojanas = (filters?: ApplicationFilters) => 
    pensionYojanaAPI.getAll(filters);
  
  static updatePensionYojana = (id: string, data: Partial<PensionYojana>) => 
    pensionYojanaAPI.update(id, data);
  
  static deletePensionYojana = (id: string) => 
    pensionYojanaAPI.delete(id);

  // Sewing Machine Camp
  static createSewingMachineCamp = (data: SewingMachineCamp) => 
    sewingMachineCampAPI.create(data);
  
  static getSewingMachineCamps = (filters?: ApplicationFilters) => 
    sewingMachineCampAPI.getAll(filters);
  
  static getSewingMachineCampById = (id: string) => 
    sewingMachineCampAPI.getById(id);
  
  static updateSewingMachineCamp = (id: string, data: Partial<SewingMachineCamp>) => 
    sewingMachineCampAPI.update(id, data);
  
  static deleteSewingMachineCamp = (id: string) => 
    sewingMachineCampAPI.delete(id);

  // Suraksha Bima Yojana
  static createSurakshaBimaYojana = (data: SurakshaBimaYojana) => 
    surakshaBimaYojanaAPI.create(data);
  
  static getSurakshaBimaYojanas = (filters?: ApplicationFilters) => 
    surakshaBimaYojanaAPI.getAll(filters);
  
  static getSurakshaBimaYojanaById = (id: string) => 
    surakshaBimaYojanaAPI.getById(id);
  
  static getSurakshaBimaYojanaByInsuranceApplicationId = (insuranceApplicationId: string) => 
    surakshaBimaYojanaAPI.getByInsuranceApplicationId(insuranceApplicationId);
  
  static updateSurakshaBimaYojana = (id: string, data: Partial<SurakshaBimaYojana>) => 
    surakshaBimaYojanaAPI.update(id, data);
  
  static deleteSurakshaBimaYojana = (id: string) => 
    surakshaBimaYojanaAPI.delete(id);

  // Payment Management
  static createPayment = (data: PaymentManagement) => 
    paymentManagementAPI.create(data);
  
  static getPayments = (filters?: PaymentFilters) => 
    paymentManagementAPI.getAll(filters);
  
  static updatePayment = (id: string, data: Partial<PaymentManagement>) => 
    paymentManagementAPI.update(id, data);
  
  static deletePayment = (id: string) => 
    paymentManagementAPI.delete(id);

  // Marriage Details
  static getMarriageDetailsByNumber = (marriageNumber: string) => 
    marriageDetailsAPI.getByMarriageNumber(marriageNumber);

  // Application Installments
  static getApplicationInstallments = (applicationId: string | number) =>
    applicationInstallmentsAPI.getByApplicationId(applicationId);

  static addApplicationInstallment = (data: { application_id: string | number; amount: string | number; date: string; note?: string }) =>
    applicationInstallmentsAPI.create(data);

  // Previous Applications Members
  static getPreviousApplicationsMembers = async (id: string | number) => {
    try {
      const formData = new FormData();
      formData.append('id', String(id));
      
      const response = await post('?apicall=getPreviousApplicationsMembers', formData);
      return response.data;
    } catch (error) {
      console.error('Error fetching previous applications members:', error);
      throw error;
    }
  };

  // Marriage Congratulations Payment Summary
  static getMarriageCongratulationsPayment = async (applicationId: string | number) => {
    try {
      const formData = new FormData();
      formData.append('marriage_congratulations_id', String(applicationId));
      
      const response = await post('?apicall=getMarriageCongratulationsPayment', formData);
      return response.data;
    } catch (error) {
      console.error('Error fetching marriage congratulations payment summary:', error);
      throw error;
    }
  };

  // Create Marriage Congratulations Payment
  static createMarriageCongratulationsPayment = async (data: { marriage_congratulations_id: string | number; application_id: string | number; amount: string | number; category: string; addedby?: string; addedby_id?: string | number }) => {
    try {
      const formData = new FormData();
      formData.append('marriage_congratulations_id', String(data.marriage_congratulations_id));
      formData.append('application_id', String(data.application_id));
      formData.append('amount', String(data.amount));
      formData.append('category', data.category);
      
      // Add addedby and addedby_id if provided
      if (data.addedby) {
        formData.append('addedby', data.addedby);
      }
      if (data.addedby_id) {
        formData.append('addedby_id', String(data.addedby_id));
      }
      
      const response = await post('?apicall=createMarriageCongratulationsPayment', formData);
      return response.data;
    } catch (error) {
      console.error('Error creating marriage congratulations payment:', error);
      throw error;
    }
  };

  static getMarriageCongratulationsInstallments = async (marriageCongratulationsId: string | number) => {
    try {
      const formData = new FormData();
      formData.append("marriage_congratulations_id", String(marriageCongratulationsId));
      const response = await post("?apicall=getMarriageCongratulationsInstallments", formData);
      return response.data;
    } catch (error) {
      console.error("Error fetching marriage congratulations installments:", error);
      throw error;
    }
  };

  static addMarriageCongratulationsInstallment = async (data: {
    marriage_congratulations_id: string | number;
    amount: string | number;
    date: string;
    note?: string;
  }) => {
    try {
      const formData = new FormData();
      formData.append("marriage_congratulations_id", String(data.marriage_congratulations_id));
      formData.append("amount", String(data.amount));
      formData.append("date", data.date);
      if (data.note) formData.append("note", data.note);
      const response = await post("?apicall=addMarriageCongratulationsInstallment", formData);
      return response.data;
    } catch (error) {
      console.error("Error adding marriage congratulations installment:", error);
      throw error;
    }
  };

  // Insurance Application Installments
  static getInsuranceApplicationInstallments = (applicationInsuranceId: string | number) =>
    insuranceApplicationInstallmentsAPI.getByApplicationId(applicationInsuranceId);

  static addInsuranceApplicationInstallment = (data: { application_insurance_id: string | number; amount: string | number; date: string; note?: string }) =>
    insuranceApplicationInstallmentsAPI.create(data);

  // PDF Generation
  static generateInsurancePDF = async (data: any, imageData?: string) => {
    try {
      const response = await fetch('/api/generate-insurance-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          imageData,
          debug: false, // Set to true for debugging coordinates
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error generating insurance PDF:', error);
      throw error;
    }
  };

  static generateAgentPDF = async (data: any, imageData?: string) => {
    try {
      const response = await fetch('/api/generate-agent-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record: data,
          imageData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error generating agent PDF:', error);
      throw error;
    }
  };

  static generateAgentApplicationFormPDF = async (data: any, imageData?: string) => {
    try {
      const response = await fetch('/api/generate-agent-application-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record: data,
          imageData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error generating agent application form PDF:', error);
      throw error;
    }
  };

  static generateAgentAdikartFormPDF = async (data: any, imageData?: string) => {
    try {
      const response = await fetch('/api/generate-agent-adikart-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record: data,
          imageData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error generating agent adikart form PDF:', error);
      throw error;
    }
  };

  // Mayra Congratulations
  static getMayraCongratulations = (filters?: ApplicationFilters) =>
    mayraCongratsAPI.getAll(filters);

  static getMayraCongratulationsPayment = async (mayra_id: string | number) => {
    try {
      const formData = new FormData();
      formData.append('mayra_id', String(mayra_id));
      
      const response = await post('?apicall=getMayraCongratulationsPayment', formData);
      return response.data;
    } catch (error) {
      console.error('Error fetching mayra congratulations payment summary:', error);
      throw error;
    }
  };

  static createMayraCongratulationsPayment = async (data: { mayra_congratulations_id: string | number; mayra_id: string | number; application_id: string | number; amount: string | number; category: string; addedby?: string; addedby_id?: string | number }) => {
    try {
      const formData = new FormData();
      formData.append('mayra_congratulations_id', String(data.mayra_congratulations_id));
      formData.append('mayra_id', String(data.mayra_id));
      formData.append('application_id', String(data.application_id));
      formData.append('amount', String(data.amount));
      formData.append('category', data.category);
      
      if (data.addedby) {
        formData.append('addedby', data.addedby);
      }
      if (data.addedby_id) {
        formData.append('addedby_id', String(data.addedby_id));
      }
      
      const response = await post('?apicall=createMayraCongratulationsPayment', formData);
      return response.data;
    } catch (error) {
      console.error('Error creating mayra congratulations payment:', error);
      throw error;
    }
  };

  static deleteMayraCongratulationsPayment = async (id: string | number) => {
    try {
      const formData = new FormData();
      formData.append('id', String(id));
      
      const response = await post('?apicall=deleteMayraCongratulationsPayment', formData);
      return response.data;
    } catch (error) {
      console.error('Error deleting mayra congratulations payment:', error);
      throw error;
    }
  };

  static getMayraPreviousMembers = async (id: string | number) => {
    try {
      const formData = new FormData();
      formData.append('id', String(id));
      
      const response = await post('?apicall=getMayraPreviousMembers', formData);
      return response.data;
    } catch (error) {
      console.error('Error fetching mayra previous members:', error);
      throw error;
    }
  };

  // Mayra Installments
  static getMayraInstallments = (mayra_id: string | number) =>
    mayraInstallmentAPI.getAllByMayraId(String(mayra_id));

  static addMayraInstallment = (data: { mayra_id: string | number; amount: string | number; date: string; note?: string; addedby?: string; addedby_id?: string | number }) =>
    mayraInstallmentAPI.create(data);

  // Janni Delivery Registration
  static createJanniDelivery = (data: any) => janniDeliveryAPI.create(data);
  static getJanniDeliveries = (filters?: Record<string, any>) => janniDeliveryAPI.getAll(filters);
  static getJanniDeliveryById = (id: string) => janniDeliveryAPI.getById(id);
  static updateJanniDelivery = (id: string, data: any) => janniDeliveryAPI.update(id, data);
  static deleteJanniDelivery = (id: string) => janniDeliveryAPI.delete(id);
  static addJanniInstallment = (id: string, data: any) => janniDeliveryAPI.addInstallment(id, data);
  static verifyJanniEPin = (pinCode: string) => janniDeliveryAPI.verifyEPin(pinCode);
}

export default APIService; 