import type {
  Company,
  CompanyCreatePayload,
  CompanyUpdatePayload,
} from "@/entities/company/types";
import { apiRequest } from "@/shared/api/http";

export function fetchCompanies(params?: {
  search?: string;
  include_inactive?: boolean;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.include_inactive) q.set("include_inactive", "true");
  if (params?.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<Company[]>(`/companies${qs ? `?${qs}` : ""}`);
}

export function fetchCompany(id: number) {
  return apiRequest<Company>(`/companies/${id}`);
}

export function createCompany(body: CompanyCreatePayload) {
  return apiRequest<Company>("/companies", { method: "POST", json: body });
}

export function updateCompany(id: number, patch: CompanyUpdatePayload) {
  return apiRequest<Company>(`/companies/${id}`, { method: "PATCH", json: patch });
}

export function deleteCompany(id: number) {
  return apiRequest<void>(`/companies/${id}`, { method: "DELETE" });
}
