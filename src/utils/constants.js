import {
  DEFAULT_APP_NAME,
  PRIORITY_OPTIONS,
  ROLE_HOME,
  ROLE_LABELS,
  ROLES,
  STATUS_OPTIONS,
} from "@shared/workspaceSchema";

export { PRIORITY_OPTIONS, ROLE_HOME, ROLE_LABELS, ROLES, STATUS_OPTIONS };

export const APP_NAME = import.meta.env.VITE_APP_NAME || DEFAULT_APP_NAME;
export const APP_ENV = import.meta.env.VITE_APP_ENV || "development";

export const DEFAULT_PAGE_SIZE = 6;

export const TICKET_STORAGE_BUCKET = "ticket-attachments";
