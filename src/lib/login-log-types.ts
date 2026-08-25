export interface LoginLogEntry {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  userAgent: string | null;
  signedInAt: number;
}
