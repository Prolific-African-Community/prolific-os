import { AccountType, ChartOfAccount, PrismaClient } from "@prisma/client";

export class AccountingAccountGovernanceError extends Error {}

export interface CustomAccountClassification {
  code: string;
  label: string;
  accountClass: string;
  suggestedType: AccountType | null;
  parentAccount: Pick<ChartOfAccount, "id" | "code" | "label" | "type"> | null;
  confidence: "PARENT" | "INFERRED" | "MANUAL_REQUIRED";
  warnings: string[];
}

const normalizeLabel = (label: string) =>
  label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const includesIndicator = (label: string, indicators: string[]) =>
  indicators.some((indicator) => label.includes(normalizeLabel(indicator)));

const CLASS_ONE_LIABILITY_INDICATORS = [
  "dette",
  "dettes",
  "loan",
  "loans",
  "emprunt",
  "emprunts",
  "borrowing",
  "borrowings",
  "provision",
  "provisions",
];

const CLASS_FOUR_ASSET_INDICATORS = [
  "client",
  "clients",
  "customer",
  "customers",
  "créance",
  "créances",
  "receivable",
  "debtor",
  "débiteur",
  "débiteurs",
  "à recevoir",
  "avances et acomptes versés",
];

const CLASS_FOUR_LIABILITY_INDICATORS = [
  "fournisseur",
  "fournisseurs",
  "supplier",
  "suppliers",
  "payable",
  "creditor",
  "créditeur",
  "créditeurs",
  "dette",
  "dettes",
  "à payer",
  "tva due",
  "sécurité sociale",
  "administration",
  "avances et acomptes reçus",
];

const CLASS_FIVE_LIABILITY_INDICATORS = [
  "overdraft",
  "credit facility",
  "bank liability",
  "découvert bancaire",
];

export const deriveAccountClass = (code: string): string => {
  const normalizedCode = code.trim();

  if (!/^\d+$/.test(normalizedCode)) {
    throw new AccountingAccountGovernanceError("Account code must contain digits only");
  }

  const accountClass = normalizedCode.charAt(0);

  if (!/^[1-7]$/.test(accountClass)) {
    throw new AccountingAccountGovernanceError(
      "Account code must belong to classes 1 to 7"
    );
  }

  return accountClass;
};

const inferAccountTypeDetails = (
  code: string,
  label: string
): { type: AccountType | null; warnings: string[] } => {
  const accountClass = deriveAccountClass(code);
  const normalizedLabel = normalizeLabel(label);
  const warnings: string[] = [];

  if (accountClass === "1") {
    return {
      type: includesIndicator(normalizedLabel, CLASS_ONE_LIABILITY_INDICATORS)
        ? AccountType.LIABILITY
        : AccountType.EQUITY,
      warnings,
    };
  }

  if (accountClass === "2" || accountClass === "3") {
    return { type: AccountType.ASSET, warnings };
  }

  if (accountClass === "4") {
    const looksLikeAsset = includesIndicator(
      normalizedLabel,
      CLASS_FOUR_ASSET_INDICATORS
    );
    const looksLikeLiability = includesIndicator(
      normalizedLabel,
      CLASS_FOUR_LIABILITY_INDICATORS
    );

    if (looksLikeAsset !== looksLikeLiability) {
      return {
        type: looksLikeAsset ? AccountType.ASSET : AccountType.LIABILITY,
        warnings,
      };
    }

    warnings.push(
      "Class 4 account type is ambiguous. Select ASSET or LIABILITY explicitly."
    );
    return { type: null, warnings };
  }

  if (accountClass === "5") {
    if (includesIndicator(normalizedLabel, CLASS_FIVE_LIABILITY_INDICATORS)) {
      warnings.push("Class 5 account classified as LIABILITY from its label.");
      return { type: AccountType.LIABILITY, warnings };
    }

    return { type: AccountType.ASSET, warnings };
  }

  if (accountClass === "6") {
    return { type: AccountType.EXPENSE, warnings };
  }

  return { type: AccountType.INCOME, warnings };
};

export const inferAccountTypeFromCodeAndLabel = (
  code: string,
  label: string
): AccountType => {
  const inferred = inferAccountTypeDetails(code, label);

  if (!inferred.type) {
    throw new AccountingAccountGovernanceError(
      "Account type could not be inferred safely. Please select a type explicitly."
    );
  }

  return inferred.type;
};

const buildParentCandidates = (code: string) => {
  const candidates: string[] = [];

  if (code.length > 3) {
    candidates.push(`${code.slice(0, -3)}000`);
  }

  for (let length = code.length - 1; length >= 1; length -= 1) {
    candidates.push(code.slice(0, length));
  }

  return Array.from(new Set(candidates.filter((candidate) => candidate !== code)));
};

export const findClosestParentAccount = async (
  prisma: PrismaClient,
  entityId: string,
  code: string
) => {
  const normalizedCode = code.trim();
  deriveAccountClass(normalizedCode);
  const candidates = buildParentCandidates(normalizedCode);

  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      entityId,
      code: { in: candidates },
    },
    select: {
      id: true,
      code: true,
      label: true,
      type: true,
    },
  });
  const accountByCode = new Map(accounts.map((account) => [account.code, account]));

  return candidates
    .map((candidate) => accountByCode.get(candidate))
    .find((account) => account) || null;
};

export const previewCustomAccountClassification = async (
  prisma: PrismaClient,
  params: {
    entityId: string;
    code: string;
    label: string;
    providedType?: AccountType | null;
  }
): Promise<CustomAccountClassification> => {
  const code = params.code.trim();
  const label = params.label.trim();
  const accountClass = deriveAccountClass(code);

  if (!label) {
    throw new AccountingAccountGovernanceError("label is required");
  }

  const parentAccount = await findClosestParentAccount(prisma, params.entityId, code);

  if (parentAccount) {
    return {
      code,
      label,
      accountClass,
      suggestedType: parentAccount.type,
      parentAccount,
      confidence: "PARENT",
      warnings:
        params.providedType && params.providedType !== parentAccount.type
          ? [
              `Selected type ${params.providedType} conflicts with parent account type ${parentAccount.type}.`,
            ]
          : [],
    };
  }

  const inferred = inferAccountTypeDetails(code, label);

  return {
    code,
    label,
    accountClass,
    suggestedType: inferred.type,
    parentAccount: null,
    confidence: inferred.type ? "INFERRED" : "MANUAL_REQUIRED",
    warnings: inferred.warnings,
  };
};
