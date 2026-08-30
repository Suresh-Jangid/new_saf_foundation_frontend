"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleGuard } from "@/components/role-guard";
import { EpinBadge, EpinLifecycleFlow } from "@/components/config/epin-badge";
import { StatusBadge } from "@/components/config/status-badge";
import { AmountDisplay } from "@/components/config/amount-display";
import {
  useAppConfig,
  useAllModules,
  useSchemeTypes,
  useAgeSlabs,
  usePools,
  useDeductions,
} from "@/hooks/use-app-config";
import { ModuleRegistryItem } from "@/lib/config-types";
import {
  Settings,
  Layers,
  Layers3,
  Users,
  Percent,
  KeyRound,
  ShieldAlert,
  Info,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function SystemConfigurationPage() {
  const [activeTab, setActiveTab] = useState("app-settings");
  const { config, loading: configLoading } = useAppConfig();
  const { modules, allModulesFlat } = useAllModules();
  const { schemeTypes, loading: schemesLoading } = useSchemeTypes();
  const { ageSlabs, loading: slabsLoading } = useAgeSlabs();
  const { pools, loading: poolsLoading } = usePools();
  const { deductions, loading: deductionsLoading } = useDeductions();

  return (
    <RoleGuard requiredRoles={["admin"]}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Settings className="h-7 w-7 text-primary" />
              <span>System Configuration & Registry</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              SAF Foundation Centralized Business Configuration & Module Registry
            </p>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 font-mono text-xs">
            Backend Authoritative (Read-Only Console)
          </Badge>
        </div>

        {/* Informational Banner */}
        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3 text-sm text-blue-900 dark:text-blue-200">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Centralized Configuration Architecture (Phase 2-B)</p>
            <p className="text-xs mt-0.5 text-blue-800/80 dark:text-blue-300/80">
              The backend database remains the authoritative source of truth. The frontend consumes active modules,
              dynamic scheme multipliers, A–F age slabs, pool rules, deductions, and E-PIN states seamlessly.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 h-auto p-1 bg-muted/70">
            <TabsTrigger value="app-settings" className="text-xs py-2">
              App Settings
            </TabsTrigger>
            <TabsTrigger value="modules" className="text-xs py-2">
              Modules
            </TabsTrigger>
            <TabsTrigger value="age-slabs" className="text-xs py-2">
              Age Slabs
            </TabsTrigger>
            <TabsTrigger value="scheme-types" className="text-xs py-2">
              Scheme Types
            </TabsTrigger>
            <TabsTrigger value="pools" className="text-xs py-2">
              Pools
            </TabsTrigger>
            <TabsTrigger value="deductions" className="text-xs py-2">
              Deductions
            </TabsTrigger>
            <TabsTrigger value="epin" className="text-xs py-2">
              E-PIN
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: App Settings */}
          <TabsContent value="app-settings" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Application Metadata & Branding</CardTitle>
                <CardDescription>Official organization settings and global defaults</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Application Name (संस्था का नाम)</Label>
                    <Input readOnly value={config.appName} className="bg-muted/50 font-medium" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Official Contact Number (आधिकारिक मोबाइल)</Label>
                    <Input readOnly value={config.officialMobile} className="bg-muted/50 font-mono font-medium" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Standard Administrative Deduction (प्रशासनिक कटौती)</Label>
                    <Input readOnly value={`${config.defaultDeductionPercent}%`} className="bg-muted/50 font-medium" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Insurance Deduction (बीमा दावा कटौती)</Label>
                    <Input readOnly value={`${config.insuranceDeductionPercent}%`} className="bg-muted/50 font-medium" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Modules Registry */}
          <TabsContent value="modules" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Centralized Module Registry</CardTitle>
                <CardDescription>Overview of active, retained, and disabled application modules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border rounded-lg">
                    <thead className="bg-muted text-xs uppercase font-semibold text-muted-foreground border-b">
                      <tr>
                        <th className="p-3">Module ID</th>
                        <th className="p-3">Module Name (EN / HI)</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Route</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allModulesFlat.map((mod: ModuleRegistryItem) => (
                        <tr key={mod.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-mono text-xs text-muted-foreground">{mod.id}</td>
                          <td className="p-3">
                            <span className="font-semibold text-foreground block">{mod.name.en}</span>
                            <span className="text-xs text-muted-foreground">{mod.name.hi}</span>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px]">
                              {mod.category}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-xs text-blue-600 dark:text-blue-400">{mod.route}</td>
                          <td className="p-3">
                            <StatusBadge status={mod.enabled ? "ACTIVE" : "INACTIVE"} />
                          </td>
                          <td className="p-3">
                            <Link href={mod.route}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs flex items-center gap-1">
                                <span>Visit</span>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Age Slabs */}
          <TabsContent value="age-slabs" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Standardized A–F Age Slabs</CardTitle>
                <CardDescription>
                  Active age categories and fee resolutions (A=1–5: ₹1500 to F=22+: ₹11000)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ageSlabs.map((slab) => (
                    <Card key={slab.id} className="border-border shadow-none bg-muted/20">
                      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 border-b">
                        <span className="text-sm font-bold text-foreground">Category {slab.code}</span>
                        <StatusBadge status={slab.status} />
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Age Range:</span>
                          <span className="font-semibold">{slab.minAge} – {slab.maxAge} Years</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Registration Fee:</span>
                          <AmountDisplay amount={slab.fee} size="lg" className="text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Scheme Types */}
          <TabsContent value="scheme-types" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dynamic Scheme Multipliers</CardTitle>
                <CardDescription>
                  Configured scheme types and contribution tiers (₹300, ₹500, ₹1000, ₹1500)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {schemeTypes.map((scheme) => (
                    <Card key={scheme.id} className="border-border shadow-none bg-muted/20">
                      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 border-b">
                        <span className="text-sm font-bold">{scheme.name}</span>
                        <StatusBadge status={scheme.status} />
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Multiplier Code:</span>
                          <span className="font-mono text-xs">{scheme.code}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Contribution Amount:</span>
                          <AmountDisplay amount={scheme.amount} size="lg" className="text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: Pools */}
          <TabsContent value="pools" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gender & Scheme Fund Pools</CardTitle>
                <CardDescription>Configured beneficiary pools for grant disbursement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pools.map((pool) => (
                    <Card key={pool.id} className="border-border shadow-none bg-muted/20">
                      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 border-b">
                        <div>
                          <span className="text-sm font-bold block">{pool.name}</span>
                          {pool.nameHi && <span className="text-xs text-muted-foreground">({pool.nameHi})</span>}
                        </div>
                        <StatusBadge status={pool.status} />
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Pool Code:</span>
                          <span className="font-mono text-xs">{pool.code}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Eligible Genders:</span>
                          <span className="font-medium text-foreground">{pool.allowedGenders.join(", ")}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: Deductions */}
          <TabsContent value="deductions" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Administrative Deduction Rules</CardTitle>
                <CardDescription>Default and scheme-specific administrative fee percentages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {deductions.map((ded) => (
                    <Card key={ded.id} className="border-border shadow-none bg-muted/20">
                      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 border-b">
                        <span className="text-sm font-bold">{ded.description}</span>
                        <StatusBadge status={ded.status} />
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Target Scope:</span>
                          <span className="font-medium">{ded.schemeName || "Global Default"}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Deduction Rate:</span>
                          <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono">
                            {ded.percent}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 7: E-PIN */}
          <TabsContent value="epin" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">E-PIN Lifecycle & Status Architecture</CardTitle>
                <CardDescription>
                  State definitions and authoritative backend state transition rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Lifecycle State Flow:</h4>
                  <EpinLifecycleFlow currentStatus="ASSIGNED" />
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">Status Badges & Definitions:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3 border rounded-lg space-y-2 bg-muted/10">
                      <EpinBadge status="ACTIVE" />
                      <p className="text-xs text-muted-foreground">
                        Generated by Admin, in central foundation inventory ready for agent assignment.
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg space-y-2 bg-muted/10">
                      <EpinBadge status="ASSIGNED" />
                      <p className="text-xs text-muted-foreground">
                        Allocated to a designated Field Agent for offline beneficiary registration.
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg space-y-2 bg-muted/10">
                      <EpinBadge status="USED" />
                      <p className="text-xs text-muted-foreground">
                        Successfully consumed and locked against a verified beneficiary registration.
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg space-y-2 bg-muted/10">
                      <EpinBadge status="BURNT" />
                      <p className="text-xs text-muted-foreground">
                        Explicitly invalidated, expired, or cancelled by Admin. Cannot be reused.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}
