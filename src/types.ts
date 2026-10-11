export type MailAccount = {
  id: string;
  name: string;
  email: string;
  username: string;
  sessionUrl: string;
  apiUrl: string;
  accountId: string;
  managementAccountId?: string;
};

export type AdminAccess = {
  permissions: string[];
  edition?: string;
  locale?: string;
};

export type MailItem = {
  id: string;
  subject: string;
  preview: string;
  receivedAt: string;
  from?: { name?: string; email: string }[];
  keywords?: Record<string, boolean>;
};

export type ManagedAccount = {
  id: string;
  name: string;
  emailAddress: string;
  description?: string;
  permissions?: Record<string, unknown>;
};

export type TemporaryAddress = {
  id: string;
  email: string;
  description?: string;
  enabled: boolean;
  expiresAt?: string;
};
