import { pgTable, uuid, text, timestamp, integer, real } from 'drizzle-orm/pg-core';

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address'),
  lat: real('lat'),
  lng: real('lng'),
  checkinRadiusMeters: integer('checkin_radius_meters').notNull().default(200),
  description: text('description'),
  openingHours: text('opening_hours'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'volunteer', 'visitor'] })
    .notNull()
    .default('visitor'),
  plietschPoints: integer('plietsch_points').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id),
  title: text('title').notNull(),
  category: text('category').notNull(),
  size: text('size'),
  condition: text('condition'),
  color: text('color'),
  status: text('status', { enum: ['active', 'taken'] })
    .notNull()
    .default('active'),
  qrToken: uuid('qr_token').unique(),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
});

export const pointTransactions = pgTable('point_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  // KEIN itemId — DSGVO: kein User↔Item-Link (per SCAN-02, PUNKT-03)
  source: text('source', { enum: ['item_scan', 'checkin', 'manual_items'] }).notNull(),
  points: integer('points').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
