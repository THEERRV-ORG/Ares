export const BOARD_STATUSES = [
  "Not Started",
  "Approved",
  "Committed",
  "Completed",
  "Rejected",
] as const;
export type BoardStatus = (typeof BOARD_STATUSES)[number];

export const BOARD_STATUS_STYLES: Record<BoardStatus, string> = {
  "Not Started": "bg-white/10 text-white/60",
  Approved: "bg-sky-500/10 text-sky-300",
  Committed: "bg-amber-500/10 text-amber-300",
  Completed: "bg-emerald-500/10 text-emerald-300",
  Rejected: "bg-red-500/10 text-red-300",
};

export const ROADMAP_TIMEFRAMES = ["Now", "Next", "Later"] as const;
export type RoadmapTimeframe = (typeof ROADMAP_TIMEFRAMES)[number];

export interface Epic {
  id: string;
  title: string;
  description: string;
  sourceRequirement: string;
  status: BoardStatus;
  assignees: string[];
  timeframe: RoadmapTimeframe | null;
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
  assignee: string | null;
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

export interface DiscussionEntry {
  id: string;
  text: string;
  authorName: string;
  authorEmail: string | null;
  createdAt: number;
  editedAt: number | null;
}

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Won",
  "Lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  New: "bg-sky-500/10 text-sky-300",
  Contacted: "bg-amber-500/10 text-amber-300",
  Qualified: "bg-violet-500/10 text-violet-300",
  "Proposal Sent": "bg-orange-500/10 text-orange-300",
  Won: "bg-emerald-500/10 text-emerald-300",
  Lost: "bg-red-500/10 text-red-300",
};

export const LEAD_SOURCES = [
  "Referral",
  "Website",
  "Cold Outreach",
  "Social Media",
  "Event",
  "Other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  value: number | null;
  notes: string;
  assignee: string | null;
  createdBy: string | null;
  createdAt: number;
}
