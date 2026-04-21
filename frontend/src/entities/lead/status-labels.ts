import type { LeadStatus } from "@/entities/lead/types";

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Новый",
  first_contact: "Первый контакт",
  need_identified: "Потребность выявлена",
  offer_sent: "Оффер отправлен",
  thinking: "Думает",
  follow_up: "Повторный контакт",
  paid: "Оплата",
  postponed: "Отложено",
  rejected: "Отказ",
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "new",
  "first_contact",
  "need_identified",
  "offer_sent",
  "thinking",
  "follow_up",
  "paid",
  "postponed",
  "rejected",
];

export function formatLeadStatus(status: LeadStatus): string {
  return LEAD_STATUS_LABEL[status] ?? status;
}
