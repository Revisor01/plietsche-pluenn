import { db } from './client';
import { stores, users } from './schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding database...');

  // Einen Store anlegen
  const [store] = await db
    .insert(stores)
    .values({
      name: 'Plietsche Plünn Büsum',
      address: 'Musterstraße 1, 25761 Büsum',
      lat: 54.1234,
      lng: 8.8678,
      checkinRadiusMeters: 200,
    })
    .returning();

  console.log('Store created:', store.id);

  // Admin-User anlegen
  const passwordHash = await bcrypt.hash('admin123', 12);
  const [admin] = await db
    .insert(users)
    .values({
      storeId: store.id,
      username: 'admin',
      email: 'admin@plietschepluenn.de',
      passwordHash,
      role: 'admin',
    })
    .returning();

  console.log('Admin user created:', admin.id);
  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
