/// <reference types="node" />

import fs from 'fs';
import path from 'path';
import {
  AccountType,
  AccountingStandard,
  PrismaClient,
  TransactionType,
} from '@prisma/client';

const prisma = new PrismaClient();
const ACCOUNTS_FILE = path.resolve(
  'data/accounting/luxembourg/normalized/pcn-luxembourg-2020.accounts.json'
);
const TEMPLATE_NAME = 'Luxembourg PCN 2020';
const TEMPLATE_VERSION = '1.0.0';

interface NormalizedAccount {
  code: string;
  label: string;
  accountClass: string;
  type: AccountType;
  isActive: boolean;
}

interface StarterRuleDefinition {
  transactionType: TransactionType;
  debitAccount: keyof ResolvedAccounts;
  creditAccount: keyof ResolvedAccounts;
  descriptionTemplate: string;
}

interface ResolvedAccounts {
  customer: NormalizedAccount | null;
  supplier: NormalizedAccount | null;
  bank: NormalizedAccount | null;
  revenue: NormalizedAccount | null;
  expense: NormalizedAccount | null;
  bankFee: NormalizedAccount | null;
}

const normalizeLabel = (label: string) =>
  label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const includesAny = (label: string, indicators: string[]) => {
  const normalized = normalizeLabel(label);
  return indicators.some((indicator) => normalized.includes(indicator));
};

const resolvePreferredAccount = (
  accounts: NormalizedAccount[],
  preferredCodes: string[],
  fallback: (account: NormalizedAccount) => boolean
) => {
  for (const code of preferredCodes) {
    const preferred = accounts.find((account) => account.code === code);
    if (preferred) {
      return preferred;
    }
  }

  return accounts.find(fallback) ?? null;
};

const resolveStarterAccounts = (accounts: NormalizedAccount[]): ResolvedAccounts => ({
  customer: resolvePreferredAccount(
    accounts,
    ['411000', '4110', '411'],
    (account) => account.type === AccountType.ASSET && includesAny(account.label, ['client'])
  ),
  supplier: resolvePreferredAccount(
    accounts,
    ['401000', '4010', '401'],
    (account) =>
      account.type === AccountType.LIABILITY && includesAny(account.label, ['fournisseur'])
  ),
  bank: resolvePreferredAccount(
    accounts,
    ['513000', '5130', '513'],
    (account) =>
      account.accountClass === '5' && includesAny(account.label, ['banque', 'banques'])
  ),
  revenue: resolvePreferredAccount(
    accounts,
    ['706000', '7060', '706'],
    (account) =>
      account.accountClass === '7' && includesAny(account.label, ['prestation', 'service'])
  ),
  expense: resolvePreferredAccount(
    accounts,
    ['600000', '6000', '600'],
    (account) => account.accountClass === '6'
  ),
  bankFee: resolvePreferredAccount(
    accounts,
    ['626000', '6260', '626'],
    (account) =>
      account.accountClass === '6' && includesAny(account.label, ['frais bancaires', 'banque'])
  ),
});

const STARTER_RULES: StarterRuleDefinition[] = [
  {
    transactionType: TransactionType.CUSTOMER_INVOICE,
    debitAccount: 'customer',
    creditAccount: 'revenue',
    descriptionTemplate: 'Customer invoice - {description}',
  },
  {
    transactionType: TransactionType.CUSTOMER_PAYMENT,
    debitAccount: 'bank',
    creditAccount: 'customer',
    descriptionTemplate: 'Customer payment - {description}',
  },
  {
    transactionType: TransactionType.SUPPLIER_INVOICE,
    debitAccount: 'expense',
    creditAccount: 'supplier',
    descriptionTemplate: 'Supplier invoice - {description}',
  },
  {
    transactionType: TransactionType.SUPPLIER_PAYMENT,
    debitAccount: 'supplier',
    creditAccount: 'bank',
    descriptionTemplate: 'Supplier payment - {description}',
  },
  {
    transactionType: TransactionType.BANK_FEE,
    debitAccount: 'bankFee',
    creditAccount: 'bank',
    descriptionTemplate: 'Bank fee - {description}',
  },
];

const readAccounts = () => {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    throw new Error(
      `Normalized PCN account file not found: ${ACCOUNTS_FILE}. Run the normalization script first.`
    );
  }

  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')) as NormalizedAccount[];

  if (!Array.isArray(accounts) || !accounts.length) {
    throw new Error('Normalized PCN account file does not contain any accounts.');
  }

  return accounts;
};

const main = async () => {
  const accounts = readAccounts();

  const existingTemplate = await prisma.accountingTemplate.findFirst({
    where: {
      name: TEMPLATE_NAME,
      version: TEMPLATE_VERSION,
      jurisdiction: 'LU',
      standard: AccountingStandard.LUX_GAAP,
    },
  });

  const templateData = {
    name: TEMPLATE_NAME,
    version: TEMPLATE_VERSION,
    jurisdiction: 'LU',
    standard: AccountingStandard.LUX_GAAP,
    description: 'Luxembourg PCN 2020 imported from controlled CSV source.',
    isSystem: true,
    isActive: true,
  };

  const template = existingTemplate
    ? await prisma.accountingTemplate.update({
        where: { id: existingTemplate.id },
        data: templateData,
      })
    : await prisma.accountingTemplate.create({ data: templateData });

  const existingAccounts = await prisma.accountingTemplateAccount.findMany({
    where: { templateId: template.id },
    select: { code: true },
  });
  const existingCodes = new Set(existingAccounts.map((account) => account.code));
  const accountsCreated = accounts.filter((account) => !existingCodes.has(account.code)).length;
  const accountsUpdated = accounts.length - accountsCreated;

  for (let index = 0; index < accounts.length; index += 100) {
    const batch = accounts.slice(index, index + 100);

    await prisma.$transaction(
      batch.map((account) =>
        prisma.accountingTemplateAccount.upsert({
          where: {
            templateId_code: {
              templateId: template.id,
              code: account.code,
            },
          },
          update: {
            label: account.label,
            accountClass: account.accountClass,
            type: account.type,
            isActive: account.isActive,
          },
          create: {
            templateId: template.id,
            code: account.code,
            label: account.label,
            accountClass: account.accountClass,
            type: account.type,
            isActive: account.isActive,
          },
        })
      )
    );
  }

  const resolvedAccounts = resolveStarterAccounts(accounts);
  let rulesCreated = 0;
  let rulesUpdated = 0;
  const skippedRules: string[] = [];

  for (const rule of STARTER_RULES) {
    const debitAccount = resolvedAccounts[rule.debitAccount];
    const creditAccount = resolvedAccounts[rule.creditAccount];

    if (!debitAccount || !creditAccount) {
      skippedRules.push(
        `${rule.transactionType}: could not safely resolve ${!debitAccount ? rule.debitAccount : rule.creditAccount} account`
      );
      continue;
    }

    const existingRule = await prisma.accountingTemplateRule.findFirst({
      where: {
        templateId: template.id,
        transactionType: rule.transactionType,
        debitAccountCode: debitAccount.code,
        creditAccountCode: creditAccount.code,
      },
    });

    const ruleData = {
      templateId: template.id,
      transactionType: rule.transactionType,
      debitAccountCode: debitAccount.code,
      creditAccountCode: creditAccount.code,
      descriptionTemplate: rule.descriptionTemplate,
      priority: 100,
      isActive: true,
    };

    if (existingRule) {
      await prisma.accountingTemplateRule.update({
        where: { id: existingRule.id },
        data: ruleData,
      });
      rulesUpdated += 1;
    } else {
      await prisma.accountingTemplateRule.create({ data: ruleData });
      rulesCreated += 1;
    }
  }

  console.log(`Template: ${template.name} v${template.version}`);
  console.log(`Template accounts created: ${accountsCreated}`);
  console.log(`Template accounts updated: ${accountsUpdated}`);
  console.log(`Starter rules created: ${rulesCreated}`);
  console.log(`Starter rules updated: ${rulesUpdated}`);
  console.log(`Starter rules skipped: ${skippedRules.length}`);

  for (const skippedRule of skippedRules) {
    console.log(`- ${skippedRule}`);
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
