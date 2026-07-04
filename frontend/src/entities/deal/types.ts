export type DealStatus =
  | "qualification"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface Deal {
  id: number;
  lead_id: number;
  title: string;
  amount: number;
  currency: string;
  status: DealStatus;
  probability: number;
  expected_close_date: string | null;
  closed_at: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface DealSummary {
  open_count: number;
  open_total_amount: number;
  weighted_pipeline: number;
  won_total_amount: number;
  lost_count: number;
  win_rate: number | null;
  currency: string;
  by_status: {
    status: DealStatus;
    count: number;
    total_amount: number;
  }[];
}

export interface DealCreatePayload {
  lead_id: number;
  title: string;
  amount?: number;
  currency?: string;
  status?: DealStatus;
  probability?: number;
  expected_close_date?: string | null;
  comment?: string | null;
}

export interface DealCreateForLeadPayload {
  title: string;
  amount?: number;
  currency?: string;
  status?: DealStatus;
  probability?: number;
  expected_close_date?: string | null;
  comment?: string | null;
}

export interface DealUpdatePayload {
  title?: string;
  amount?: number;
  currency?: string;
  status?: DealStatus;
  probability?: number;
  expected_close_date?: string | null;
  closed_at?: string | null;
  comment?: string | null;
  is_active?: boolean;
}
