import { useQuery } from '@tanstack/react-query';
import { pb, type PPUser } from '../pb';
import type { Item, Campaign, PointsLog, Badge, UserBadge, Store } from '../types';

// Fresh current user from server (authStore record can be stale after point changes).
export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    enabled: pb.authStore.isValid,
    queryFn: async () => {
      const id = pb.authStore.record?.id;
      if (!id) throw new Error('not authenticated');
      return (await pb.collection('users').getOne(id)) as unknown as PPUser;
    },
  });
}

export function useShowcase(limit = 12) {
  return useQuery({
    queryKey: ['showcase', limit],
    queryFn: async () => {
      const res = await pb.collection('items').getList(1, limit, {
        filter: 'is_showcase = true && taken_at = null && archived_at = null',
        sort: 'showcase_position',
      });
      return res.items as unknown as Item[];
    },
  });
}

// Items the current user submitted (any status) — for the "meine Teile" view.
export function useMyItems() {
  return useQuery({
    queryKey: ['my_items'],
    enabled: pb.authStore.isValid,
    queryFn: async () => {
      const uid = pb.authStore.record?.id;
      const res = await pb.collection('items').getList(1, 100, {
        filter: `created_by = "${uid}"`,
        sort: '-created',
      });
      return res.items as unknown as Item[];
    },
  });
}

// Newest available items in the shop — for the "neu im Laden" feed on Home.
export function useRecentItems(limit = 6) {
  return useQuery({
    queryKey: ['recent_items', limit],
    queryFn: async () => {
      const res = await pb.collection('items').getList(1, limit, {
        filter: 'status = "approved" && taken_at = null && archived_at = null',
        sort: '-created',
      });
      return res.items as unknown as Item[];
    },
  });
}

// All items for the staff inventory view — every status, newest first.
export function useAllItems() {
  return useQuery({
    queryKey: ['all_items'],
    enabled: pb.authStore.isValid,
    queryFn: async () => {
      const res = await pb.collection('items').getFullList({
        sort: '-created',
        expand: 'created_by',
      });
      return res as unknown as Item[];
    },
  });
}

// Pending submissions awaiting staff approval.
export function usePendingItems() {
  return useQuery({
    queryKey: ['pending_items'],
    enabled: pb.authStore.isValid,
    queryFn: async () => {
      const res = await pb.collection('items').getList(1, 100, {
        filter: 'status = "pending"',
        sort: 'created',
        expand: 'created_by',
      });
      return res.items as unknown as Item[];
    },
  });
}

export function useActiveCampaign() {
  return useQuery({
    queryKey: ['campaign', 'active'],
    queryFn: async () => {
      const now = new Date().toISOString().replace('T', ' ');
      try {
        const rec = await pb
          .collection('campaigns')
          .getFirstListItem(`starts_at <= "${now}" && ends_at >= "${now}"`, { sort: '-multiplier' });
        return rec as unknown as Campaign;
      } catch {
        return null;
      }
    },
  });
}

export function usePointsLog(limit = 200) {
  return useQuery({
    queryKey: ['points_log', limit],
    enabled: pb.authStore.isValid,
    queryFn: async () => {
      const res = await pb.collection('points_log').getList(1, limit, { sort: '-created' });
      return res.items as unknown as PointsLog[];
    },
  });
}

export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const res = await pb.collection('badges').getFullList({ filter: 'is_visible = true', sort: 'tier_bronze' });
      return res as unknown as Badge[];
    },
  });
}

// All badges incl. hidden ones — for the admin badge editor.
export function useAllBadges() {
  return useQuery({
    queryKey: ['all_badges'],
    enabled: pb.authStore.isValid,
    queryFn: async () => {
      const res = await pb.collection('badges').getFullList({ sort: 'created' });
      return res as unknown as Badge[];
    },
  });
}

export function useUserBadges() {
  return useQuery({
    queryKey: ['user_badges'],
    enabled: pb.authStore.isValid,
    queryFn: async () => {
      const res = await pb.collection('user_badges').getFullList({ expand: 'badge' });
      return res as unknown as UserBadge[];
    },
  });
}

export function useStore() {
  return useQuery({
    queryKey: ['store'],
    queryFn: async () => {
      try {
        const rec = await pb.collection('store').getFirstListItem('');
        return rec as unknown as Store;
      } catch {
        return null;
      }
    },
  });
}
