/// <reference types="node" />

import fs from 'fs';
import path from 'path';

const SOURCE_FILE = path.resolve(
  'data/accounting/luxembourg/source/pcn-luxembourg-2020.csv'
);
const NORMALIZED_DIR = path.resolve('data/accounting/luxembourg/normalized');
const ACCOUNTS_FILE = path.join(
  NORMALIZED_DIR,
  'pcn-luxembourg-2020.accounts.json'
);
const REPORT_FILE = path.join(
  NORMALIZED_DIR,
  'pcn-luxembourg-2020.import-report.json'
);
const SOURCE_NAME = 'pcn-luxembourg-2020-csv';
const EXPECTED_COLUMNS = [
  'Compte',
  'Libellé',
  'Champs',
  'Rubrique',
  'Libellé.1',
  'Champ',
  'Rubrique.1',
  'Libellé.2',
  'Champ.1',
];

type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
type RawRow = Record<string, string>;

interface Warning {
  type: string;
  row?: number;
  code?: string;
  message: string;
}

interface NormalizedAccount {
  code: string;
  label: string;
  accountClass: string;
  type: AccountType;
  isActive: true;
  source: typeof SOURCE_NAME;
  raw: RawRow;
}

const CP1252_REPLACEMENTS: Record<number, string> = {
  0x80: '€',
  0x82: '‚',
  0x83: 'ƒ',
  0x84: '„',
  0x85: '…',
  0x86: '†',
  0x87: '‡',
  0x88: 'ˆ',
  0x89: '‰',
  0x8a: 'Š',
  0x8b: '‹',
  0x8c: 'Œ',
  0x8e: 'Ž',
  0x91: '‘',
  0x92: '’',
  0x93: '“',
  0x94: '”',
  0x95: '•',
  0x96: '–',
  0x97: '—',
  0x98: '˜',
  0x99: '™',
  0x9a: 'š',
  0x9b: '›',
  0x9c: 'œ',
  0x9e: 'ž',
  0x9f: 'Ÿ',
};

const decodeCp1252 = (input: Buffer) => {
  let result = '';

  for (let index = 0; index < input.length; index += 1) {
    const byte = input[index];
    result += CP1252_REPLACEMENTS[byte] ?? String.fromCharCode(byte);
  }

  return result;
};

const parseSemicolonCsv = (input: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === ';' && !quoted) {
      row.push(field);
      field = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') {
        index += 1;
      }

      row.push(field);
      field = '';

      if (row.some((value) => value.trim())) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += character;
  }

  if (quoted) {
    throw new Error('CSV contains an unterminated quoted field.');
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some((value) => value.trim())) {
      rows.push(row);
    }
  }

  return rows;
};

const disambiguateHeaders = (headers: string[]) => {
  const counts = new Map<string, number>();

  return headers.map((header, index) => {
    const trimmed = header.trim().replace(/^\uFEFF/, '');
    const base = trimmed || `column_${index + 1}`;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base}.${count}`;
  });
};

const normalizeLabel = (label: string) =>
  label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const includesAny = (label: string, indicators: string[]) =>
  indicators.some((indicator) => label.includes(indicator));

const inferAccountType = (
  code: string,
  label: string
): { type: AccountType; ambiguous: boolean; warning?: string } => {
  const accountClass = code[0];
  const normalizedLabel = normalizeLabel(label);

  if (accountClass === '1') {
    const liabilityIndicators = ['dette', 'dettes', 'emprunt', 'emprunts', 'provision', 'provisions'];
    return {
      type: includesAny(normalizedLabel, liabilityIndicators) ? 'LIABILITY' : 'EQUITY',
      ambiguous: false,
    };
  }

  if (accountClass === '2' || accountClass === '3') {
    return { type: 'ASSET', ambiguous: false };
  }

  if (accountClass === '4') {
    const assetIndicators = [
      'client',
      'clients',
      'creance',
      'creances',
      'debiteur',
      'debiteurs',
      'a recevoir',
      'avances et acomptes verses',
    ];
    const liabilityIndicators = [
      'fournisseur',
      'fournisseurs',
      'dette',
      'dettes',
      'crediteur',
      'crediteurs',
      'a payer',
      'tva due',
      'securite sociale',
      'administration',
      'avances et acomptes recus',
    ];
    const assetLike = includesAny(normalizedLabel, assetIndicators);
    const liabilityLike = includesAny(normalizedLabel, liabilityIndicators);

    if (assetLike && !liabilityLike) {
      return { type: 'ASSET', ambiguous: false };
    }

    if (liabilityLike && !assetLike) {
      return { type: 'LIABILITY', ambiguous: false };
    }

    return {
      type: liabilityLike ? 'LIABILITY' : 'ASSET',
      ambiguous: true,
      warning: `Ambiguous class 4 inference; defaulted to ${liabilityLike ? 'LIABILITY' : 'ASSET'}.`,
    };
  }

  if (accountClass === '5') {
    const liabilityIndicators = [
      'decouvert',
      'facilite de credit',
      'credit bancaire',
      'concours bancaire',
      'passif bancaire',
    ];
    const liabilityLike = includesAny(normalizedLabel, liabilityIndicators);

    return {
      type: liabilityLike ? 'LIABILITY' : 'ASSET',
      ambiguous: liabilityLike,
      warning: liabilityLike
        ? 'Class 5 account appears liability-like; classified as LIABILITY.'
        : undefined,
    };
  }

  if (accountClass === '6') {
    return { type: 'EXPENSE', ambiguous: false };
  }

  if (accountClass === '7') {
    return { type: 'INCOME', ambiguous: false };
  }

  return {
    type: 'ASSET',
    ambiguous: true,
    warning: `Unusual account class "${accountClass}"; defaulted to ASSET.`,
  };
};

const increment = (distribution: Record<string, number>, key: string) => {
  distribution[key] = (distribution[key] ?? 0) + 1;
};

const main = () => {
  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error(`Controlled PCN CSV source file not found: ${SOURCE_FILE}`);
  }

  fs.mkdirSync(NORMALIZED_DIR, { recursive: true });

  const rows = parseSemicolonCsv(decodeCp1252(fs.readFileSync(SOURCE_FILE)));

  if (!rows.length) {
    throw new Error('PCN CSV source file is empty.');
  }

  const headers = disambiguateHeaders(rows[0]);
  const warnings: Warning[] = [];

  for (const expectedColumn of EXPECTED_COLUMNS) {
    if (!headers.includes(expectedColumn)) {
      warnings.push({
        type: 'missing_optional_column',
        message: `Expected CSV column "${expectedColumn}" is missing.`,
      });
    }
  }

  const accountsByCode = new Map<string, NormalizedAccount>();
  const classDistribution: Record<string, number> = {};
  const typeDistribution: Record<string, number> = {};
  let skippedRows = 0;
  let duplicateCodes = 0;
  let ambiguousAccounts = 0;

  rows.slice(1).forEach((values, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const raw = Object.fromEntries(
      headers.map((header, columnIndex) => [header, (values[columnIndex] ?? '').trim()])
    );
    const code = (raw.Compte ?? '').trim();
    const label = (raw['Libellé'] ?? '').trim();

    if (!code || !label) {
      skippedRows += 1;
      warnings.push({
        type: 'skipped_row',
        row: rowNumber,
        code: code || undefined,
        message: 'Skipped row because account code or label is missing.',
      });
      return;
    }

    if (!/^\d+$/.test(code)) {
      skippedRows += 1;
      warnings.push({
        type: 'skipped_row',
        row: rowNumber,
        code,
        message: 'Skipped row because account code is not numeric.',
      });
      return;
    }

    if (accountsByCode.has(code)) {
      duplicateCodes += 1;
      warnings.push({
        type: 'duplicate_code',
        row: rowNumber,
        code,
        message: 'Duplicate account code skipped.',
      });
      return;
    }

    const inference = inferAccountType(code, label);
    const accountClass = code[0];

    if (inference.ambiguous) {
      ambiguousAccounts += 1;
      warnings.push({
        type: accountClass === '5' ? 'class_5_liability' : 'ambiguous_type',
        row: rowNumber,
        code,
        message: inference.warning ?? 'Account type inference is ambiguous.',
      });
    }

    const account: NormalizedAccount = {
      code,
      label,
      accountClass,
      type: inference.type,
      isActive: true,
      source: SOURCE_NAME,
      raw,
    };

    accountsByCode.set(code, account);
    increment(classDistribution, account.accountClass);
    increment(typeDistribution, account.type);
  });

  const accounts = Array.from(accountsByCode.values()).sort((left, right) =>
    left.code.localeCompare(right.code, undefined, { numeric: true })
  );

  if (!accounts.length) {
    throw new Error('No numeric PCN accounts were extracted from the CSV source.');
  }

  const report = {
    sourceFile: path.relative(process.cwd(), SOURCE_FILE),
    generatedAt: new Date().toISOString(),
    totalRows: rows.length - 1,
    totalAccountsExtracted: accounts.length,
    totalAccountsWritten: accounts.length,
    skippedRows,
    duplicateCodes,
    ambiguousAccounts,
    classDistribution,
    typeDistribution,
    warnings,
  };

  fs.writeFileSync(ACCOUNTS_FILE, `${JSON.stringify(accounts, null, 2)}\n`, 'utf8');
  fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Accounts extracted: ${report.totalAccountsExtracted}`);
  console.log(`Accounts written: ${report.totalAccountsWritten}`);
  console.log(`Skipped rows: ${report.skippedRows}`);
  console.log(`Duplicate codes: ${report.duplicateCodes}`);
  console.log(`Ambiguous accounts: ${report.ambiguousAccounts}`);
  console.log(`Accounts output: ${path.relative(process.cwd(), ACCOUNTS_FILE)}`);
  console.log(`Import report: ${path.relative(process.cwd(), REPORT_FILE)}`);
};

main();
