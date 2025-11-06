import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Camera, ArrowLeft, Check, RotateCcw, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveReceipt } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';

const Scan = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId && !capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [userId, capturedImage]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
    } else {
      setUserId(session.user.id);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          aspectRatio: 16/9
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(false);
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError(true);
      toast({
        title: 'Kamera ikke tilgjengelig',
        description: 'Du kan laste opp et bilde i stedet',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCameraError(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveImage = async () => {
    if (!capturedImage || !userId) return;
    
    setIsLoading(true);
    
    try {
      const newReceipt = {
        id: crypto.randomUUID(),
        user_id: userId,
        type: 'receipt' as const,
        shop_name: 'Ny butikk',
        product_name: 'Nytt produkt',
        amount: 0,
        purchase_date: new Date().toISOString(),
        image_url: capturedImage,
        status: 'active' as const,
        created_at: new Date().toISOString(),
      };
      
      await saveReceipt(newReceipt);
      
      toast({
        title: 'Suksess!',
        description: 'Kvittering lagret!',
      });
      
      navigate(`/item/${newReceipt.id}`);
    } catch (error) {
      toast({
        title: 'Feil',
        description: 'Kunne ikke lagre kvittering',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    stopCamera();
    navigate('/dashboard');
  };

  if (!capturedImage) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 flex items-center justify-between bg-card border-b">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Ta bilde av kvittering</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 relative bg-black">
          {!cameraError ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8">
              <div className="text-center text-muted-foreground">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Kamera ikke tilgjengelig</p>
                <p className="text-sm">Last opp et bilde i stedet</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-card border-t space-y-3">
          {!cameraError ? (
            <Button 
              className="w-full" 
              size="lg"
              onClick={captureImage}
            >
              <Camera className="mr-2 h-5 w-5" />
              Ta bilde
            </Button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button 
            variant={cameraError ? "default" : "outline"}
            className="w-full" 
            size="lg"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-5 w-5" />
            Last opp bilde
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4 flex items-center justify-between bg-card border-b">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Forhåndsvisning</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 bg-black flex items-center justify-center">
        <img 
          src={capturedImage} 
          alt="Captured receipt" 
          className="max-w-full max-h-full object-contain"
        />
      </div>

      <div className="p-4 bg-card border-t space-y-3">
        <Button 
          className="w-full" 
          size="lg"
          onClick={saveImage}
          disabled={isLoading}
        >
          {isLoading ? (
            'Behandler bilde...'
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              Bruk bilde
            </>
          )}
        </Button>
        <Button 
          variant="outline" 
          className="w-full" 
          size="lg"
          onClick={retakePhoto}
          disabled={isLoading}
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          Ta på nytt
        </Button>
      </div>
    </div>
  );
};

export default Scan;
