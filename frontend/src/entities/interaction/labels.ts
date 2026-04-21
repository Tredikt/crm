import type { InteractionType } from "./types";

const TYPE_LABELS: Record<InteractionType, string> = {
  note: "Заметка",
  call: "Звонок",
  message: "Сообщение",
  telegram: "Telegram",
  email: "Почта",
  meeting: "Встреча",
  other: "Другое",
};

export function formatInteractionType(type: InteractionType): string {
  return TYPE_LABELS[type] ?? type;
}
