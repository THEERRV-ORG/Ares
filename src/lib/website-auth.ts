import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Server-side check for the website publishing API: the request must carry the caller's
 * Firebase ID token (`Authorization: Bearer <token>`), and that user must be an approved
 * member with `websiteAccess: true` in /members — the same flag the UI gates on.
 *
 * The token is verified against Google's published keys (no service account needed), then
 * the member doc is read through the Firestore REST API *as that user*, so the existing
 * security rules decide what they can see.
 */

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export interface WebsiteUser {
  uid: string;
  email: string;
  name: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: 401 | 403,
  ) {
    super(message);
  }
}

export async function requireWebsiteUser(req: Request): Promise<WebsiteUser> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new AuthError("Firebase project is not configured", 401);

  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new AuthError("Not signed in", 401);

  let uid: string;
  let email: string;
  let name: string;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    uid = String(payload.sub ?? "");
    email = String(payload.email ?? "");
    name = String(payload.name ?? email);
    if (!uid) throw new Error("no subject");
  } catch {
    throw new AuthError("Invalid or expired sign-in — refresh the page", 401);
  }

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/members/${uid}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) throw new AuthError("Not an approved member", 403);
  const member = (await res.json()) as { fields?: { websiteAccess?: { booleanValue?: boolean } } };
  if (member.fields?.websiteAccess?.booleanValue !== true) {
    throw new AuthError("Website access is required", 403);
  }

  return { uid, email, name };
}
