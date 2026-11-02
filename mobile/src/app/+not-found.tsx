import { Redirect } from 'expo-router';

import { useAuth } from '@/providers/AuthProvider';

/** A guarded group is unmatched while its guard is off, so the entry URL "/" lands here when signed out. */
export default function NotFound() {
  const { status } = useAuth();

  return <Redirect href={status === 'signedIn' ? '/' : '/login'} />;
}
