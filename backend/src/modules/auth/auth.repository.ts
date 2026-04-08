import { db } from '../../db/client';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function findUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] ?? null;
}

export async function createUser(data: {
  username: string;
  email: string;
  passwordHash: string;
  storeId: string;
  role?: 'admin' | 'volunteer' | 'visitor';
}) {
  const result = await db
    .insert(users)
    .values({
      username: data.username,
      email: data.email,
      passwordHash: data.passwordHash,
      storeId: data.storeId,
      role: data.role ?? 'visitor',
    })
    .returning();
  return result[0];
}
