import type { Deal, DealStatus } from "./types";

export function isTerminalDealStatus(status: DealStatus): boolean {
  return status === "won" || status === "lost";
}

export function isDealOverdue(deal: Pick<Deal, "status" | "expected_close_date">): boolean {
  if (isTerminalDealStatus(deal.status) || !deal.expected_close_date) return false;
  return new Date(deal.expected_close_date) < new Date();
}

export function dealSortKey(deal: Pick<Deal, "expected_close_date">): number {
  if (!deal.expected_close_date) return Number.MAX_SAFE_INTEGER;
  return new Date(deal.expected_close_date).getTime();
}
