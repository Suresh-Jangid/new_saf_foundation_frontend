import { getCurrentUserInfo, parseDateFromDDMMYYYY } from "@/lib/utils";

/** Convert dd-mm-yyyy or ISO display string to yyyy-mm-dd for API. */
export function convertDisplayDateToApi(dateString: string): string {
  if (!dateString) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    return dateString.split("T")[0];
  }
  const parsed = parseDateFromDDMMYYYY(dateString);
  if (!parsed) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type ListFilterInput = {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  genderFilter?: string;
  villageFilter?: string;
  typeFilter?: string;
  categoryFilter?: string;
  reasonFilter?: string;
  sourceFilter?: string;
  includeUserScope?: boolean;
  /** Use `village` param (pension) instead of `address` */
  villageField?: "address" | "village";
};

/** Build consistent API filter params for list endpoints. */
export function buildListFilters(input: ListFilterInput = {}): Record<string, string> {
  const filters: Record<string, string> = {};

  if (input.includeUserScope !== false) {
    const userRole = typeof window !== 'undefined' ? localStorage.getItem("userRole") : null;
    if (userRole === "agent") {
      const { addedby, addedby_id } = getCurrentUserInfo();
      filters.addedby = addedby;
      filters.addedby_id = String(addedby_id);
    }
  }

  if (input.search?.trim()) {
    filters.search = input.search.trim();
  }

  if (input.dateFrom) {
    const from = convertDisplayDateToApi(input.dateFrom);
    if (from) filters.fromDate = from;
  }

  if (input.dateTo) {
    const to = convertDisplayDateToApi(input.dateTo);
    if (to) filters.toDate = to;
  }

  if (input.genderFilter && input.genderFilter !== "all") {
    filters.gender = input.genderFilter;
  }

  if (input.villageFilter && input.villageFilter !== "all") {
    if (input.villageField === "village") {
      filters.village = input.villageFilter;
    } else {
      filters.address = input.villageFilter;
    }
  }

  const category = input.categoryFilter ?? input.typeFilter;
  if (category && category !== "all") {
    filters.category = category;
  }

  if (input.reasonFilter && input.reasonFilter !== "all") {
    filters.reason = input.reasonFilter;
  }

  if (input.sourceFilter && input.sourceFilter !== "all") {
    filters.source = input.sourceFilter;
  }

  return filters;
}
