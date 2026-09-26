/**
 * Heuristic spam check for contact-form messages. It only flags — flagged messages are
 * still stored (status "Spam") so a false positive can be rescued from the inbox; they just
 * skip the email alert. Returns the reasons, empty when the message looks genuine.
 */

const SPAM_PHRASES = [
  "seo",
  "backlink",
  "first page of google",
  "google first page",
  "rank your website",
  "guaranteed",
  "casino",
  "betting",
  "loan offer",
  "viagra",
  "increase your traffic",
  "web traffic",
  "guest post",
  "price list",
  "whatsapp me",
  "limited time offer",
  "dear sir/madam",
];

const MAX_LINKS = 2;

interface Fields {
  fullName: string;
  company: string;
  email: string;
  details: string;
}

export function spamReasons({ fullName, company, email, details }: Fields): string[] {
  const reasons: string[] = [];
  const text = `${fullName} ${company} ${details}`.toLowerCase();

  const phrases = SPAM_PHRASES.filter((p) => new RegExp(`\\b${p.replace(/[/]/g, "\\/")}\\b`).test(text));
  // One phrase alone is weak evidence — real clients say "SEO" or "guaranteed" too — except
  // for the few that essentially never appear in a genuine software enquiry.
  const strong = phrases.some((p) => /backlink|casino|viagra|betting|guest post/.test(p));
  if (phrases.length >= 2 || strong) {
    reasons.push(`Spam phrases: ${phrases.slice(0, 3).join(", ")}`);
  }

  const links = details.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (links > MAX_LINKS) reasons.push(`${links} links in the message`);

  if (/https?:\/\/|www\./i.test(fullName)) reasons.push("Link in the name field");

  const letters = details.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 40 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6) {
    reasons.push("Mostly capital letters");
  }

  if ((details.match(/!/g)?.length ?? 0) >= 5) reasons.push("Lots of exclamation marks");

  if (/<a\s|\[url=|\[link=/i.test(details)) reasons.push("Contains HTML or forum link markup");

  if (details.trim().length < 15) reasons.push("Message is very short");

  if (/@(mailinator|guerrillamail|10minutemail|tempmail|yopmail)\./i.test(email)) {
    reasons.push("Disposable email address");
  }

  return reasons;
}
