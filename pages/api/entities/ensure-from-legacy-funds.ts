import { AccountingStandard, EntityType, OrganizationType } from '@prisma/client';
import type { NextApiResponse } from 'next';
import {
  ensureCompatibilityMemberships,
  getCurrentUserRecord,
  isSuperAdminUser,
} from '../../../lib/entity-access';
import { AuthenticatedNextApiRequest, withAuth } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const currentUser = await getCurrentUserRecord(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const legacyFunds = await prisma.fund.findMany({
      where: isSuperAdminUser(currentUser)
        ? {}
        : currentUser.gpId
          ? { gpId: currentUser.gpId }
          : { id: '__no_funds__' },
      include: {
        gp: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let migratedCount = 0;
    let skippedCount = 0;

    for (const fund of legacyFunds) {
      if (fund.entityId) {
        skippedCount += 1;
        continue;
      }

      try {
        await prisma.$transaction(async (tx) => {
          let organization = fund.organizationId
            ? await tx.organization.findUnique({
                where: { id: fund.organizationId },
              })
            : null;

          if (!organization) {
            organization = await tx.organization.findFirst({
              where: {
                name: fund.gp?.name || fund.name,
                type: OrganizationType.GP,
              },
            });
          }

          if (!organization) {
            organization = await tx.organization.create({
              data: {
                name: fund.gp?.name || fund.name,
                legalName: fund.gp?.name || fund.name,
                type: OrganizationType.GP,
                baseCurrency: fund.currency || 'EUR',
              },
            });
          }

          let entity = await tx.entity.findFirst({
            where: {
              organizationId: organization.id,
              name: fund.name,
              type: EntityType.FUND,
            },
          });

          if (!entity) {
            entity = await tx.entity.create({
              data: {
                organizationId: organization.id,
                name: fund.name,
                legalName: fund.name,
                type: EntityType.FUND,
                baseCurrency: fund.currency || 'EUR',
                accountingStandard: AccountingStandard.LUX_GAAP,
              },
            });
          }

          await tx.fund.update({
            where: { id: fund.id },
            data: {
              organizationId: organization.id,
              entityId: entity.id,
            },
          });

          await ensureCompatibilityMemberships({
            client: tx,
            entityId: entity.id,
            organizationId: organization.id,
            userId: currentUser.id,
          });
        });

        migratedCount += 1;
      } catch (error) {
        console.error(`ENSURE ENTITY FROM LEGACY FUND FAILED: ${fund.id}`, error);
        skippedCount += 1;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        migratedCount,
        skippedCount,
      },
    });
  } catch (error) {
    console.error('ENSURE ENTITIES FROM LEGACY FUNDS ERROR:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
