import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const { toast } = useToast();
  
  // Get preselected type from navigation state
  const preselectedType = location.state?.preselectedType || 'receipt';

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

  // Prevent body scroll when camera is active
  useEffect(() => {
    if (!capturedImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [capturedImage]);

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
      
      // Convert base64 to blob
      const response = await fetch(imageToSave);
      const blob = await response.blob();
      
      // Generate unique filename
      const fileName = `${userId}/${crypto.randomUUID()}.jpg`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('receipt-images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Kunne ikke laste opp bilde');
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipt-images')
        .getPublicUrl(fileName);
      
      // Create receipt with storage URL and preselected type
      const receiptId = crypto.randomUUID();
      const newReceipt = {
        id: receiptId,
        user_id: userId,
        type: preselectedType as 'receipt' | 'gift_card' | 'return_slip',
        shop_name: 'Ny butikk',
        product_name: 'Nytt produkt',
        amount: 0,
        purchase_date: new Date().toISOString(),
        image_url: publicUrl,
        status: 'active' as const,
        processing_status: 'pending' as const,
        created_at: new Date().toISOString(),
      };
      
      await saveReceipt(newReceipt);
      
      // Trigger OCR webhook (don't await - let it process in background)
      fetch('https://api.kvittr.app/webhook/receipt-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_id: receiptId,
          image_url: publicUrl,
          user_id: userId
        })
      }).catch(err => {
        console.log('OCR trigger failed:', err);
        toast({
          title: 'Merk',
          description: 'Kunne ikke analysere automatisk. Du kan redigere manuelt.',
          variant: 'default',
        });
      });
      
      toast({
        title: 'Lagret!',
        description: 'Bilde sendt til scanning!',
      });
      
      navigate(`/item/${receiptId}`);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Feil',
        description: error instanceof Error ? error.message : 'Kunne ikke lagre kvittering',
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
      <div className="fixed inset-0 bg-black">
        {/* Back button - Fixed top left */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack}
          className="absolute top-4 left-4 z-20 bg-black/50 hover:bg-black/70 text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Camera preview - Full viewport minus button area */}
        <div className="absolute inset-0">
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
              
              {/* Camera controls - Fixed top right */}
              <div className="absolute top-4 right-4 z-20 space-y-2">
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
              
              {/* Zoom controls - Fixed right side */}
              <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20 space-y-2">
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
              <div className="absolute bottom-32 left-0 right-0 text-center z-10">
                <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-full inline-block">
                  Hold stille for best resultat
                </p>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8">
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Kamera ikke tilgjengelig</p>
                <p className="text-sm">Last opp et bilde i stedet</p>
              </div>
            </div>
          )}
        </div>

        {/* Capture button - Fixed at bottom */}
        <div className="absolute bottom-6 left-0 right-0 z-20 px-6">
          {!cameraError ? (
            <Button 
              className="w-full h-[70px] rounded-full text-lg shadow-lg" 
              size="lg"
              onClick={captureImage}
            >
              <Camera className="mr-2 h-6 w-6" />
              Ta bilde
            </Button>
          ) : (
            <Button 
              className="w-full h-[70px] rounded-full text-lg shadow-lg"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-6 w-6" />
              Last opp bilde
            </Button>
          )}
        </div>

        {/* Upload input - Hidden */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        
        {/* Upload button - Secondary action when camera works */}
        {!cameraError && (
          <div className="absolute bottom-24 left-0 right-0 z-20 px-6">
            <Button 
              variant="outline"
              className="w-full bg-black/50 hover:bg-black/70 text-white border-white/20"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Eller last opp bilde
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="p-4 flex items-center justify-between bg-card border-b">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Forhåndsvisning</h1>
        <div className="w-10" />
      </div>

      <div className="bg-black flex items-center justify-center relative" style={{ maxHeight: '50vh' }}>
        <img 
          src={showOriginal ? capturedImage : (enhancedImage || capturedImage)} 
          alt="Captured receipt" 
          className="max-w-full max-h-full object-contain"
          style={{ maxHeight: '50vh' }}
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
      </div>
      
      {/* Processing indicator - Below image, always visible */}
      {isProcessing && (
        <div className="bg-primary/10 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-foreground font-medium">Analyserer kvittering...</p>
            <p className="text-sm text-muted-foreground mt-1">Dette tar bare noen sekunder</p>
          </div>
        </div>
      )}
      
      {/* Quality indicator - Below image when not processing */}
      {enhancedImage && !isProcessing && (
        <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-center">
          <Check className="h-4 w-4 mr-2" />
          <span className="font-medium">Bilde forbedret for best lesbarhet</span>
        </div>
      )}

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
