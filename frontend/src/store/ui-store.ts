import { create } from "zustand";

interface UIState {
  /** Lead id для быстрого превью в канбане (модалка) */
  kanbanPreviewLeadId: number | null;
  setKanbanPreviewLeadId: (id: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  kanbanPreviewLeadId: null,
  setKanbanPreviewLeadId: (id) => set({ kanbanPreviewLeadId: id }),
}));
