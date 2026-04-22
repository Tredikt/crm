import type { Tag } from "@/entities/tag/types";

export type LeadStatus =
  | "new"
  | "in_work"
  | "first_contact"
  | "need_identified"
  | "offer_sent"
  | "thinking"
  | "follow_up"
  | "paid"
  | "postponed"
  | "rejected";

export interface Lead {
  id: number;
  full_name: string;
  username: string | null;
  telegram_id: number | null;
  phone: string | null;
  profile_url: string | null;
  source: string | null;
  niche: string | null;
  comment: string | null;
  status: LeadStatus;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_at: string | null;
  budget: string | null;
  is_active: boolean;
  tag_ids: number[] | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

/** Тело POST /leads — необязательные поля можно не передавать или передать null */
export interface LeadCreatePayload {
  full_name: string;
  username?: string | null;
  telegram_id?: number | null;
  phone?: string | null;
  profile_url?: string | null;
  source?: string | null;
  niche?: string | null;
  comment?: string | null;
  status?: LeadStatus;
  next_action?: string | null;
  next_action_at?: string | null;
  budget?: string | null;
  is_active?: boolean;
  tag_ids?: number[] | null;
}

export interface LeadUpdatePayload {
  full_name?: string;
  username?: string | null;
  telegram_id?: number | null;
  phone?: string | null;
  profile_url?: string | null;
  source?: string | null;
  niche?: string | null;
  comment?: string | null;
  status?: LeadStatus;
  last_contact_at?: string | null;
  next_action?: string | null;
  next_action_at?: string | null;
  budget?: string | null;
  is_active?: boolean;
  tag_ids?: number[] | null;
}
