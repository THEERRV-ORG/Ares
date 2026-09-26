export const SUBMISSION_STATUSES = ["New", "Read", "Replied", "Closed", "Spam"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_STATUS_STYLES: Record<SubmissionStatus, string> = {
  New: "bg-sky-500/10 text-sky-300",
  Read: "bg-white/10 text-white/60",
  Replied: "bg-emerald-500/10 text-emerald-300",
  Closed: "bg-violet-500/10 text-violet-300",
  Spam: "bg-red-500/10 text-red-300",
};

/**
 * A message sent through the contact form on theerrv.com. Created only by /api/contact
 * (via the contact bot); members can then change status and assignee, nothing else.
 */
export interface ContactSubmission {
  id: string;
  fullName: string;
  company: string;
  email: string;
  phone: string;
  service: string;
  details: string;
  status: SubmissionStatus;
  assignee: string | null;
  createdAt: number;
  updatedAt: number | null;
  updatedBy: string | null;
  /** Set when /api/contact auto-flagged the message as spam — why it looked like spam. */
  spamReasons?: string[];
}

/** Field limits — enforced by /api/contact and mirrored in firestore.rules. */
export const SUBMISSION_LIMITS = {
  fullName: 100,
  company: 150,
  email: 200,
  phone: 30,
  service: 100,
  details: 5000,
} as const;

/**
 * Canned replies for the inbox. {name} and {service} are filled in from the message; the
 * text opens in the member's own mail app, so it can be edited before sending.
 */
export const REPLY_TEMPLATES = [
  {
    id: "thanks",
    label: "Thanks — let's talk",
    subject: "Re: Your enquiry to Theerrv Technologies",
    body: `Hi {name},

Thanks for reaching out about {service}. We'd love to learn more about what you're building.

Could you share a couple of times that suit you for a 20-minute call this week? We'll come prepared with a few questions so we can give you a useful answer quickly.

Best regards,
Theerrv Technologies`,
  },
  {
    id: "more-info",
    label: "Need more details",
    subject: "Re: Your enquiry to Theerrv Technologies",
    body: `Hi {name},

Thanks for your message. To point you in the right direction, could you tell us a little more about:

- What you'd like the software to do
- Who will use it, and roughly how many people
- Any timeline or budget you have in mind

Best regards,
Theerrv Technologies`,
  },
  {
    id: "estimate",
    label: "Estimate on the way",
    subject: "Re: Your enquiry to Theerrv Technologies",
    body: `Hi {name},

Thanks for the details on {service}. We're putting together an estimate and will send it within two working days.

If anything changes in the meantime, just reply to this email.

Best regards,
Theerrv Technologies`,
  },
  {
    id: "not-a-fit",
    label: "Not a fit",
    subject: "Re: Your enquiry to Theerrv Technologies",
    body: `Hi {name},

Thank you for thinking of us. Unfortunately this isn't something we're the right team for at the moment, and we'd rather tell you now than hold you up.

We wish you the best with the project.

Best regards,
Theerrv Technologies`,
  },
] as const;

export function fillTemplate(text: string, s: Pick<ContactSubmission, "fullName" | "service">) {
  const firstName = s.fullName.trim().split(/\s+/)[0] || "there";
  return text.replace(/\{name\}/g, firstName).replace(/\{service\}/g, s.service || "your project");
}
