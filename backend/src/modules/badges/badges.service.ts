import * as repo from './badges.repository';

export const getLevels = (storeId: string) => repo.getLevels(storeId);
export const addLevel = (storeId: string, data: Parameters<typeof repo.addLevel>[1]) => repo.addLevel(storeId, data);
export const deleteLevel = (id: string, storeId: string) => repo.deleteLevel(id, storeId);
export const getBadgeProgress = (userId: string, storeId: string) => repo.getBadgeProgress(userId, storeId);
