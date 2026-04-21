export type InteractionType =
  | "note"
  | "call"
  | "message"
  | "telegram"
  | "email"
  | "meeting"
  | "other";

export interface Interaction {
  id: number;
  lead_id: number;
  type: InteractionType;
  text: string;
  created_at: string;
}
