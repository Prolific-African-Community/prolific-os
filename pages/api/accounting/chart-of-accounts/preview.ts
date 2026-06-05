import type { NextApiResponse } from "next";
import {
  AccountingAccountGovernanceError,
  previewCustomAccountClassification,
} from "../../../../lib/accounting-account-governance";
import {
  canManageEntityAccountingSetup,
  getOptionalString,
  jsonError,
  jsonSuccess,
  parseAccountType,
} from "../../../../lib/accounting-api";
import { AuthenticatedNextApiRequest, withAuth } from "../../../../lib/auth";
import { getCurrentUserRecord } from "../../../../lib/entity-access";
import { prisma } from "../../../../lib/prisma";

interface PreviewAccountBody {
  entityId?: unknown;
  code?: unknown;
  label?: unknown;
  type?: unknown;
}

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    jsonError(res, 405, "Method not allowed");
    return;
  }

  try {
    const currentUser = await getCurrentUserRecord(req.user.id);

    if (!currentUser) {
      jsonError(res, 404, "User not found");
      return;
    }

    const body = req.body as PreviewAccountBody;
    const entityId = getOptionalString(body.entityId);
    const code = getOptionalString(body.code);
    const label = getOptionalString(body.label);
    const providedType =
      body.type === undefined || body.type === "" ? undefined : parseAccountType(body.type);

    if (!entityId) {
      jsonError(res, 400, "entityId is required");
      return;
    }

    if (!code) {
      jsonError(res, 400, "code is required");
      return;
    }

    if (!label) {
      jsonError(res, 400, "label is required");
      return;
    }

    if (body.type !== undefined && body.type !== "" && !providedType) {
      jsonError(res, 400, "A valid account type is required");
      return;
    }

    const access = await canManageEntityAccountingSetup(currentUser, entityId);

    if (!access.entity) {
      jsonError(res, 404, "Entity not found");
      return;
    }

    if (!access.allowed) {
      jsonError(res, 403, "Forbidden");
      return;
    }

    const preview = await previewCustomAccountClassification(prisma, {
      entityId,
      code,
      label,
      providedType,
    });

    jsonSuccess(res, preview);
  } catch (error) {
    if (error instanceof AccountingAccountGovernanceError) {
      jsonError(res, 400, error.message);
      return;
    }

    console.error("PREVIEW ACCOUNTING ACCOUNT ERROR:", error);
    jsonError(res, 500, "Internal server error");
  }
});
