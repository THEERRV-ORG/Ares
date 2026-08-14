export interface TeamMember {
  name: string;
  designation: string;
}

// Edit this list directly to add/remove/update team members — not pulled from the database,
// since not everyone doing work has (or needs) an Ares account.
export const TEAM_MEMBERS: TeamMember[] = [
  { name: "Thilak Gautham", designation: "CHIEF EXECUTIVE OFFICER" },
  { name: "Kodi", designation: "HEAD OF BUSINESS DEVELOPMENT" },
  { name: "LOKESH GANESHRAM", designation: "CHIEF OPERATIONS OFFICER" },
  { name: "GOUTHAM", designation: "CHIEF TECHNOLOGY OFFICER" },
  { name: "KARTHIKEYAN", designation: "HEAD OF ENGINEERING" },
];
