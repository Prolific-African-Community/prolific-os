import type { NextApiRequest, NextApiResponse } from 'next';
import { UserRole } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { hashPassword, signAuthToken } from '../../../lib/auth';

interface RegisterBody {
  email?: string;
  password?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body as RegisterBody;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      role: UserRole.USER,
    },
    select: {
      id: true,
      email: true,
      role: true
    }
  });

  const token = signAuthToken({ sub: user.id, email: user.email, role: user.role });

  return res.status(201).json({ token, user });
}
