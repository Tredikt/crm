import type { DealStatus } from "./types";

const LABELS: Record<DealStatus, string> = {
  qualification: "Квалификация",
  proposal: "Предложение",
  negotiation: "Переговоры",
  won: "Выиграна",
  lost: "Проиграна",
};

export const DEAL_STATUS_ORDER: DealStatus[] = [
  "qualification",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export const DEAL_STATUS_OPTIONS = DEAL_STATUS_ORDER;

export const OPEN_DEAL_STATUSES: DealStatus[] = [
  "qualification",
  "proposal",
  "negotiation",
];

export function formatDealStatus(status: DealStatus): string {
  return LABELS[status] ?? status;
}

export function defaultProbabilityForStatus(status: DealStatus): number {
  switch (status) {
    case "qualification":
      return 10;
    case "proposal":
      return 40;
    case "negotiation":
      return 70;
    case "won":
      return 100;
    case "lost":
      return 0;
    default:
      return 10;
  }
}

export function formatMoney(amount: number, currency = "RUB"): string {
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("ru-RU")} ${currency}`;
  }
}
