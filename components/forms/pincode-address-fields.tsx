"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePincodeLookup } from "@/hooks/use-pincode-lookup";
import { Loader2, CheckCircle2, AlertCircle, MapPin, Building2, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PincodeAddressFieldsProps {
  // Option 1: Direct field values
  pinCode?: string;
  state?: string;
  district?: string;
  tehsil?: string;
  address?: string;
  village?: string;
  city?: string;
  postOffice?: string;

  // Option 2: Grouped values object
  values?: Record<string, any>;

  // Change handler (either onFieldChange or onChange)
  onFieldChange?: (field: string, value: string) => void;
  onChange?: (field: string, value: string) => void;

  // Field names mapping (in case a module uses custom keys like nomineePincode)
  fieldNames?: {
    pinCode?: string;
    state?: string;
    district?: string;
    tehsil?: string;
    address?: string;
    village?: string;
    city?: string;
    postOffice?: string;
  };

  // Validation errors
  errors?: Record<string, string | undefined>;
  onClearError?: (field: string) => void;

  // Labels and configuration
  required?: boolean;
  disabled?: boolean;
  isEditMode?: boolean;
  initialPinCode?: string;

  // Visual options
  showAddressField?: boolean;
  addressAsTextarea?: boolean;
  showVillageField?: boolean;
  showCityField?: boolean;
  addressLabel?: string;
  addressPlaceholder?: string;
  villageLabel?: string;
  villagePlaceholder?: string;
  cityLabel?: string;
  cityPlaceholder?: string;
  className?: string;
}

export function PincodeAddressFields({
  pinCode,
  state,
  district,
  tehsil,
  address,
  village,
  city,
  postOffice,
  values,
  onFieldChange,
  onChange,
  fieldNames = {},
  errors = {},
  onClearError,
  required = true,
  disabled = false,
  isEditMode = false,
  initialPinCode = "",
  showAddressField = true,
  addressAsTextarea = false,
  showVillageField = false,
  showCityField = false,
  addressLabel = "पूरा पता / Address",
  addressPlaceholder = "मकान नंबर, गली/मोहल्ला, गाँव आदि",
  villageLabel = "गाँव / Village",
  villagePlaceholder = "गाँव का नाम दर्ज करें",
  cityLabel = "शहर / City",
  cityPlaceholder = "शहर का नाम दर्ज करें",
  className = "",
}: PincodeAddressFieldsProps) {
  const pinKey = fieldNames.pinCode || "pinCode";
  const stateKey = fieldNames.state || "state";
  const districtKey = fieldNames.district || "district";
  const tehsilKey = fieldNames.tehsil || "tehsil";
  const addressKey = fieldNames.address || "address";
  const villageKey = fieldNames.village || "village";
  const cityKey = fieldNames.city || "city";
  const postOfficeKey = fieldNames.postOffice || "postOffice";

  const resolvedPinCode = pinCode ?? values?.[pinKey] ?? values?.pinCode ?? "";
  const resolvedState = state ?? values?.[stateKey] ?? values?.state ?? "";
  const resolvedDistrict = district ?? values?.[districtKey] ?? values?.district ?? "";
  const resolvedTehsil = tehsil ?? values?.[tehsilKey] ?? values?.tehsil ?? "";
  const resolvedAddress = address ?? values?.[addressKey] ?? values?.address ?? "";
  const resolvedVillage = village ?? values?.[villageKey] ?? values?.village ?? "";
  const resolvedCity = city ?? values?.[cityKey] ?? values?.city ?? "";
  const resolvedPostOffice = postOffice ?? values?.[postOfficeKey] ?? values?.postOffice ?? "";

  const shouldShowVillage = showVillageField || Boolean(village) || Boolean(values?.[villageKey]) || Boolean(fieldNames.village);
  const shouldShowCity = showCityField || Boolean(city) || Boolean(values?.[cityKey]) || Boolean(fieldNames.city);

  const notifyChange = (field: string, value: string) => {
    onFieldChange?.(field, value);
    onChange?.(field, value);
  };

  const [selectedLocality, setSelectedLocality] = useState<string>(resolvedPostOffice || "");

  const {
    isLoading,
    error: lookupError,
    postOffices,
    localities,
    selectPostOfficeByName,
  } = usePincodeLookup({
    pinCode: resolvedPinCode,
    isEditMode,
    initialPinCode: initialPinCode || (isEditMode ? resolvedPinCode : ""),
    onLocationFound: ({ state: fetchedState, district: fetchedDistrict, tehsil: fetchedTehsil, city: fetchedCity, selectedPostOffice }) => {
      // Auto-populate reliable state & district
      if (fetchedState) {
        notifyChange(stateKey, fetchedState);
        onClearError?.(stateKey);
      }
      if (fetchedDistrict) {
        notifyChange(districtKey, fetchedDistrict);
        onClearError?.(districtKey);
      }
      // Auto-populate Tehsil only if available from reliable block data (never guess)
      if (fetchedTehsil) {
        notifyChange(tehsilKey, fetchedTehsil);
        onClearError?.(tehsilKey);
      }
      // Populate city if field is active
      if (shouldShowCity && (fetchedCity || fetchedDistrict)) {
        notifyChange(cityKey, fetchedCity || fetchedDistrict);
        onClearError?.(cityKey);
      }

      if (selectedPostOffice?.name) {
        setSelectedLocality(selectedPostOffice.name);
        if (fieldNames.postOffice) {
          notifyChange(postOfficeKey, selectedPostOffice.name);
        }
      }
    },
  });

  // Keep selectedLocality in sync with incoming postOffice if present
  useEffect(() => {
    if (resolvedPostOffice && !selectedLocality) {
      setSelectedLocality(resolvedPostOffice);
    }
  }, [resolvedPostOffice, selectedLocality]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "").slice(0, 6);
    notifyChange(pinKey, rawVal);
    onClearError?.(pinKey);
  };

  const handleLocalitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locName = e.target.value;
    setSelectedLocality(locName);
    if (!locName) return;

    const po = selectPostOfficeByName(locName);
    if (po) {
      if (po.block) {
        notifyChange(tehsilKey, po.block);
        onClearError?.(tehsilKey);
      }
      if (fieldNames.postOffice) {
        notifyChange(postOfficeKey, po.name);
      }
      if (shouldShowCity && po.district) {
        notifyChange(cityKey, po.district);
        onClearError?.(cityKey);
      }
      // If village is shown and currently empty, suggest the locality name
      if (shouldShowVillage && !resolvedVillage) {
        notifyChange(villageKey, po.name);
        onClearError?.(villageKey);
      }
    }
  };

  const handleAppendLocalityToAddress = () => {
    if (!selectedLocality) return;
    const currentAddr = (resolvedAddress || "").trim();
    if (!currentAddr) {
      notifyChange(addressKey, selectedLocality);
    } else if (!currentAddr.toLowerCase().includes(selectedLocality.toLowerCase())) {
      notifyChange(addressKey, `${currentAddr}, ${selectedLocality}`);
    }
    onClearError?.(addressKey);
  };

  const handleSetLocalityAsVillage = () => {
    if (!selectedLocality) return;
    notifyChange(villageKey, selectedLocality);
    onClearError?.(villageKey);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Address / Village / City Optional Row */}
      {(shouldShowVillage || showAddressField || shouldShowCity) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {shouldShowVillage && (
            <div>
              <Label htmlFor={villageKey} className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-blue-600" />
                {villageLabel} {required && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id={villageKey}
                name={villageKey}
                value={resolvedVillage}
                disabled={disabled}
                required={required}
                placeholder={villagePlaceholder}
                className={cn("mt-1 text-xs sm:text-sm", errors[villageKey] && "border-red-500 focus-visible:ring-red-500")}
                onChange={(e) => {
                  notifyChange(villageKey, e.target.value);
                  onClearError?.(villageKey);
                }}
              />
              {errors[villageKey] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[villageKey]}</p>}
            </div>
          )}

          {shouldShowCity && (
            <div>
              <Label htmlFor={cityKey} className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                {cityLabel} {required && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id={cityKey}
                name={cityKey}
                value={resolvedCity}
                disabled={disabled}
                required={required}
                placeholder={cityPlaceholder}
                className={cn("mt-1 text-xs sm:text-sm", errors[cityKey] && "border-red-500 focus-visible:ring-red-500")}
                onChange={(e) => {
                  notifyChange(cityKey, e.target.value);
                  onClearError?.(cityKey);
                }}
              />
              {errors[cityKey] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[cityKey]}</p>}
            </div>
          )}

          {showAddressField && (
            <div className={cn(shouldShowVillage && shouldShowCity ? "sm:col-span-2" : shouldShowVillage || shouldShowCity ? "" : "sm:col-span-2")}>
              <Label htmlFor={addressKey} className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                {addressLabel} {required && <span className="text-red-500">*</span>}
              </Label>
              {addressAsTextarea ? (
                <Textarea
                  id={addressKey}
                  name={addressKey}
                  rows={2}
                  value={resolvedAddress}
                  disabled={disabled}
                  required={required}
                  placeholder={addressPlaceholder}
                  className={cn("mt-1 text-xs sm:text-sm resize-none", errors[addressKey] && "border-red-500 focus-visible:ring-red-500")}
                  onChange={(e) => {
                    notifyChange(addressKey, e.target.value);
                    onClearError?.(addressKey);
                  }}
                />
              ) : (
                <Input
                  id={addressKey}
                  name={addressKey}
                  value={resolvedAddress}
                  disabled={disabled}
                  required={required}
                  placeholder={addressPlaceholder}
                  className={cn("mt-1 text-xs sm:text-sm", errors[addressKey] && "border-red-500 focus-visible:ring-red-500")}
                  onChange={(e) => {
                    notifyChange(addressKey, e.target.value);
                    onClearError?.(addressKey);
                  }}
                />
              )}
              {errors[addressKey] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[addressKey]}</p>}
            </div>
          )}
        </div>
      )}

      {/* Grid for PIN Code, Tehsil, District, State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PIN Code Field */}
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor={pinKey} className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              पिन कोड / PIN Code {required && <span className="text-red-500">*</span>}
            </Label>
            {isLoading && (
              <span className="flex items-center text-[11px] text-blue-600 font-medium">
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                खोज रहे हैं...
              </span>
            )}
            {!isLoading && resolvedPinCode.length === 6 && !lookupError && postOffices.length > 0 && (
              <span className="flex items-center text-[11px] text-emerald-600 font-medium">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                सत्यापित
              </span>
            )}
          </div>
          <div className="relative mt-1">
            <Input
              id={pinKey}
              name={pinKey}
              type="text"
              inputMode="numeric"
              maxLength={6}
              disabled={disabled}
              required={required}
              placeholder="6 अंकों का पिन कोड"
              value={resolvedPinCode}
              onChange={handlePinChange}
              className={cn(
                "text-xs sm:text-sm pr-8",
                (errors[pinKey] || lookupError) && "border-red-500 focus-visible:ring-red-500",
                !errors[pinKey] && !lookupError && resolvedPinCode.length === 6 && postOffices.length > 0 && "border-emerald-500"
              )}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : resolvedPinCode.length === 6 && postOffices.length > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : lookupError ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
            </div>
          </div>
          {errors[pinKey] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[pinKey]}</p>}
          {!errors[pinKey] && lookupError && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {lookupError} (मैन्युअल दर्ज करें)
            </p>
          )}
        </div>

        {/* Tehsil Field */}
        <div>
          <Label htmlFor={tehsilKey} className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            तहसील / Tehsil {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id={tehsilKey}
            name={tehsilKey}
            disabled={disabled}
            required={required}
            placeholder="तहसील दर्ज करें"
            value={resolvedTehsil}
            className={cn("mt-1 text-xs sm:text-sm", errors[tehsilKey] && "border-red-500 focus-visible:ring-red-500")}
            onChange={(e) => {
              notifyChange(tehsilKey, e.target.value);
              onClearError?.(tehsilKey);
            }}
          />
          {errors[tehsilKey] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[tehsilKey]}</p>}
        </div>

        {/* District Field */}
        <div>
          <Label htmlFor={districtKey} className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            ज़िला / District {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id={districtKey}
            name={districtKey}
            disabled={disabled}
            required={required}
            placeholder="ज़िला दर्ज करें"
            value={resolvedDistrict}
            className={cn("mt-1 text-xs sm:text-sm", errors[districtKey] && "border-red-500 focus-visible:ring-red-500")}
            onChange={(e) => {
              notifyChange(districtKey, e.target.value);
              onClearError?.(districtKey);
            }}
          />
          {errors[districtKey] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[districtKey]}</p>}
        </div>

        {/* State Field */}
        <div>
          <Label htmlFor={stateKey} className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            राज्य / State {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id={stateKey}
            name={stateKey}
            disabled={disabled}
            required={required}
            placeholder="राज्य दर्ज करें"
            value={resolvedState}
            className={cn("mt-1 text-xs sm:text-sm", errors[stateKey] && "border-red-500 focus-visible:ring-red-500")}
            onChange={(e) => {
              notifyChange(stateKey, e.target.value);
              onClearError?.(stateKey);
            }}
          />
          {errors[stateKey] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[stateKey]}</p>}
        </div>
      </div>

      {/* Post Office / Locality Selection dropdown when multiple post offices match */}
      {postOffices.length > 1 && (
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <span className="font-semibold text-blue-900 dark:text-blue-200 shrink-0 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              डाकघर / क्षेत्र ({postOffices.length}):
            </span>
            <select
              value={selectedLocality}
              onChange={handleLocalitySelect}
              className="h-8 px-2 py-1 text-xs rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 font-medium"
            >
              <option value="">-- डाकघर / क्षेत्र चुनें ({postOffices.length} उपलब्ध) --</option>
              {postOffices.map((po) => (
                <option key={po.name} value={po.name}>
                  {po.name} {po.block ? `(ब्लॉक/तहसील: ${po.block})` : ""} {po.branchType ? `• ${po.branchType}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            {selectedLocality && showAddressField && (
              <button
                type="button"
                onClick={handleAppendLocalityToAddress}
                className="text-xs text-blue-700 dark:text-blue-400 hover:underline font-medium"
              >
                + पते में जोड़ें / Add to address
              </button>
            )}
            {selectedLocality && shouldShowVillage && (
              <button
                type="button"
                onClick={handleSetLocalityAsVillage}
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
              >
                + गाँव में सेट करें
              </button>
            )}
          </div>
        </div>
      )}

      {/* Single Post Office Identified banner */}
      {postOffices.length === 1 && (
        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              डाकघर / क्षेत्र: <strong className="text-gray-900 dark:text-gray-100">{postOffices[0].name}</strong>
              {postOffices[0].block && <span className="text-gray-500 ml-1">(ब्लॉक: {postOffices[0].block})</span>}
              {postOffices[0].branchType && <span className="text-gray-500 ml-1">• {postOffices[0].branchType}</span>}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {showAddressField && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLocality(postOffices[0].name);
                  const currentAddr = (resolvedAddress || "").trim();
                  if (!currentAddr) {
                    notifyChange(addressKey, postOffices[0].name);
                  } else if (!currentAddr.toLowerCase().includes(postOffices[0].name.toLowerCase())) {
                    notifyChange(addressKey, `${currentAddr}, ${postOffices[0].name}`);
                  }
                  onClearError?.(addressKey);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                + पते में जोड़ें
              </button>
            )}
            {shouldShowVillage && (
              <button
                type="button"
                onClick={() => {
                  notifyChange(villageKey, postOffices[0].name);
                  onClearError?.(villageKey);
                }}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                + गाँव में सेट करें
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
