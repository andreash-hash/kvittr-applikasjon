import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Onboarding from '@/components/Onboarding';
import { hasGuestData } from '@/lib/guestStorage';

const Index = () => {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    checkOnboardingAndAuth();
  }, []);

  const checkOnboardingAndAuth = async () => {
    // Check if onboarding has been completed (localStorage only for pre-auth)
    const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
    
    if (!onboardingCompleted) {
      // Show onboarding first (before auth)
      setShowOnboarding(true);
      setIsChecking(false);
      return;
    }

    // If onboarding is done, check auth and redirect
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate('/dashboard');
    } else {
      // Guest mode: If user has guest data, go to dashboard
      // Otherwise, go to dashboard as new guest (can scan 3 times)
      navigate('/dashboard');
    }
    setIsChecking(false);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Go directly to dashboard as guest (no forced signup)
    navigate('/dashboard');
  };

  if (isChecking) {
    return null;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return null;
};

export default Index;
