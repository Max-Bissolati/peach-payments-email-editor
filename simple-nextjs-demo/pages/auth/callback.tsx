import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // PKCE flow: code in query params
      const code = router.query.code as string;
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('PKCE exchange error:', error.message);
          router.replace('/login?error=' + encodeURIComponent(error.message));
          return;
        }
        if (data.session) {
          router.replace('/');
          return;
        }
      }

      // Check if already has a session (e.g., hash fragment was processed)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/');
        return;
      }

      // No valid auth params
      console.error('No auth code or session found in callback');
      router.replace('/login?error=' + encodeURIComponent('Authentication failed. Please try again.'));
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query.code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
