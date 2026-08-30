"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { isAgent } from "@/lib/permissions";
import { PermissionGate } from "@/components/permission-gate";
import CashFlowPage from "./cash-flow/page";
import GeneralApplicationPaymentPage from "./general-application-payment/page";
import MarriageCongratulationsPaymentListPage from "./marriage-congratulations-payment/page";
import MayraGeneralApplicationPaymentListPage from "./mayra-general-application-payment/page";
import MayraCongratulationsPaymentListPage from "./mayra-congratulations-payment/page";
import InsuranceApplicationPaymentListPage from "./insurance-application-payment/page";
import SurakshaBimaYojanaPaymentListPage from "./suraksha-bima-yojana-payment/page";
import PensionYojanaPaymentListPage from "./pension-yojana-payment/page";
import LoanPaymentListPage from "./loan-payment/page";

const TAB_TRIGGER_CLASS =
  "text-xs sm:text-sm px-2 sm:px-3 py-2 h-auto whitespace-normal text-center";

export default function PaymentManagementPage() {
  const [activeTab, setActiveTab] = useState("cash-flow");

  useEffect(() => {
    if (isAgent()) {
      setActiveTab("general-application");
    } else {
      setActiveTab("cash-flow");
    }
  }, []);

  return (
    <div className="p-2 sm:p-4 md:p-6 lg:p-8">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 text-center sm:text-left">
        Payment Management
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9 gap-2 h-auto p-1">
          <PermissionGate module="cash_flow" action="create">
            <TabsTrigger value="cash-flow" className={TAB_TRIGGER_CLASS}>
              Cash Flow
            </TabsTrigger>
          </PermissionGate>

          <PermissionGate module="general_application_payment" action="view">
            <TabsTrigger value="general-application" className={TAB_TRIGGER_CLASS}>
              General Marriage Application
            </TabsTrigger>
          </PermissionGate>

          <PermissionGate module="marriage_congratulations_payment" action="view">
            <TabsTrigger value="marriage-congratulations" className={TAB_TRIGGER_CLASS}>
              General Marriage Congratulations Payment
            </TabsTrigger>
          </PermissionGate>

          <PermissionGate module="mayra_registration" action="view">
            <TabsTrigger value="mayra-general-application" className={TAB_TRIGGER_CLASS}>
              Mayra General Application
            </TabsTrigger>
          </PermissionGate>

          <PermissionGate module="mayra_registration" action="view">
            <TabsTrigger value="mayra-congratulations" className={TAB_TRIGGER_CLASS}>
              Mayra Congratulations Payment
            </TabsTrigger>
          </PermissionGate>

          <PermissionGate module="insurance_application_payment" action="view">
            <TabsTrigger value="insurance-application" className={TAB_TRIGGER_CLASS}>
              Insurance Bima Application
            </TabsTrigger>
          </PermissionGate>

          <PermissionGate module="suraksha_bima_yojana_payment" action="view">
            <TabsTrigger value="suraksha-bima-yojana" className={TAB_TRIGGER_CLASS}>
              Insurance Bima Payment
            </TabsTrigger>
          </PermissionGate>

          <PermissionGate module="pension_yojana_payment" action="view">
            <TabsTrigger value="pension-yojana" className={TAB_TRIGGER_CLASS}>
              Pension Yojana Application Payment
            </TabsTrigger>
          </PermissionGate>

          <PermissionGate module="loan_payment" action="view">
            <TabsTrigger value="loan-payment" className={TAB_TRIGGER_CLASS}>
              Loan Application Payment
            </TabsTrigger>
          </PermissionGate>
        </TabsList>

        <div className="mt-4 sm:mt-6">
          <PermissionGate module="cash_flow" action="create">
            <TabsContent value="cash-flow" className="mt-0">
              <CashFlowPage />
            </TabsContent>
          </PermissionGate>

          <PermissionGate module="general_application_payment" action="view">
            <TabsContent value="general-application" className="mt-0">
              <GeneralApplicationPaymentPage />
            </TabsContent>
          </PermissionGate>

          <PermissionGate module="marriage_congratulations_payment" action="view">
            <TabsContent value="marriage-congratulations" className="mt-0">
              <MarriageCongratulationsPaymentListPage />
            </TabsContent>
          </PermissionGate>

          <PermissionGate module="mayra_registration" action="view">
            <TabsContent value="mayra-general-application" className="mt-0">
              <MayraGeneralApplicationPaymentListPage />
            </TabsContent>
          </PermissionGate>

          <PermissionGate module="mayra_registration" action="view">
            <TabsContent value="mayra-congratulations" className="mt-0">
              <MayraCongratulationsPaymentListPage />
            </TabsContent>
          </PermissionGate>

          <PermissionGate module="insurance_application_payment" action="view">
            <TabsContent value="insurance-application" className="mt-0">
              <InsuranceApplicationPaymentListPage />
            </TabsContent>
          </PermissionGate>

          <PermissionGate module="suraksha_bima_yojana_payment" action="view">
            <TabsContent value="suraksha-bima-yojana" className="mt-0">
              <SurakshaBimaYojanaPaymentListPage />
            </TabsContent>
          </PermissionGate>

          <PermissionGate module="pension_yojana_payment" action="view">
            <TabsContent value="pension-yojana" className="mt-0">
              <PensionYojanaPaymentListPage />
            </TabsContent>
          </PermissionGate>

          <PermissionGate module="loan_payment" action="view">
            <TabsContent value="loan-payment" className="mt-0">
              <LoanPaymentListPage />
            </TabsContent>
          </PermissionGate>
        </div>
      </Tabs>
    </div>
  );
}
