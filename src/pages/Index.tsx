import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Onboarding from '@/components/Onboarding';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';

const Index = () => {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkOnboardingAndAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkOnboardingAndAuth = async () => {
    try {
      // Check if onboarding has been completed (localStorage only for pre-auth)
      const onboardingCompleted =
        localStorage.getItem('onboarding_completed') === 'true';

      if (!onboardingCompleted) {
        // Show onboarding first (before auth)
        setShowOnboarding(true);
        return;
      }

      // If onboarding is done, check auth and redirect
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        navigate('/dashboard');
      } else {
        // Guest mode: always allow access
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Index startup error:', error);
      // Fail-safe: never block the user on a blank screen
      navigate('/dashboard');
    } finally {
      setIsChecking(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Go directly to dashboard as guest (no forced signup)
    navigate('/dashboard');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background text-foreground safe-area-all">
        <main className="container max-w-md mx-auto px-4 py-10 flex flex-col items-center justify-center text-center gap-4">
          <h1 className="sr-only">Kvittr – kvitteringsapp for garanti og bytte</h1>
          <Logo size="medium" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Starter…
          </div>
        </main>
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // We redirect to /dashboard; keep a small fallback in case navigation is delayed.
  return (
    <div className="min-h-screen bg-background" />
  );
};

export default Index;

