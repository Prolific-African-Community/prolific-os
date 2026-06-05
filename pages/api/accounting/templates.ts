import { AccountingStandard } from "@prisma/client";
import type { NextApiResponse } from "next";
import {
  getOptionalString,
  getQueryString,
  jsonError,
  jsonSuccess,
  parseAccountingStandard,
  parseOptionalBoolean,
} from "../../../lib/accounting-api";
import {
  getCurrentUserRecord,
  isSuperAdminUser,
} from "../../../lib/entity-access";
import { AuthenticatedNextApiRequest, withAuth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { canViewAccountingTemplates } from "../../../lib/permissions";

interface CreateTemplateBody {
  name?: unknown;
  version?: unknown;
  jurisdiction?: unknown;
  standard?: unknown;
  description?: unknown;
  isSystem?: unknown;
}

export default withAuth(
  async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
    const currentUser = await getCurrentUserRecord(req.user.id);

    if (!currentUser) {
      jsonError(res, 404, "User not found");
      return;
    }

    if (req.method === "GET") {
      if (!canViewAccountingTemplates(currentUser)) {
        jsonError(res, 403, "Forbidden");
        return;
      }

      const includeInactive =
        getQueryString(req.query.includeInactive) === "true" &&
        isSuperAdminUser(currentUser);

      const templates = await prisma.accountingTemplate.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }, { version: "desc" }],
        include: {
          _count: {
            select: {
              accounts: true,
              rules: true,
            },
          },
        },
      });

      jsonSuccess(
        res,
        templates.map((template) => ({
          id: template.id,
          name: template.name,
          version: template.version,
          jurisdiction: template.jurisdiction,
          standard: template.standard,
          description: template.description,
          isSystem: template.isSystem,
          isActive: template.isActive,
          accountsCount: template._count.accounts,
          rulesCount: template._count.rules,
        }))
      );
      return;
    }

    if (req.method !== "POST") {
      jsonError(res, 405, "Method not allowed");
      return;
    }

    if (!isSuperAdminUser(currentUser)) {
      jsonError(res, 403, "Forbidden");
      return;
    }

    const body = req.body as CreateTemplateBody;
    const name = getOptionalString(body.name);
    const version = getOptionalString(body.version) || "1.0.0";
    const jurisdiction = getOptionalString(body.jurisdiction);
    const standard = parseAccountingStandard(body.standard);
    const description = getOptionalString(body.description);
    const isSystem = parseOptionalBoolean(body.isSystem) ?? false;

    if (!name) {
      jsonError(res, 400, "name is required");
      return;
    }

    if (!jurisdiction) {
      jsonError(res, 400, "jurisdiction is required");
      return;
    }

    if (!standard) {
      jsonError(res, 400, "A valid accounting standard is required");
      return;
    }

    const duplicate = await prisma.accountingTemplate.findFirst({
      where: {
        name,
        version,
        jurisdiction,
        standard,
      },
      select: { id: true },
    });

    if (duplicate) {
      jsonError(res, 400, "A matching accounting template already exists");
      return;
    }

    const template = await prisma.accountingTemplate.create({
      data: {
        name,
        version,
        jurisdiction,
        standard: standard || AccountingStandard.LUX_GAAP,
        description,
        isSystem,
        isActive: true,
      },
    });

    jsonSuccess(res, template, 201);
  }
);
