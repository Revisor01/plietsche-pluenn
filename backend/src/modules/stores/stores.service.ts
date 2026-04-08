import * as storesRepo from './stores.repository';
import type { UpdateStoreBody, StoreInfo } from './stores.types';

export async function getStoreInfo(storeId?: string): Promise<StoreInfo> {
  const store = storeId
    ? await storesRepo.findStoreById(storeId)
    : await storesRepo.findFirstStore();

  if (!store) {
    const err = Object.assign(new Error('Store not found'), { statusCode: 404 });
    throw err;
  }

  return {
    id: store.id,
    name: store.name,
    address: store.address ?? null,
    description: store.description ?? null,
    openingHours: store.openingHours ?? null,
    lat: store.lat ?? null,
    lng: store.lng ?? null,
  };
}

export async function updateStoreInfo(storeId: string, data: UpdateStoreBody): Promise<StoreInfo> {
  const updated = await storesRepo.updateStore(storeId, data);
  if (!updated) {
    const err = Object.assign(new Error('Store not found'), { statusCode: 404 });
    throw err;
  }
  return {
    id: updated.id,
    name: updated.name,
    address: updated.address ?? null,
    description: updated.description ?? null,
    openingHours: updated.openingHours ?? null,
    lat: updated.lat ?? null,
    lng: updated.lng ?? null,
  };
}
