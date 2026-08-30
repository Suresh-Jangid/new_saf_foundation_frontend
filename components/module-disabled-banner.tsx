"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, ShieldAlert } from "lucide-react";

interface ModuleDisabledBannerProps {
  moduleName?: string;
  moduleNameHi?: string;
  route?: string;
  reason?: string;
}

export const ModuleDisabledBanner: React.FC<ModuleDisabledBannerProps> = ({
  moduleName = "This Module",
  moduleNameHi,
  route,
  reason = "This module is currently inactive in SAF Foundation configuration. Historical data is securely preserved.",
}) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto my-8">
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-700 dark:text-amber-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span>{moduleName} — Module Inactive</span>
              {moduleNameHi && <span className="text-sm font-normal text-muted-foreground">({moduleNameHi})</span>}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              मॉड्यूल निष्क्रिय / Module Temporarily Disabled
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/30 p-3 rounded-lg">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{reason}</p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/dashboard">
              <Button variant="default" className="bg-[#ff5c00] hover:bg-[#e05200] text-white flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Return to Dashboard / डैशबोर्ड पर वापस जाएं
              </Button>
            </Link>
            {route && (
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="border-gray-300"
              >
                Go Back / पिछला पेज
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
