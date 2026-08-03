import { useRouter, useLocalSearchParams } from 'expo-router';

// Back navigation for screens that live inside the tab navigator.
//
// Those screens are registered as tabs with `href: null` (see (visitor)/_layout).
// router.back() therefore pops to the FIRST tab — the home screen — instead of
// the screen the user actually came from. Callers pass `?from=<route>`; this
// hook navigates there explicitly and only falls back to history when no origin
// was given.
//
// Usage:
//   const goBack = useGoBack();                      // falls back to home
//   const goBack = useGoBack('/(visitor)/badges');   // custom default origin
export function useGoBack(fallback: string = '/(visitor)') {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();

  return () => {
    if (from) router.replace(from as any);
    else if (router.canGoBack()) router.back();
    else router.replace(fallback as any);
  };
}
