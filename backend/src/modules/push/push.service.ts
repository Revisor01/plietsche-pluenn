import * as admin from 'firebase-admin';
import * as path from 'path';
import * as repo from './push.repository';

function getApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

export async function sendToTokens(tokens: string[], title: string, body: string): Promise<void> {
  if (tokens.length === 0) return;

  const app = getApp();
  const response = await app.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
  });

  if (response.failureCount > 0) {
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`Push fehlgeschlagen fuer Token ${tokens[idx]}: ${resp.error?.message}`);
      }
    });
  }
}

export async function sendToStore(storeId: string, title: string, body: string): Promise<void> {
  const tokens = await repo.findTokensByStore(storeId);
  await sendToTokens(tokens, title, body);
}

export async function sendToUser(userId: string, title: string, body: string): Promise<void> {
  const tokens = await repo.findTokensByUser(userId);
  await sendToTokens(tokens, title, body);
}
