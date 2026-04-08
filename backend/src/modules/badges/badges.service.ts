import * as repo from './badges.repository';
import * as achievementsRepo from './achievements.repository';
import { seedDefaultAchievements } from './achievements.seed';

export const getLevels = (storeId: string) => repo.getLevels(storeId);
export const addLevel = (storeId: string, data: Parameters<typeof repo.addLevel>[1]) => repo.addLevel(storeId, data);
export const deleteLevel = (id: string, storeId: string) => repo.deleteLevel(id, storeId);
export const getBadgeProgress = (userId: string, storeId: string) => repo.getBadgeProgress(userId, storeId);

export const getAchievements = (storeId: string) => achievementsRepo.getAchievements(storeId);
export const getUserAchievements = (userId: string, storeId: string) => achievementsRepo.getUserAchievements(userId, storeId);
export const createAchievement = (storeId: string, data: Parameters<typeof achievementsRepo.createAchievement>[1]) => achievementsRepo.createAchievement(storeId, data);
export const updateAchievement = (id: string, storeId: string, data: Parameters<typeof achievementsRepo.updateAchievement>[2]) => achievementsRepo.updateAchievement(id, storeId, data);
export const deleteAchievement = (id: string, storeId: string) => achievementsRepo.deleteAchievement(id, storeId);
export const seedAchievements = (storeId: string) => seedDefaultAchievements(storeId);
