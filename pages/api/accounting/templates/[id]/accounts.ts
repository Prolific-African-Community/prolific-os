import type { NextApiResponse } from "next";
import {
  deriveAccountClassFromCode,
  getOptionalString,
  jsonError,
  jsonSuccess,
  parseAccountType,
  parseOptionalBoolean,
} from "../../../../../lib/accounting-api";
import {
  getCurrentUserRecord,
  isSuperAdminUser,
} from "../../../../../lib/entity-access";
import { AuthenticatedNextApiRequest, withAuth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

interface CreateTemplateAccountBody {
  code?: unknown;
  label?: unknown;
  accountClass?: unknown;
  type?: unknown;
  isActive?: unknown;
}

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      jsonError(res, 405, "Method not allowed");
      return;
    }

    const currentUser = await getCurrentUserRecord(req.user.id);

    if (!currentUser) {
      jsonError(res, 404, "User not found");
      return;
    }

    if (!isSuperAdminUser(currentUser)) {
      jsonError(res, 403, "Forbidden");
      return;
    }

    const templateId = typeof req.query.id === "string" ? req.query.id : null;

    if (!templateId) {
      jsonError(res, 400, "Template id is required");
      return;
    }

    const template = await prisma.accountingTemplate.findUnique({
      where: { id: templateId },
      select: { id: true },
    });

    if (!template) {
      jsonError(res, 404, "Accounting template not found");
      return;
    }

    const body = req.body as CreateTemplateAccountBody;
    const code = getOptionalString(body.code);
    const label = getOptionalString(body.label);
    const type = parseAccountType(body.type);
    const isActive = parseOptionalBoolean(body.isActive) ?? true;

    if (!code) {
      jsonError(res, 400, "code is required");
      return;
    }

    if (!label) {
      jsonError(res, 400, "label is required");
      return;
    }

    if (!type) {
      jsonError(res, 400, "A valid account type is required");
      return;
    }

    const accountClass =
      getOptionalString(body.accountClass) || deriveAccountClassFromCode(code);

    if (!accountClass) {
      jsonError(res, 400, "accountClass is required");
      return;
    }

    const duplicate = await prisma.accountingTemplateAccount.findUnique({
      where: {
        templateId_code: {
          templateId,
          code,
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      jsonError(res, 400, "An account with this code already exists in the template");
      return;
    }

    const account = await prisma.accountingTemplateAccount.create({
      data: {
        templateId,
        code,
        label,
        accountClass,
        type,
        isActive,
      },
    });

    jsonSuccess(res, account, 201);
  }
);
