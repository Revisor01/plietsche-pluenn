import * as repo from './campaigns.repository';
import type { CreateCampaignBody, UpdateCampaignBody } from './campaigns.types';

export const getActiveCampaign = (storeId: string) => repo.getActiveCampaign(storeId);
export const listCampaigns = (storeId: string) => repo.listCampaigns(storeId);
export const createCampaign = (storeId: string, data: CreateCampaignBody) => repo.createCampaign(storeId, data);
export const updateCampaign = (id: string, storeId: string, data: UpdateCampaignBody) => repo.updateCampaign(id, storeId, data);
export const deleteCampaign = (id: string, storeId: string) => repo.deleteCampaign(id, storeId);
