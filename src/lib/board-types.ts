export const BOARD_STATUSES = ["Approved", "Committed", "Completed", "Rejected"] as const;
export type BoardStatus = (typeof BOARD_STATUSES)[number];

export const BOARD_STATUS_STYLES: Record<BoardStatus, string> = {
  Approved: "bg-sky-500/10 text-sky-300",
  Committed: "bg-amber-500/10 text-amber-300",
  Completed: "bg-emerald-500/10 text-emerald-300",
  Rejected: "bg-red-500/10 text-red-300",
};

export interface Epic {
  id: string;
  title: string;
  description: string;
  sourceRequirement: string;
  status: BoardStatus;
  createdBy: string | null;
  createdAt: number;
}

export const PBI_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export type PbiPriority = (typeof PBI_PRIORITIES)[number];

export interface Pbi {
  id: string;
  epicId: string;
  title: string;
  description: string;
  priority: PbiPriority;
  status: BoardStatus;
  createdBy: string | null;
  createdAt: number;
}

export interface Task {
  id: string;
  pbiId: string;
  title: string;
  assignee: string | null;
  estimatedHours: number | null;
  completedHours: number | null;
  status: BoardStatus;
  createdBy: string | null;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
