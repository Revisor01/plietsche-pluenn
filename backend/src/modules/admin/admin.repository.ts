import { db } from '../../db/client';
import { users } from '../../db/schema';
import { and, eq } from 'drizzle-orm';

export async function findUsersByStoreAndRole(
  storeId: string,
  role: 'volunteer' | 'visitor' | 'admin',
) {
  return db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.storeId, storeId), eq(users.role, role)));
}

export async function createUser(data: {
  username: string;
  email: string;
  passwordHash: string;
  storeId: string;
  role: 'volunteer';
}) {
  const result = await db.insert(users).values(data).returning({
    id: users.id,
    username: users.username,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
  });
  return result[0];
}
