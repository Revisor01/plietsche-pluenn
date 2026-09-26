// Ablauflogik rund ums Konto: Registrieren, Bestaetigungsmail, Passwort
// vergessen, Abmelden, Konto loeschen.
//
// Die Datei importiert bewusst weder React noch React Native, weder den
// PocketBase-Client noch den QueryClient. Alles, was sie braucht, kommt als
// Abhaengigkeit herein. useAuth.ts reicht die echten Objekte durch; die Tests
// (tests/auth-flow.test.js) reichen gestellte, die jeden Aufruf mitschreiben.
// So lassen sich Reihenfolge und Fehlerverhalten AUSFUEHREN statt nur im
// Quelltext nachzulesen — ein auskommentierter Aufruf faellt dann auf.

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
      // Bestaetigungsmail erst NACH der Anmeldung anfordern — vorher gibt es
      // kein gueltiges Token und die Route weist die Anfrage ab.
      //
      // Der Fehler wird geschluckt: Steht der Mailversand still, ist das Konto
      // trotzdem angelegt und die Person angemeldet. Die Bestaetigung ist kein
      // Zwang (onlyVerified bleibt aus), sie laesst sich im Profil jederzeit
      // nachholen. Eine hier durchgereichte Ausnahme wuerde die Registrierung
      // scheitern lassen, obwohl das Konto laengst steht.
      try {
        await pb.collection('users').requestVerification(email);
      } catch {
        // Kein Netz, Mailserver weg — darf die Registrierung nicht aufhalten.
      }
    },
    // Bestaetigungsmail erneut anfordern. Die Adresse kommt aus dem
    // angemeldeten Konto und wird nicht uebergeben — sonst liesse sich die
    // Funktion nutzen, um fremde Postfaecher mit Bestaetigungsmails zu
    // beschicken.
    requestVerification: async () => {
      const email = pb.authStore.record?.email as string | undefined;
      if (!email) throw new Error('not authenticated');
      await pb.collection('users').requestVerification(email);
    },
    // Passwort vergessen. PocketBase verschickt einen Link zum Zuruecksetzen.
    // Die Antwort ist bewusst immer gleich, egal ob es die Adresse gibt —
    // sonst liesse sich ueber die Fehlermeldung herausfinden, wer ein Konto
    // hat. Der aufrufende Screen sagt deshalb "falls es ein Konto gibt".
    requestPasswordReset: async (email: string) => {
      await pb.collection('users').requestPasswordReset(email);
    },
    // Abmelden räumt das Gerät auf. Reihenfolge ist zwingend:
    //  1. Push-Token abmelden, SOLANGE die Anmeldung noch gültig ist — die
    //     Route /api/pp/push/unregister verlangt ein Token. Danach ginge es
    //     nicht mehr, und das Gerät bekäme weiter die Mitteilungen des alten
    //     Kontos (und die DSGVO-Opt-out-Funktion liefe nie).
    //  2. Auth-Store leeren.
    //  3. Query-Cache leeren — der QueryClient ist ein Modul-Singleton und
    //     überlebt das Abmelden. Ohne diesen Schritt sähe die nächste Person
    //     am selben Gerät bis zu 30 Sekunden lang (staleTime) den Namen, die
    //     Punkte, den Verlauf und die Abzeichen der vorigen.
    // unregisterPushToken schluckt seine Fehler bereits selbst; das try/catch
    // ist die zweite Absicherung: Ein Gerät ohne Netz muss trotzdem rauskommen.
    logout: async () => {
      try {
        await unregisterPushToken();
      } catch {
        // Kein Netz o.ä. — darf das Abmelden nicht verhindern.
      }
      pb.authStore.clear();
      clearQueryCache();
    },
    // Konto endgültig löschen. Reihenfolge wie beim Abmelden, mit einem
    // Schritt davor:
    //  1. Passwort prüfen — authWithPassword schlägt bei falschem Passwort
    //     fehl und bricht ab, bevor irgendetwas gelöscht ist. Ein verlegtes
    //     Gerät in fremder Hand darf das Konto nicht ausradieren können.
    //  2. Push-Token abmelden, solange die Anmeldung noch gilt (siehe logout).
    //  3. Datensatz löschen. Besuche, Punkteverlauf, Abzeichen, Aktions-
    //     zähler und Push-Geräte hängen mit cascadeDelete am Konto und gehen
    //     mit. Eingestellte Teile bleiben im Bestand des Ladens, verlieren
    //     aber ihren Bezug (created_by ist bewusst ohne cascadeDelete).
    //  4. Gerät aufräumen wie beim Abmelden.
    deleteAccount: async (password: string) => {
      const record = pb.authStore.record;
      const id = record?.id;
      const email = record?.email as string | undefined;
      if (!id || !email) throw new Error('not authenticated');

      await pb.collection('users').authWithPassword(email, password);

      try {
        await unregisterPushToken();
      } catch {
        // Kein Netz o.ä. — das Löschen selbst ist wichtiger. Der Datensatz in
        // push_devices verschwindet ohnehin mit dem Konto.
      }

      await pb.collection('users').delete(id);
      pb.authStore.clear();
      clearQueryCache();
    },
  };
}

export type AuthFlow = ReturnType<typeof createAuthFlow>;
