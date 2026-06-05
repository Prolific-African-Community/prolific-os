import { EntityRole, OrganizationRole, OrganizationStatus } from "@prisma/client";
import type { AuthenticatedNextApiRequest } from "./auth";
import {
  CurrentUserRecord,
  getCurrentUserRecord,
  isSuperAdminUser,
} from "./entity-access";
import { prisma } from "./prisma";

const INTERNAL_ENTITY_ROLES: EntityRole[] = [
  EntityRole.ENTITY_ADMIN,
  EntityRole.ENTITY_ACCOUNTANT,
  EntityRole.ENTITY_REVIEWER,
  EntityRole.ENTITY_VIEWER,
];
const ENTITY_MANAGER_ROLES: EntityRole[] = [
  EntityRole.ENTITY_ADMIN,
  EntityRole.ENTITY_ACCOUNTANT,
];
const INTERNAL_ORGANIZATION_ROLES: OrganizationRole[] = [
  OrganizationRole.ORG_ADMIN,
  OrganizationRole.ORG_ACCOUNTANT,
  OrganizationRole.ORG_REVIEWER,
  OrganizationRole.ORG_VIEWER,
];
const ORGANIZATION_OPERATOR_ROLES: OrganizationRole[] = [
  OrganizationRole.ORG_ADMIN,
  OrganizationRole.ORG_ACCOUNTANT,
];

export interface EntityPermissionSummary {
  canAccessWorkspace: boolean;
  canManageEntity: boolean;
  canManageAccountingSetup: boolean;
  canCreateAccountingTransaction: boolean;
  canPostJournalEntry: boolean;
  canReverseJournalEntry: boolean;
  canManageCounterparties: boolean;
  canManageDocuments: boolean;
  canViewReports: boolean;
}

export const getCurrentUserAccessContext = async (
  req: AuthenticatedNextApiRequest
) => getCurrentUserRecord(req.user.id);

const getEntityAccess = async (user: CurrentUserRecord, entityId: string) => {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: {
      id: true,
      organizationId: true,
      organization: {
        select: {
          isActive: true,
          status: true,
        },
      },
    },
  });

  if (!entity) return { entity: null, organizationRole: null, entityRole: null };
  if (isSuperAdminUser(user)) {
    return { entity, organizationRole: null, entityRole: null };
  }
  if (
    !entity.organization.isActive ||
    entity.organization.status !== OrganizationStatus.ACTIVE
  ) {
    return { entity: null, organizationRole: null, entityRole: null };
  }

  const organizationRole =
    user.organizationUsers.find(
      (membership) =>
        membership.isActive &&
        membership.organizationId === entity.organizationId &&
        membership.organization.isActive &&
        membership.organization.status === OrganizationStatus.ACTIVE
    )?.role || null;
  const entityRole =
    user.entityUsers.find(
      (membership) => membership.isActive && membership.entityId === entityId
    )?.role || null;

  return { entity, organizationRole, entityRole };
};

const evaluateEntityPermissions = async (
  user: CurrentUserRecord,
  entityId: string
): Promise<EntityPermissionSummary> => {
  const access = await getEntityAccess(user, entityId);
  const superAdmin = isSuperAdminUser(user);
  const internalOrganizationUser =
    access.organizationRole !== null &&
    INTERNAL_ORGANIZATION_ROLES.includes(access.organizationRole);
  const organizationOperator =
    access.organizationRole !== null &&
    ORGANIZATION_OPERATOR_ROLES.includes(access.organizationRole);
  const internalEntityUser =
    access.entityRole !== null && INTERNAL_ENTITY_ROLES.includes(access.entityRole);
  const entityOperator =
    access.entityRole !== null && ENTITY_MANAGER_ROLES.includes(access.entityRole);
  const investor = access.entityRole === EntityRole.INVESTOR;
  const internalAccess =
    Boolean(access.entity) &&
    (superAdmin || internalOrganizationUser || internalEntityUser);
  const operationalWrite =
    Boolean(access.entity) && (superAdmin || organizationOperator || entityOperator);

  return {
    canAccessWorkspace: internalAccess,
    canManageEntity: operationalWrite,
    canManageAccountingSetup: operationalWrite,
    canCreateAccountingTransaction: operationalWrite,
    canPostJournalEntry: operationalWrite,
    canReverseJournalEntry: operationalWrite,
    canManageCounterparties: operationalWrite,
    canManageDocuments: operationalWrite,
    canViewReports: Boolean(access.entity) && (internalAccess || investor),
  };
};

export const getEntityPermissionSummary = evaluateEntityPermissions;
export const canAccessEntity = async (user: CurrentUserRecord, entityId: string) =>
  (await evaluateEntityPermissions(user, entityId)).canAccessWorkspace;
export const canManageEntity = async (user: CurrentUserRecord, entityId: string) =>
  (await evaluateEntityPermissions(user, entityId)).canManageEntity;
export const canManageAccountingSetup = async (
  user: CurrentUserRecord,
  entityId: string
) => (await evaluateEntityPermissions(user, entityId)).canManageAccountingSetup;
export const canCreateAccountingTransaction = async (
  user: CurrentUserRecord,
  entityId: string
) => (await evaluateEntityPermissions(user, entityId)).canCreateAccountingTransaction;
export const canPostJournalEntry = async (
  user: CurrentUserRecord,
  entityId: string
) => (await evaluateEntityPermissions(user, entityId)).canPostJournalEntry;
export const canReverseJournalEntry = async (
  user: CurrentUserRecord,
  entityId: string
) => (await evaluateEntityPermissions(user, entityId)).canReverseJournalEntry;
export const canManageCounterparties = async (
  user: CurrentUserRecord,
  entityId: string
) => (await evaluateEntityPermissions(user, entityId)).canManageCounterparties;
export const canManageDocuments = async (user: CurrentUserRecord, entityId: string) =>
  (await evaluateEntityPermissions(user, entityId)).canManageDocuments;
export const canViewReports = async (user: CurrentUserRecord, entityId: string) =>
  (await evaluateEntityPermissions(user, entityId)).canViewReports;

export const canManageOrganizationUsers = (
  user: CurrentUserRecord,
  organizationId: string
) =>
  isSuperAdminUser(user) ||
  user.organizationUsers.some(
    (membership) =>
      membership.isActive &&
      membership.organization.isActive &&
      membership.organization.status === OrganizationStatus.ACTIVE &&
      membership.organizationId === organizationId &&
      membership.role === OrganizationRole.ORG_ADMIN
  );

export const canViewAccountingTemplates = (user: CurrentUserRecord) =>
  isSuperAdminUser(user) ||
  user.organizationUsers.some(
    (membership) =>
      membership.isActive &&
      membership.organization.isActive &&
      membership.organization.status === OrganizationStatus.ACTIVE &&
      ORGANIZATION_OPERATOR_ROLES.includes(membership.role)
  );
