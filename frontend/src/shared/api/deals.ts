import type {
  Deal,
  DealCreateForLeadPayload,
  DealCreatePayload,
  DealStatus,
  DealSummary,
  DealUpdatePayload,
} from "@/entities/deal/types";
import { apiRequest } from "@/shared/api/http";

export function fetchDeals(params?: {
  status?: DealStatus;
  lead_id?: number;
  open_only?: boolean;
  include_inactive?: boolean;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.lead_id != null) q.set("lead_id", String(params.lead_id));
  if (params?.open_only) q.set("open_only", "true");
  if (params?.include_inactive) q.set("include_inactive", "true");
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return apiRequest<Deal[]>(`/deals${qs ? `?${qs}` : ""}`);
}

export function fetchDealsOpen() {
  return apiRequest<Deal[]>(`/deals/open`);
}

export function fetchDealsOverdue() {
  return apiRequest<Deal[]>(`/deals/overdue`);
}

export function fetchDealsSummary() {
  return apiRequest<DealSummary>(`/deals/summary`);
}

export function fetchDeal(id: number) {
  return apiRequest<Deal>(`/deals/${id}`);
}

export function createDeal(body: DealCreatePayload) {
  return apiRequest<Deal>("/deals", { method: "POST", json: body });
}

export function createDealForLead(leadId: number, body: DealCreateForLeadPayload) {
  return apiRequest<Deal>(`/leads/${leadId}/deals`, { method: "POST", json: body });
}

export function updateDeal(id: number, patch: DealUpdatePayload) {
  return apiRequest<Deal>(`/deals/${id}`, { method: "PATCH", json: patch });
}

export function deleteDeal(id: number) {
  return apiRequest<void>(`/deals/${id}`, { method: "DELETE" });
}

export function fetchLeadDeals(leadId: number, include_inactive = false) {
  const q = include_inactive ? "?include_inactive=true" : "";
  return apiRequest<Deal[]>(`/leads/${leadId}/deals${q}`);
}

export type { DealStatus };
