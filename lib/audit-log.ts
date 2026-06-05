import { Prisma, PrismaClient } from "@prisma/client";

type AuditClient = Pick<PrismaClient | Prisma.TransactionClient, "auditLog">;

interface AuditLogInput {
  userId?: string | null;
  organizationId?: string | null;
  entityId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: unknown;
}

const SENSITIVE_KEYS = [
  "password",
  "passwordhash",
  "temporarypassword",
  "token",
  "secret",
  "authorization",
];

const sanitizeAuditValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeAuditValue);
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SENSITIVE_KEYS.includes(key.toLowerCase()))
      .map(([key, nestedValue]) => [key, sanitizeAuditValue(nestedValue)])
  );
};

export const createAuditLog = async (
  client: AuditClient,
  input: AuditLogInput
) => {
  const metadata =
    input.metadata === undefined
      ? undefined
      : (sanitizeAuditValue(input.metadata) as Prisma.InputJsonValue);
  const resourceId =
    input.resourceId || input.entityId || input.organizationId || "platform";

  return client.auditLog.create({
    data: {
      userId: input.userId || null,
      organizationId: input.organizationId || null,
      entityId: input.entityId || null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId || null,
      metadata,
      // Keep historical fields populated while legacy journal logic is phased out.
      entityType: input.resourceType,
      entityRecordId: resourceId,
      after: metadata,
    },
  });
};
