import { db } from '../../db/client';
import { achievements } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function seedDefaultAchievements(storeId: string): Promise<void> {
  const existing = await db.select().from(achievements).where(eq(achievements.storeId, storeId));
  if (existing.length > 0) return; // Bereits geseedet

  const defaults = [
    // Bringer-Badges (items_brought)
    { name: 'Bringer Bronze', description: '10 Teile eingestellt', iconName: 'box', triggerType: 'items_brought' as const, triggerValue: 10, tier: 'bronze' as const, season: null, sortOrder: 10 },
    { name: 'Bringer Silber', description: '25 Teile eingestellt', iconName: 'boxes', triggerType: 'items_brought' as const, triggerValue: 25, tier: 'silber' as const, season: null, sortOrder: 11 },
    { name: 'Bringer Gold', description: '50 Teile eingestellt', iconName: 'trophy', triggerType: 'items_brought' as const, triggerValue: 50, tier: 'gold' as const, season: null, sortOrder: 12 },
    { name: 'Bringer Platinum', description: '100 Teile eingestellt', iconName: 'star', triggerType: 'items_brought' as const, triggerValue: 100, tier: 'custom' as const, season: null, sortOrder: 13 },
    // Holer-Badges (items_taken)
    { name: 'Holer Bronze', description: '10 Teile mitgenommen', iconName: 'shopping-bag', triggerType: 'items_taken' as const, triggerValue: 10, tier: 'bronze' as const, season: null, sortOrder: 20 },
    { name: 'Holer Silber', description: '25 Teile mitgenommen', iconName: 'shopping-bag', triggerType: 'items_taken' as const, triggerValue: 25, tier: 'silber' as const, season: null, sortOrder: 21 },
    { name: 'Holer Gold', description: '50 Teile mitgenommen', iconName: 'shopping-bag', triggerType: 'items_taken' as const, triggerValue: 50, tier: 'gold' as const, season: null, sortOrder: 22 },
    { name: 'Holer Platinum', description: '100 Teile mitgenommen', iconName: 'trophy', triggerType: 'items_taken' as const, triggerValue: 100, tier: 'custom' as const, season: null, sortOrder: 23 },
    // Besucher-Badges (visits)
    { name: 'Neuling', description: '5 Check-Ins', iconName: 'map-marker-alt', triggerType: 'visits' as const, triggerValue: 5, tier: 'bronze' as const, season: null, sortOrder: 30 },
    { name: 'Stammgast', description: '10 Check-Ins', iconName: 'map-marker-alt', triggerType: 'visits' as const, triggerValue: 10, tier: 'silber' as const, season: null, sortOrder: 31 },
    { name: 'Kiez-Fan', description: '25 Check-Ins', iconName: 'map-marker-alt', triggerType: 'visits' as const, triggerValue: 25, tier: 'gold' as const, season: null, sortOrder: 32 },
    { name: 'Plietsch-Profi', description: '50 Check-Ins', iconName: 'crown', triggerType: 'visits' as const, triggerValue: 50, tier: 'custom' as const, season: null, sortOrder: 33 },
    // Streak-Badges (streak_weeks)
    { name: 'Dabei-Bleiber', description: '2 Wochen in Folge', iconName: 'fire', triggerType: 'streak_weeks' as const, triggerValue: 2, tier: 'bronze' as const, season: null, sortOrder: 40 },
    { name: 'Serientaeter', description: '4 Wochen in Folge', iconName: 'fire', triggerType: 'streak_weeks' as const, triggerValue: 4, tier: 'silber' as const, season: null, sortOrder: 41 },
    { name: 'Feuer-Laeufer', description: '8 Wochen in Folge', iconName: 'fire-alt', triggerType: 'streak_weeks' as const, triggerValue: 8, tier: 'gold' as const, season: null, sortOrder: 42 },
    { name: 'Streak-Legende', description: '12 Wochen in Folge', iconName: 'fire-alt', triggerType: 'streak_weeks' as const, triggerValue: 12, tier: 'custom' as const, season: null, sortOrder: 43 },
    // Saison-Badges
    { name: 'Fruehlings-Bringer', description: 'Fruehjahrstuecke eingestellt', iconName: 'seedling', triggerType: 'season_items_brought' as const, triggerValue: 5, tier: 'bronze' as const, season: 'fruehling' as const, sortOrder: 50 },
    { name: 'Sommer-Bringer', description: 'Sommertuecke eingestellt', iconName: 'sun', triggerType: 'season_items_brought' as const, triggerValue: 5, tier: 'bronze' as const, season: 'sommer' as const, sortOrder: 51 },
    { name: 'Herbst-Bringer', description: 'Herbsttuecke eingestellt', iconName: 'leaf', triggerType: 'season_items_brought' as const, triggerValue: 5, tier: 'bronze' as const, season: 'herbst' as const, sortOrder: 52 },
    { name: 'Winter-Bringer', description: 'Wintertuecke eingestellt', iconName: 'snowflake', triggerType: 'season_items_brought' as const, triggerValue: 5, tier: 'bronze' as const, season: 'winter' as const, sortOrder: 53 },
    // Meilenstein-Badges
    { name: 'Erster Besuch', description: 'Zum ersten Mal eingecheckt', iconName: 'flag', triggerType: 'milestone' as const, triggerValue: 1, tier: 'custom' as const, season: null, sortOrder: 60 },
    { name: 'Erstes Teil gebracht', description: 'Das erste Teil eingestellt', iconName: 'gift', triggerType: 'milestone' as const, triggerValue: 1, tier: 'custom' as const, season: null, sortOrder: 61 },
    { name: '100 Teile insgesamt', description: '100 Teile gebracht oder geholt', iconName: 'medal', triggerType: 'milestone' as const, triggerValue: 100, tier: 'custom' as const, season: null, sortOrder: 62 },
  ];

  await db.insert(achievements).values(defaults.map((d) => ({ ...d, storeId })));
}
