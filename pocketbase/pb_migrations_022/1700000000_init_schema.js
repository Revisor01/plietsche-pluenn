/// <reference path="../pb_data/types.d.ts" />

// Initial schema for Plietsche Plünn (HANDOFF §4).
// Privacy constraint: points_log has NO item FK; items.taken_at has NO user ref.

migrate(
  (db) => {
    const dao = new Dao(db);

    // ─── users (extend built-in auth collection) ───────────────
    // PB auth collections already ship `name` + `avatar`; only add what's missing.
    const users = dao.findCollectionByNameOrId('users');
    const addUserField = (def) => {
      if (!users.schema.getFieldByName(def.name)) {
        users.schema.addField(new SchemaField(def));
      }
    };
    addUserField({ name: 'name', type: 'text', required: false, options: { max: 80 } });
    addUserField({
      name: 'role',
      type: 'select',
      required: true,
      options: { maxSelect: 1, values: ['visitor', 'volunteer', 'admin'] },
    });
    addUserField({
      name: 'avatar',
      type: 'file',
      options: { maxSelect: 1, maxSize: 2097152, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
    });
    addUserField({ name: 'points_total', type: 'number', options: { min: 0 } });
    addUserField({ name: 'streak_weeks', type: 'number', options: { min: 0 } });
    addUserField({ name: 'streak_last_visit', type: 'date', options: {} });
    addUserField({ name: 'streak_grace_until', type: 'date', options: {} });
    addUserField({ name: 'onboarding_complete', type: 'bool', options: {} });
    addUserField({ name: 'push_streak_enabled', type: 'bool', options: {} });
    addUserField({ name: 'push_campaign_enabled', type: 'bool', options: {} });
    addUserField({ name: 'push_badge_enabled', type: 'bool', options: {} });
    addUserField({ name: 'push_other_enabled', type: 'bool', options: {} });
    // Defaults applied via hooks (PB select/number defaults are limited).
    dao.saveCollection(users);

    // ─── items ─────────────────────────────────────────────────
    const items = new Collection({
      name: 'items',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.role = "volunteer" || @request.auth.role = "admin"',
      updateRule: '@request.auth.role = "volunteer" || @request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
      schema: [
        new SchemaField({ name: 'sku', type: 'text', required: true, options: { max: 32 } }),
        new SchemaField({ name: 'title', type: 'text', required: true, options: { max: 80 } }),
        new SchemaField({
          name: 'category',
          type: 'select',
          options: {
            maxSelect: 1,
            values: [
              'damen-oberteil',
              'damen-hose',
              'damen-kleid',
              'damen-schuhe',
              'herren-oberteil',
              'herren-hose',
              'herren-schuhe',
              'kinder',
              'accessoires',
              'sonstiges',
            ],
          },
        }),
        new SchemaField({ name: 'size', type: 'text', options: { max: 16 } }),
        new SchemaField({
          name: 'condition',
          type: 'select',
          options: { maxSelect: 1, values: ['neu', 'sehr-gut', 'gut', 'gebraucht'] },
        }),
        new SchemaField({
          name: 'photo',
          type: 'file',
          options: { maxSelect: 1, maxSize: 4194304, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], thumbs: ['400x400'] },
        }),
        new SchemaField({ name: 'points', type: 'number', options: { min: 0 } }),
        new SchemaField({ name: 'qr_code', type: 'text', options: { max: 64 } }),
        new SchemaField({ name: 'is_showcase', type: 'bool', options: {} }),
        new SchemaField({ name: 'showcase_position', type: 'number', options: {} }),
        new SchemaField({ name: 'note', type: 'text', options: { max: 200 } }),
        new SchemaField({ name: 'taken_at', type: 'date', options: {} }),
        new SchemaField({ name: 'archived_at', type: 'date', options: {} }),
        new SchemaField({
          name: 'created_by',
          type: 'relation',
          options: { collectionId: users.id, maxSelect: 1, cascadeDelete: false },
        }),
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_items_sku ON items (sku)',
        'CREATE INDEX idx_items_qr ON items (qr_code)',
        'CREATE INDEX idx_items_showcase ON items (is_showcase)',
      ],
    });
    dao.saveCollection(items);

    // ─── campaigns ─────────────────────────────────────────────
    const campaigns = new Collection({
      name: 'campaigns',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
      schema: [
        new SchemaField({ name: 'name', type: 'text', required: true, options: { max: 80 } }),
        new SchemaField({ name: 'multiplier', type: 'number', required: true, options: { min: 1 } }),
        new SchemaField({ name: 'starts_at', type: 'date', required: true, options: {} }),
        new SchemaField({ name: 'ends_at', type: 'date', required: true, options: {} }),
        new SchemaField({
          name: 'target_role',
          type: 'select',
          options: { maxSelect: 1, values: ['all', 'visitor', 'streak2plus', 'inactive14d'] },
        }),
        new SchemaField({
          name: 'created_by',
          type: 'relation',
          options: { collectionId: users.id, maxSelect: 1, cascadeDelete: false },
        }),
      ],
      indexes: ['CREATE INDEX idx_campaigns_window ON campaigns (starts_at, ends_at)'],
    });
    dao.saveCollection(campaigns);

    // ─── visits ────────────────────────────────────────────────
    const visits = new Collection({
      name: 'visits',
      type: 'base',
      listRule: 'user = @request.auth.id || @request.auth.role = "admin"',
      viewRule: 'user = @request.auth.id || @request.auth.role = "admin"',
      createRule: 'user = @request.auth.id',
      updateRule: null,
      deleteRule: null,
      schema: [
        new SchemaField({
          name: 'user',
          type: 'relation',
          required: true,
          options: { collectionId: users.id, maxSelect: 1, cascadeDelete: true },
        }),
        new SchemaField({ name: 'checkin_at', type: 'date', options: {} }),
        new SchemaField({ name: 'items_count', type: 'number', options: { min: 0 } }),
        new SchemaField({ name: 'gps_lat', type: 'number', options: {} }),
        new SchemaField({ name: 'gps_lng', type: 'number', options: {} }),
        new SchemaField({ name: 'gps_distance_m', type: 'number', options: {} }),
        new SchemaField({
          name: 'campaign',
          type: 'relation',
          options: { collectionId: campaigns.id, maxSelect: 1, cascadeDelete: false },
        }),
        new SchemaField({ name: 'points_awarded', type: 'number', options: {} }),
      ],
      indexes: ['CREATE INDEX idx_visits_user ON visits (user)'],
    });
    dao.saveCollection(visits);

    // ─── points_log (NO item FK — privacy) ─────────────────────
    const pointsLog = new Collection({
      name: 'points_log',
      type: 'base',
      listRule: 'user = @request.auth.id || @request.auth.role = "admin"',
      viewRule: 'user = @request.auth.id || @request.auth.role = "admin"',
      createRule: null, // server-only via hooks
      updateRule: null,
      deleteRule: null,
      schema: [
        new SchemaField({
          name: 'user',
          type: 'relation',
          required: true,
          options: { collectionId: users.id, maxSelect: 1, cascadeDelete: true },
        }),
        new SchemaField({ name: 'points', type: 'number', required: true, options: {} }),
        new SchemaField({
          name: 'kind',
          type: 'select',
          required: true,
          options: { maxSelect: 1, values: ['checkin', 'scan', 'badge', 'streak', 'campaign', 'adjustment'] },
        }),
        new SchemaField({ name: 'label', type: 'text', options: { max: 80 } }),
        new SchemaField({ name: 'ref_id', type: 'text', options: { max: 64 } }),
      ],
      indexes: ['CREATE INDEX idx_pointslog_user ON points_log (user, created)'],
    });
    dao.saveCollection(pointsLog);

    // ─── badges ────────────────────────────────────────────────
    const badges = new Collection({
      name: 'badges',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
      schema: [
        new SchemaField({ name: 'slug', type: 'text', required: true, options: { max: 48 } }),
        new SchemaField({ name: 'name', type: 'text', required: true, options: { max: 80 } }),
        new SchemaField({ name: 'description', type: 'text', options: { max: 200 } }),
        new SchemaField({
          name: 'category',
          type: 'select',
          options: { maxSelect: 1, values: ['bringer', 'holer', 'besucher', 'saison', 'streak', 'meilenstein'] },
        }),
        new SchemaField({
          name: 'tier',
          type: 'select',
          options: { maxSelect: 1, values: ['bronze', 'silver', 'gold'] },
        }),
        new SchemaField({ name: 'icon', type: 'text', options: { max: 48 } }),
        new SchemaField({
          name: 'trigger_type',
          type: 'select',
          options: { maxSelect: 1, values: ['visits', 'scans', 'streak_weeks', 'season_window', 'items_in_period'] },
        }),
        new SchemaField({ name: 'trigger_value', type: 'number', options: { min: 0 } }),
        new SchemaField({ name: 'season_start', type: 'text', options: { max: 5 } }),
        new SchemaField({ name: 'season_end', type: 'text', options: { max: 5 } }),
        new SchemaField({ name: 'points_reward', type: 'number', options: { min: 0 } }),
        new SchemaField({ name: 'is_visible', type: 'bool', options: {} }),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_badges_slug ON badges (slug)'],
    });
    dao.saveCollection(badges);

    // ─── user_badges ───────────────────────────────────────────
    const userBadges = new Collection({
      name: 'user_badges',
      type: 'base',
      listRule: 'user = @request.auth.id || @request.auth.role = "admin"',
      viewRule: 'user = @request.auth.id || @request.auth.role = "admin"',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      schema: [
        new SchemaField({
          name: 'user',
          type: 'relation',
          required: true,
          options: { collectionId: users.id, maxSelect: 1, cascadeDelete: true },
        }),
        new SchemaField({
          name: 'badge',
          type: 'relation',
          required: true,
          options: { collectionId: badges.id, maxSelect: 1, cascadeDelete: true },
        }),
        new SchemaField({ name: 'unlocked_at', type: 'date', options: {} }),
        new SchemaField({ name: 'progress', type: 'number', options: { min: 0 } }),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_userbadges_unique ON user_badges (user, badge)'],
    });
    dao.saveCollection(userBadges);

    // ─── push_devices ──────────────────────────────────────────
    const pushDevices = new Collection({
      name: 'push_devices',
      type: 'base',
      listRule: 'user = @request.auth.id || @request.auth.role = "admin"',
      viewRule: 'user = @request.auth.id || @request.auth.role = "admin"',
      createRule: 'user = @request.auth.id',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      schema: [
        new SchemaField({
          name: 'user',
          type: 'relation',
          required: true,
          options: { collectionId: users.id, maxSelect: 1, cascadeDelete: true },
        }),
        new SchemaField({ name: 'expo_token', type: 'text', required: true, options: { max: 128 } }),
        new SchemaField({
          name: 'platform',
          type: 'select',
          options: { maxSelect: 1, values: ['ios', 'android'] },
        }),
        new SchemaField({ name: 'last_seen', type: 'date', options: {} }),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_pushdevices_token ON push_devices (expo_token)'],
    });
    dao.saveCollection(pushDevices);

    // ─── push_messages ─────────────────────────────────────────
    const pushMessages = new Collection({
      name: 'push_messages',
      type: 'base',
      listRule: '@request.auth.role = "admin"',
      viewRule: '@request.auth.role = "admin"',
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
      schema: [
        new SchemaField({ name: 'title', type: 'text', required: true, options: { max: 100 } }),
        new SchemaField({ name: 'body', type: 'text', required: true, options: { max: 240 } }),
        new SchemaField({
          name: 'target_segment',
          type: 'select',
          options: { maxSelect: 1, values: ['all', 'streak2plus', 'inactive14d', 'by_role'] },
        }),
        new SchemaField({
          name: 'target_role',
          type: 'select',
          options: { maxSelect: 1, values: ['visitor', 'volunteer', 'admin'] },
        }),
        new SchemaField({ name: 'scheduled_at', type: 'date', options: {} }),
        new SchemaField({ name: 'sent_at', type: 'date', options: {} }),
        new SchemaField({ name: 'deep_link', type: 'text', options: { max: 120 } }),
        new SchemaField({
          name: 'sent_by',
          type: 'relation',
          options: { collectionId: users.id, maxSelect: 1, cascadeDelete: false },
        }),
      ],
      indexes: [],
    });
    dao.saveCollection(pushMessages);

    // ─── store (singleton) ─────────────────────────────────────
    const store = new Collection({
      name: 'store',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
      schema: [
        new SchemaField({ name: 'name', type: 'text', required: true, options: { max: 80 } }),
        new SchemaField({ name: 'address', type: 'text', options: { max: 200 } }),
        new SchemaField({ name: 'lat', type: 'number', options: {} }),
        new SchemaField({ name: 'lng', type: 'number', options: {} }),
        new SchemaField({ name: 'phone', type: 'text', options: { max: 40 } }),
        new SchemaField({ name: 'hours_json', type: 'json', options: { maxSize: 2000 } }),
        new SchemaField({
          name: 'cover_photo',
          type: 'file',
          options: { maxSelect: 1, maxSize: 4194304, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
        }),
        new SchemaField({ name: 'geofence_radius_m', type: 'number', options: { min: 0 } }),
        new SchemaField({ name: 'checkin_qr_secret', type: 'text', options: { max: 128 } }),
      ],
      indexes: [],
    });
    dao.saveCollection(store);
  },
  (db) => {
    // Down migration: drop created collections, strip user fields.
    const dao = new Dao(db);
    for (const name of [
      'store',
      'push_messages',
      'push_devices',
      'user_badges',
      'badges',
      'points_log',
      'visits',
      'campaigns',
      'items',
    ]) {
      try {
        dao.deleteCollection(dao.findCollectionByNameOrId(name));
      } catch (_) {}
    }
    try {
      const users = dao.findCollectionByNameOrId('users');
      for (const f of [
        'name',
        'role',
        'avatar',
        'points_total',
        'streak_weeks',
        'streak_last_visit',
        'streak_grace_until',
        'onboarding_complete',
        'push_streak_enabled',
        'push_campaign_enabled',
        'push_badge_enabled',
        'push_other_enabled',
      ]) {
        const field = users.schema.getFieldByName(f);
        if (field) users.schema.removeField(field.id);
      }
      dao.saveCollection(users);
    } catch (_) {}
  },
);
