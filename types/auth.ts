export type AuthUserProfile = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerIds: string[];
};
