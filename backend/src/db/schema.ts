import { pgTable, uuid, text, timestamp, integer, real, boolean, primaryKey } from 'drizzle-orm/pg-core';

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
  isShowcase: boolean('is_showcase').notNull().default(false),
});

export const checkins = pgTable('checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  itemCount: integer('item_count').notNull().default(0),
  // KEINE lat/lng — GPS nur validiert, nie persistiert (per CHKIN-01, Locked Decision)
  createdAt: timestamp('created_at').defaultNow(),
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

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  title: text('title').notNull(),
  description: text('description'),
  multiplier: real('multiplier').notNull().default(1.0),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const badgeLevels = pgTable('badge_levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  iconName: text('icon_name').notNull().default('medal'),
  minPoints: integer('min_points').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const storeSettings = pgTable('store_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().unique().references(() => stores.id),
  pointsPerScan: integer('points_per_scan').notNull().default(10),
  pointsPerCheckin: integer('points_per_checkin').notNull().default(5),
  pointsPerItem: integer('points_per_item').notNull().default(3),
  maxItemsPerCheckin: integer('max_items_per_checkin').notNull().default(10),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  iconName: text('icon_name').notNull().default('trophy'),
  triggerType: text('trigger_type', {
    enum: ['items_brought', 'items_taken', 'visits', 'streak_weeks', 'season_items_brought', 'season_items_taken', 'milestone'],
  }).notNull(),
  triggerValue: integer('trigger_value').notNull(),
  tier: text('tier', { enum: ['bronze', 'silber', 'gold', 'custom'] }).notNull().default('custom'),
  season: text('season', { enum: ['fruehling', 'sommer', 'herbst', 'winter'] }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  achievementId: uuid('achievement_id').notNull().references(() => achievements.id),
  progress: integer('progress').notNull().default(0),
  completed: boolean('completed').notNull().default(false),
  completedAt: timestamp('completed_at'),
});

export const weeklyVisits = pgTable('weekly_visits', {
  userId: uuid('user_id').notNull().references(() => users.id),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  weekStart: text('week_start').notNull(),
  visitCount: integer('visit_count').notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.storeId, t.weekStart] }),
}));
