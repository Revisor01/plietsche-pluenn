// Konto-Abläufe ohne React und PocketBase-Client, damit tests/auth-flow.test.js sie mit Attrappen ausführen kann.

/** Der Teil von `pb.collection('users')`, den die Ablauflogik benutzt. */
export interface UsersCollectionLike {
  create(bodyParams: Record<string, unknown>): Promise<unknown>;
  authWithPassword(email: string, password: string): Promise<unknown>;
  requestVerification(email: string): Promise<unknown>;
  requestPasswordReset(email: string): Promise<unknown>;
  delete(id: string): Promise<unknown>;
}

/** Der Teil des PocketBase-Clients, den die Ablauflogik benutzt. */
export interface PbLike {
  collection(name: string): UsersCollectionLike;
  authStore: {
    readonly record: { id: string; [key: string]: any } | null;
    clear(): void;
  };
}

export interface AuthFlowDeps {
  pb: PbLike;
  unregisterPushToken: () => Promise<unknown>;
  clearQueryCache: () => void;
}

export function createAuthFlow({ pb, unregisterPushToken, clearQueryCache }: AuthFlowDeps) {
  return {
    register: async (email: string, password: string, name: string) => {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name,
        role: 'visitor',
      });
      await pb.collection('users').authWithPassword(email, password);
      // Erst nach der Anmeldung, vorher fehlt das Token; Fehler schlucken, das Konto steht trotzdem.
      try {
        await pb.collection('users').requestVerification(email);
      } catch {
        // Kein Netz, Mailserver weg — darf die Registrierung nicht aufhalten.
      }
    },
    // Adresse aus dem Konto, sonst ließen sich fremde Postfächer beschicken.
    requestVerification: async () => {
      const email = pb.authStore.record?.email as string | undefined;
      if (!email) throw new Error('not authenticated');
      await pb.collection('users').requestVerification(email);
    },
    // Immer dieselbe Antwort, damit sich nicht herausfinden lässt, wer ein Konto hat.
    requestPasswordReset: async (email: string) => {
      await pb.collection('users').requestPasswordReset(email);
    },
    // Reihenfolge zwingend: Push-Token abmelden, solange das Token gilt, dann Auth-Store, dann Query-Cache, sonst sieht die nächste Person fremde Daten.
    logout: async () => {
      try {
        await unregisterPushToken();
      } catch {
        // Kein Netz o.ä. — darf das Abmelden nicht verhindern.
      }
      pb.authStore.clear();
      clearQueryCache();
    },
    // Erst Passwort prüfen, dann Push abmelden, dann löschen; Teile bleiben im Bestand, created_by ohne cascadeDelete.
    deleteAccount: async (password: string) => {
      const record = pb.authStore.record;
      const id = record?.id;
      const email = record?.email as string | undefined;
      if (!id || !email) throw new Error('not authenticated');

      await pb.collection('users').authWithPassword(email, password);

      try {
        await unregisterPushToken();
      } catch {
        // Das Löschen ist wichtiger, push_devices geht mit dem Konto.
      }

      await pb.collection('users').delete(id);
      pb.authStore.clear();
      clearQueryCache();
    },
  };
}

export type AuthFlow = ReturnType<typeof createAuthFlow>;
