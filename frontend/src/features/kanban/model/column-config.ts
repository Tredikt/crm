import type { LeadStatus } from "@/entities/lead/types";

export interface KanbanColumn {
  id: string;
  title: string;
  statuses: LeadStatus[];
  targetStatus: LeadStatus;
}

/** Колонки воронки: несколько backend-статусов могут попадать в одну колонку. */
export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "new",
    title: "Новые",
    statuses: ["new"],
    targetStatus: "new",
  },
  {
    id: "first_contact",
    title: "Первый контакт",
    statuses: ["first_contact", "need_identified"],
    targetStatus: "first_contact",
  },
  {
    id: "offer_sent",
    title: "Оффер отправлен",
    statuses: ["offer_sent"],
    targetStatus: "offer_sent",
  },
  {
    id: "thinking",
    title: "Думает",
    statuses: ["thinking"],
    targetStatus: "thinking",
  },
  {
    id: "follow_up",
    title: "Повторный контакт",
    statuses: ["follow_up", "postponed"],
    targetStatus: "follow_up",
  },
  {
    id: "paid",
    title: "Оплата",
    statuses: ["paid"],
    targetStatus: "paid",
  },
  {
    id: "rejected",
    title: "Отказ",
    statuses: ["rejected"],
    targetStatus: "rejected",
  },
];

export function columnForLeadStatus(status: LeadStatus): KanbanColumn | undefined {
  return KANBAN_COLUMNS.find((c) => c.statuses.includes(status));
}
