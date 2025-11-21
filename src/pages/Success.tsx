import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';

const Success = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'receipt';

  useEffect(() => {
    // Auto-redirect after 2 seconds
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const getMessage = () => {
    switch (type) {
      case 'return_slip':
        return 'Byttelappen er lagret!';
      case 'gift_card':
        return 'Gavekortet er lagret!';
      default:
        return 'Kvitteringen er lagret!';
    }
  };

  return (
    <div className="min-h-screen bg-[#00C853] flex items-center justify-center animate-fade-in">
      <div className="text-center space-y-6 animate-scale-in">
        {/* Checkmark with bounce animation */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm animate-[scale-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)]">
          <Check className="w-16 h-16 text-white stroke-[3]" />
        </div>
        
        {/* Success message */}
        <h1 className="text-3xl font-bold text-white">
          {getMessage()}
        </h1>
      </div>
    </div>
  );
};

export default Success;
