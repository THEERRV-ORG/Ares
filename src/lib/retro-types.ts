export const RETRO_COLUMNS = [
  { id: "went_well", label: "What's Going Well" },
  { id: "needs_improvement", label: "What Needs to Change" },
  { id: "action_items", label: "Action Items" },
] as const;

export type RetroColumnId = (typeof RETRO_COLUMNS)[number]["id"];

// No author field on purpose — entries are genuinely anonymous, not just hidden in the UI.
export interface RetroItem {
  id: string;
  column: RetroColumnId;
  text: string;
  createdAt: number;
}
