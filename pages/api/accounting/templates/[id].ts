import type { NextApiResponse } from "next";
import { jsonError, jsonSuccess } from "../../../../lib/accounting-api";
import {
  getCurrentUserRecord,
  isSuperAdminUser,
} from "../../../../lib/entity-access";
import { AuthenticatedNextApiRequest, withAuth } from "../../../../lib/auth";
import { canViewAccountingTemplates } from "../../../../lib/permissions";
import { prisma } from "../../../../lib/prisma";

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      jsonError(res, 405, "Method not allowed");
      return;
    }

    const templateId = typeof req.query.id === "string" ? req.query.id : null;

    if (!templateId) {
      jsonError(res, 400, "Template id is required");
      return;
    }

    const currentUser = await getCurrentUserRecord(req.user.id);

    if (!currentUser) {
      jsonError(res, 404, "User not found");
      return;
    }

    if (!canViewAccountingTemplates(currentUser)) {
      jsonError(res, 403, "Forbidden");
      return;
    }

    const template = await prisma.accountingTemplate.findUnique({
      where: { id: templateId },
      include: {
        accounts: {
          orderBy: { code: "asc" },
        },
        rules: {
          orderBy: [{ priority: "asc" }, { transactionType: "asc" }],
        },
      },
    });

    if (!template || (!template.isActive && !isSuperAdminUser(currentUser))) {
      jsonError(res, 404, "Accounting template not found");
      return;
    }

    const { accounts, rules, ...templateData } = template;
    jsonSuccess(res, {
      template: templateData,
      accounts,
      rules,
    });
  }
);
