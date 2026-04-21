export const queryKeys = {
  leads: {
    all: ["leads"] as const,
    list: (params?: Record<string, unknown>) => ["leads", "list", params] as const,
    detail: (id: number) => ["leads", "detail", id] as const,
    interactions: (id: number) => ["leads", id, "interactions"] as const,
    noContact: (days: number) => ["leads", "no-contact", days] as const,
    nextActionDue: () => ["leads", "next-action-due"] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    list: (params?: Record<string, unknown>) => ["tasks", "list", params] as const,
    today: () => ["tasks", "today"] as const,
    overdue: () => ["tasks", "overdue"] as const,
    detail: (id: number) => ["tasks", "detail", id] as const,
  },
  projects: {
    all: ["projects"] as const,
    listPreset: (preset: string) => ["projects", "preset", preset] as const,
    listParams: (params: Record<string, unknown>) =>
      ["projects", "list", params] as const,
    detail: (id: number) => ["projects", "detail", id] as const,
    byLead: (leadId: number, includeInactive?: boolean) =>
      ["projects", "lead", leadId, Boolean(includeInactive)] as const,
  },
};
