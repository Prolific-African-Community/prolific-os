import { Prisma } from '@prisma/client';
import type { NextApiResponse } from 'next';
import { getCurrentUserRecord, userCanAccessEntity } from '../../../../lib/entity-access';
import { canAccessEntity, canManageEntity } from '../../../../lib/permissions';
import { AuthenticatedNextApiRequest, withAuth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

interface CreateProjectBody {
  name?: unknown;
  address?: unknown;
  budget?: unknown;
}

const getOptionalString = (value: unknown) => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const parseOptionalBudget = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }

  try {
    const budget = new Prisma.Decimal(value);
    return budget.isFinite() ? budget : null;
  } catch {
    return null;
  }
};

export default withAuth(async (req: AuthenticatedNextApiRequest, res: NextApiResponse) => {
  const entityId = typeof req.query.id === 'string' ? req.query.id : null;

  if (!entityId) {
    return res.status(400).json({ success: false, message: 'Entity id is required' });
  }

  try {
    const currentUser = await getCurrentUserRecord(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hasAccess =
      req.method === 'GET'
        ? await canAccessEntity(currentUser, entityId)
        : await canManageEntity(currentUser, entityId);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      include: {
        funds: {
          select: { id: true },
        },
      },
    });

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' });
    }

    if (req.method === 'GET') {
      const legacyFundIds = entity.funds.map((fund) => fund.id);
      const projects = await prisma.project.findMany({
        where: {
          OR: [
            { entityId },
            ...(legacyFundIds.length ? [{ fundId: { in: legacyFundIds } }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      const dedupedProjects = Array.from(
        new Map(projects.map((project) => [project.id, project])).values()
      );

      return res.status(200).json({ success: true, data: dedupedProjects });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const body = req.body as CreateProjectBody;
    const name = getOptionalString(body.name);
    const address = getOptionalString(body.address);
    const budget = parseOptionalBudget(body.budget);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }

    if (budget === null) {
      return res.status(400).json({ success: false, message: 'Budget must be a valid number' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        address,
        budget,
        fundId: entity.funds[0]?.id,
        entityId: entity.id,
        organizationId: entity.organizationId,
      },
    });

    return res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error('ENTITY PROJECTS API ERROR:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
