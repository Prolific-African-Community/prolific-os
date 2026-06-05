import {
  AccountType,
  AccountingStandard,
  OrganizationRole,
  Prisma,
  TransactionType,
} from '@prisma/client';
import type { NextApiResponse } from 'next';
import { CurrentUserRecord, isSuperAdminUser } from './entity-access';
import { canManageAccountingSetup } from './permissions';
import { prisma } from './prisma';

interface JournalLineAmount {
  debit: Prisma.Decimal | string | number;
  credit: Prisma.Decimal | string | number;
  currency: string;
}

export class AccountingValidationError extends Error {}

export const jsonError = (res: NextApiResponse, status: number, message: string) => {
  return res.status(status).json({ success: false, message });
};

export const jsonSuccess = <T>(res: NextApiResponse, data: T, status = 200) => {
  return res.status(status).json({ success: true, data });
};

export const getQueryString = (value: string | string[] | undefined): string | null => {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

export const getOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

export const parseAmount = (value: unknown): Prisma.Decimal | null => {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }

  try {
    const amount = new Prisma.Decimal(value);
    return amount.isFinite() && amount.greaterThan(0) ? amount : null;
  } catch {
    return null;
  }
};

export const parseDate = (value: unknown): Date | null => {
  if (value === undefined || value === null || value === '') {
    return new Date();
  }

  if (typeof value !== 'string') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const parseOptionalDateFilter = (value: string | string[] | undefined): Date | null => {
  const rawValue = getQueryString(value);

  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const parseTransactionType = (value: unknown): TransactionType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return Object.values(TransactionType).includes(value as TransactionType)
    ? (value as TransactionType)
    : null;
};

export const parseAccountType = (value: unknown): AccountType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return Object.values(AccountType).includes(value as AccountType)
    ? (value as AccountType)
    : null;
};

export const parseAccountingStandard = (value: unknown): AccountingStandard | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return Object.values(AccountingStandard).includes(value as AccountingStandard)
    ? (value as AccountingStandard)
    : null;
};

export const parseOptionalBoolean = (value: unknown): boolean | null => {
  if (value === undefined) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return null;
};

export const parseOptionalInteger = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

export const deriveAccountClassFromCode = (code: string): string | undefined => {
  const trimmedCode = code.trim();
  const firstDigit = trimmedCode[0];
  return /^\d$/.test(firstDigit) ? firstDigit : undefined;
};

export const canManageEntityAccountingSetup = async (
  currentUser: CurrentUserRecord,
  entityId: string
) => {
  const entity = await prisma.entity.findUnique({ where: { id: entityId } });
  return {
    entity,
    allowed: entity ? await canManageAccountingSetup(currentUser, entityId) : false,
  };
};

export const applyDescriptionTemplate = (
  template: string | null,
  description: string | undefined,
  transactionType: TransactionType
): string => {
  const fallback = description || transactionType;
  return template ? template.replace(/\{description\}/g, fallback) : fallback;
};

export const sumJournalLines = (lines: JournalLineAmount[]) => {
  return lines.reduce(
    (totals, line) => ({
      debit: totals.debit.plus(new Prisma.Decimal(line.debit)),
      credit: totals.credit.plus(new Prisma.Decimal(line.credit)),
    }),
    {
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal(0),
    }
  );
};

export const validateBalancedJournalEntry = (lines: JournalLineAmount[]): string | null => {
  if (lines.length < 2) {
    return 'Journal entry must have at least 2 lines';
  }

  const currencies = new Set<string>();

  for (const line of lines) {
    const debit = new Prisma.Decimal(line.debit);
    const credit = new Prisma.Decimal(line.credit);

    if (debit.isNegative() || credit.isNegative()) {
      return 'Journal line debit and credit amounts cannot be negative';
    }

    if (debit.greaterThan(0) && credit.greaterThan(0)) {
      return 'A journal line cannot contain both a debit and a credit amount';
    }

    if (debit.equals(0) && credit.equals(0)) {
      return 'A journal line must contain either a debit or a credit amount';
    }

    currencies.add(line.currency);
  }

  if (currencies.size !== 1) {
    return 'All journal lines must use the same currency';
  }

  const totals = sumJournalLines(lines);

  if (!totals.debit.equals(totals.credit)) {
    return 'Journal entry debit and credit totals must be equal';
  }

  if (!totals.debit.greaterThan(0)) {
    return 'Journal entry total debit must be greater than 0';
  }

  return null;
};

export const decimalToString = (value: Prisma.Decimal | string | number) => {
  return new Prisma.Decimal(value).toFixed(2);
};
