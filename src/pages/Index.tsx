import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '@/lib/storage';

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const user = getUser();
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }, [navigate]);

  return null;
};

export default Index;
