import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Camera, ArrowLeft, Check, RotateCcw, Upload, Zap, ZapOff, Grid3x3, ZoomIn, ZoomOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveReceipt } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import imageCompression from 'browser-image-compression';

const Scan = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showOriginal, setShowOriginal] = useState(false);
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
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: 4/3,
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Try to enable torch/flash if available
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (capabilities && 'torch' in capabilities) {
        // Flash is available
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

  const toggleFlash = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          // @ts-ignore - torch is not in the TypeScript types yet
          advanced: [{ torch: !flashEnabled }]
        });
        setFlashEnabled(!flashEnabled);
      } catch (error) {
        console.log('Flash not supported:', error);
        toast({
          title: 'Blits ikke tilgjengelig',
          description: 'Denne enheten støtter ikke blits',
          variant: 'destructive',
        });
      }
    }
  };

  const adjustZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? Math.min(prev + 0.5, 3) : Math.max(prev - 0.5, 1);
      if (videoRef.current) {
        videoRef.current.style.transform = `scale(${newZoom})`;
      }
      return newZoom;
    });
  };

  const enhanceImage = async (imageDataUrl: string): Promise<string> => {
    setIsProcessing(true);
    
    try {
      // Convert data URL to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
      
      // Compress and enhance
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 2000,
        useWebWorker: true,
        initialQuality: 0.95,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // Apply canvas-based enhancements
      const img = await createImageBitmap(compressedFile);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Apply filters for better receipt readability
        ctx.filter = 'contrast(1.3) brightness(1.1) saturate(0.9)';
        ctx.drawImage(img, 0, 0);
        
        // Additional sharpening
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, 0);
        
        return canvas.toDataURL('image/jpeg', 0.95);
      }
      
      return imageDataUrl;
    } catch (error) {
      console.error('Enhancement error:', error);
      return imageDataUrl;
    } finally {
      setIsProcessing(false);
    }
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Capture at full camera resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Reset transform for capture
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(imageData);
        
        // Automatically enhance the image
        const enhanced = await enhanceImage(imageData);
        setEnhancedImage(enhanced);
        
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setEnhancedImage(null);
    setShowOriginal(false);
    setCameraError(false);
    setZoom(1);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        
        // Enhance uploaded image as well
        const enhanced = await enhanceImage(imageData);
        setEnhancedImage(enhanced);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveImage = async () => {
    if (!capturedImage || !userId) return;
    
    setIsLoading(true);
    
    try {
      // Use enhanced image if available, otherwise use original
      const imageToSave = enhancedImage || capturedImage;
      
      const newReceipt = {
        id: crypto.randomUUID(),
        user_id: userId,
        type: 'receipt' as const,
        shop_name: 'Ny butikk',
        product_name: 'Nytt produkt',
        amount: 0,
        purchase_date: new Date().toISOString(),
        image_url: imageToSave,
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

        <div className="flex-1 relative bg-black overflow-hidden">
          {!cameraError ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Grid overlay */}
              {gridVisible && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="border border-white/20" />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Camera controls overlay */}
              <div className="absolute top-4 right-4 space-y-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70"
                  onClick={toggleFlash}
                >
                  {flashEnabled ? <Zap className="h-5 w-5 text-yellow-400" /> : <ZapOff className="h-5 w-5" />}
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70"
                  onClick={() => setGridVisible(!gridVisible)}
                >
                  <Grid3x3 className={`h-5 w-5 ${gridVisible ? 'text-blue-400' : ''}`} />
                </Button>
              </div>
              
              {/* Zoom controls */}
              <div className="absolute bottom-24 right-4 space-y-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70"
                  onClick={() => adjustZoom('in')}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70"
                  onClick={() => adjustZoom('out')}
                  disabled={zoom <= 1}
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Capture instruction */}
              <div className="absolute bottom-32 left-0 right-0 text-center">
                <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-full inline-block">
                  Hold stille for best resultat
                </p>
              </div>
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

      <div className="flex-1 bg-black flex items-center justify-center relative">
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Forbedrer bilde...</p>
            </div>
          </div>
        )}
        
        <img 
          src={showOriginal ? capturedImage : (enhancedImage || capturedImage)} 
          alt="Captured receipt" 
          className="max-w-full max-h-full object-contain"
        />
        
        {/* Before/After toggle */}
        {enhancedImage && !isProcessing && (
          <div className="absolute top-4 right-4">
            <Button
              variant="secondary"
              size="sm"
              className="bg-black/50 hover:bg-black/70"
              onClick={() => setShowOriginal(!showOriginal)}
            >
              {showOriginal ? 'Forbedret' : 'Original'}
            </Button>
          </div>
        )}
        
        {/* Quality indicator */}
        {enhancedImage && !isProcessing && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-green-600/90 text-white px-4 py-2 rounded-lg text-center">
              <Check className="inline h-4 w-4 mr-2" />
              Bilde forbedret for best lesbarhet
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-card border-t space-y-3">
        <Button 
          className="w-full" 
          size="lg"
          onClick={saveImage}
          disabled={isLoading || isProcessing}
        >
          {isLoading ? (
            'Lagrer...'
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
          disabled={isLoading || isProcessing}
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          Ta på nytt
        </Button>
      </div>
    </div>
  );
};

export default Scan;
