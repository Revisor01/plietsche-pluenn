import { useEffect, useState } from 'react';
import { pb, type PPUser } from '../pb';
import { queryClient } from '../queryClient';
import { unregisterPushToken } from '../push';
import { createAuthFlow } from '../authFlow';

// Die Ablauflogik steht testbar in ../authFlow.ts, hier nur die echten Abhängigkeiten.
const flow = createAuthFlow({
  pb,
  unregisterPushToken,
  clearQueryCache: () => queryClient.clear(),
});

export function useAuth() {
  const [user, setUser] = useState<PPUser | null>(
    (pb.authStore.record as unknown as PPUser | null) ?? null,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Bereit erst nach der asynchronen Hydration; der Timeout greift, wenn keine Sitzung gespeichert ist.
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
    // Konto anlegen, anmelden, Bestaetigungsmail anfordern — siehe authFlow.ts.
    register: async (email: string, password: string, name: string) => {
      await flow.register(email, password, name);
    },
    // Update display name. Refreshes authStore so the new value propagates.
    updateName: async (name: string) => {
      const id = pb.authStore.record?.id;
      if (!id) throw new Error('not authenticated');
      await pb.collection('users').update(id, { name });
      await pb.collection('users').authRefresh();
    },
    // Wirksam erst nach Bestätigung über den Link.
    updateEmail: async (newEmail: string) => {
      await pb.collection('users').requestEmailChange(newEmail);
    },
    requestVerification: async () => {
      await flow.requestVerification();
    },
    // Passwort vergessen — siehe authFlow.ts.
    requestPasswordReset: async (email: string) => {
      await flow.requestPasswordReset(email);
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
    logout: async () => {
      await flow.logout();
    },
    deleteAccount: async (password: string) => {
      await flow.deleteAccount(password);
    },
  };
}
