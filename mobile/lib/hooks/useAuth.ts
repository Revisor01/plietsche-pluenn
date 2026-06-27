import { useEffect, useState } from 'react';
import { pb, type PPUser } from '../pb';

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
    logout: () => pb.authStore.clear(),
  };
}
