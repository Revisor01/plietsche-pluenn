import * as repo from './campaigns.repository';
import * as pushService from '../push/push.service';
import type { CreateCampaignBody, UpdateCampaignBody } from './campaigns.types';

export const getActiveCampaign = (storeId: string) => repo.getActiveCampaign(storeId);
export const listCampaigns = (storeId: string) => repo.listCampaigns(storeId);

export const createCampaign = async (storeId: string, data: CreateCampaignBody) => {
  const campaign = await repo.createCampaign(storeId, data);
  // Push fire-and-forget -- kein Fehler nach aussen werfen
  pushService.sendToStore(
    storeId,
    'Neue Aktion',
    `Neue Aktion: ${campaign.title}!`
  ).catch((err: unknown) => {
    console.error('[Push] Kampagne-Push fehlgeschlagen:', err);
  });
  return campaign;
};

export const updateCampaign = (id: string, storeId: string, data: UpdateCampaignBody) => repo.updateCampaign(id, storeId, data);
export const deleteCampaign = (id: string, storeId: string) => repo.deleteCampaign(id, storeId);
