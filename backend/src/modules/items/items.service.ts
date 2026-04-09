import crypto from 'crypto';
import QRCode from 'qrcode';
import * as itemsRepo from './items.repository';
import * as pushService from '../push/push.service';
import type { CreateItemBody, ItemFilters } from './items.types';

export async function createItem(body: CreateItemBody, storeId: string) {
  const qrToken = crypto.randomUUID();
  const item = await itemsRepo.createItem({ ...body, storeId, qrToken });
  return item;
}

export async function listItems(storeId: string, filters: ItemFilters) {
  const rows = await itemsRepo.findItems(storeId, filters);
  const limit = filters.limit ?? 20;
  return {
    items: rows,
    page: filters.page ?? 0,
    limit,
  };
}

export async function getShowcaseItems(storeId: string) {
  return itemsRepo.getShowcaseItems(storeId);
}

export async function setShowcase(id: string, storeId: string, isShowcase: boolean) {
  const result = await itemsRepo.setShowcase(id, storeId, isShowcase);
  if (isShowcase) {
    pushService.sendToStore(
      storeId,
      'Neues Highlight',
      'Neues Highlight im Laden!'
    ).catch((err: unknown) => {
      console.error('[Push] Showcase-Push fehlgeschlagen:', err);
    });
  }
  return result;
}

export async function getItemQrPng(itemId: string, storeId: string): Promise<Buffer> {
  const item = await itemsRepo.findItemById(itemId, storeId);
  if (!item) {
    const err = Object.assign(new Error('Item not found'), { statusCode: 404 });
    throw err;
  }
  if (!item.qrToken) {
    const err = Object.assign(new Error('Item has no QR token'), { statusCode: 500 });
    throw err;
  }
  const png = await QRCode.toBuffer(item.qrToken, {
    type: 'png',
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
  return png as Buffer;
}
