import { AccountingPeriodStatus, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export class AccountingPeriodValidationError extends Error {}

export const findAccountingPeriodForDate = async (
  entityId: string,
  date: Date,
  client: Pick<PrismaClient, "accountingPeriod"> = prisma
) =>
  client.accountingPeriod.findFirst({
    where: {
      entityId,
      startDate: { lte: date },
      endDate: { gte: date },
    },
    orderBy: { startDate: "desc" },
  });

export const assertOpenAccountingPeriod = async (
  entityId: string,
  date: Date,
  options: {
    client?: Pick<PrismaClient, "accountingPeriod">;
    missingMessage?: string;
  } = {}
) => {
  const period = await findAccountingPeriodForDate(
    entityId,
    date,
    options.client || prisma
  );

  if (!period) {
    throw new AccountingPeriodValidationError(
      options.missingMessage ||
        "No open accounting period found for this journal entry date."
    );
  }

  if (period.status !== AccountingPeriodStatus.OPEN) {
    throw new AccountingPeriodValidationError(
      "Accounting period is closed or locked."
    );
  }

  return period;
};
