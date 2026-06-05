import type { NextApiResponse } from "next";
import {
  getOptionalString,
  jsonError,
  jsonSuccess,
  parseOptionalBoolean,
  parseOptionalInteger,
  parseTransactionType,
} from "../../../../../lib/accounting-api";
import {
  getCurrentUserRecord,
  isSuperAdminUser,
} from "../../../../../lib/entity-access";
import { AuthenticatedNextApiRequest, withAuth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

interface CreateTemplateRuleBody {
  transactionType?: unknown;
  debitAccountCode?: unknown;
  creditAccountCode?: unknown;
  descriptionTemplate?: unknown;
  priority?: unknown;
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

    const body = req.body as CreateTemplateRuleBody;
    const transactionType = parseTransactionType(body.transactionType);
    const debitAccountCode = getOptionalString(body.debitAccountCode);
    const creditAccountCode = getOptionalString(body.creditAccountCode);
    const descriptionTemplate = getOptionalString(body.descriptionTemplate);
    const priority = parseOptionalInteger(body.priority) ?? 100;
    const isActive = parseOptionalBoolean(body.isActive) ?? true;

    if (!transactionType) {
      jsonError(res, 400, "A valid transaction type is required");
      return;
    }

    if (!debitAccountCode || !creditAccountCode) {
      jsonError(res, 400, "debitAccountCode and creditAccountCode are required");
      return;
    }

    if (debitAccountCode === creditAccountCode) {
      jsonError(res, 400, "Debit and credit accounts must be different");
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

    const [debitAccount, creditAccount] = await Promise.all([
      prisma.accountingTemplateAccount.findUnique({
        where: {
          templateId_code: {
            templateId,
            code: debitAccountCode,
          },
        },
      }),
      prisma.accountingTemplateAccount.findUnique({
        where: {
          templateId_code: {
            templateId,
            code: creditAccountCode,
          },
        },
      }),
    ]);

    if (!debitAccount || !creditAccount) {
      jsonError(res, 400, "Debit and credit accounts must exist in the template");
      return;
    }

    const duplicate = await prisma.accountingTemplateRule.findFirst({
      where: {
        templateId,
        transactionType,
        debitAccountCode,
        creditAccountCode,
        isActive: true,
      },
      select: { id: true },
    });

    if (duplicate) {
      jsonError(res, 400, "An active matching template rule already exists");
      return;
    }

    const rule = await prisma.accountingTemplateRule.create({
      data: {
        templateId,
        transactionType,
        debitAccountCode,
        creditAccountCode,
        descriptionTemplate,
        priority,
        isActive,
      },
    });

    jsonSuccess(res, rule, 201);
  }
);
