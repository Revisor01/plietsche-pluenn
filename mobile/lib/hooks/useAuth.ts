import { useEffect, useState } from 'react';
import { pb, type PPUser } from '../pb';
import { queryClient } from '../queryClient';
import { unregisterPushToken } from '../push';

export function useAuth() {
  const [user, setUser] = useState<PPUser | null>(
    (pb.authStore.record as unknown as PPUser | null) ?? null,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // AsyncAuthStore hydrates from SecureStore asynchronously. onChange fires
    // once hydration runs; we mark ready then so the entry guard sees the real
    // auth state instead of an empty one. A timeout is a safety net in case the
    // store stays empty (no stored session) and onChange never re-fires.
    const unsub = pb.authStore.onChange(() => {
      setUser((pb.authStore.record as unknown as PPUser | null) ?? null);
      setReady(true);
    }, true);
    const t = setTimeout(() => setReady(true), 800);
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, []);

  return {
    user,
    ready,
    isAuthenticated: pb.authStore.isValid && !!user,
    login: async (email: string, password: string) => {
      await pb.collection('users').authWithPassword(email, password);
    },
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
    // Update display name. Refreshes authStore so the new value propagates.
    updateName: async (name: string) => {
      const id = pb.authStore.record?.id;
      if (!id) throw new Error('not authenticated');
      await pb.collection('users').update(id, { name });
      await pb.collection('users').authRefresh();
    },
    // Change email. PocketBase sends a confirmation mail; the change applies
    // once the user confirms via the link (default collection behaviour).
    updateEmail: async (newEmail: string) => {
      await pb.collection('users').requestEmailChange(newEmail);
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
    // Change password. Requires the current password for verification.
    updatePassword: async (oldPassword: string, newPassword: string) => {
      const id = pb.authStore.record?.id;
      if (!id) throw new Error('not authenticated');
      await pb.collection('users').update(id, {
        oldPassword,
        password: newPassword,
        passwordConfirm: newPassword,
      });
      // Password change invalidates the token — re-auth with the new password.
      const email = pb.authStore.record?.email as string;
      await pb.collection('users').authWithPassword(email, newPassword);
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
      queryClient.clear();
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
      queryClient.clear();
    },
  };
}
