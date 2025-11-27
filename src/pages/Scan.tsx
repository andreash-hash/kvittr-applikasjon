import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Camera as CameraIcon, ArrowLeft, Check, RotateCcw, Upload, Image as ImageIcon } from 'lucide-react';
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
  const [showOriginal, setShowOriginal] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get preselected type from navigation state
  const preselectedType = location.state?.preselectedType || 'receipt';

  useEffect(() => {
    checkAuth();
    checkPlatform();
  }, []);

  const checkPlatform = async () => {
    try {
      // @ts-ignore - Capacitor may not be available
      const { Capacitor } = await import('@capacitor/core');
      setIsNative(Capacitor.isNativePlatform());
    } catch {
      setIsNative(false);
    }
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
    } else {
      setUserId(session.user.id);
    }
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

  const takePhoto = async () => {
    // Native Capacitor camera
    if (isNative) {
      try {
        // @ts-ignore - Capacitor modules loaded dynamically
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        // @ts-ignore
        const { Filesystem } = await import('@capacitor/filesystem');
        
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          saveToGallery: false,
          correctOrientation: true,
        });
        
        if (image.webPath) {
          // Convert image to base64 data URL for display
          const base64Data = await Filesystem.readFile({
            path: image.path!
          });
          
          const imageDataUrl = `data:image/jpeg;base64,${base64Data.data}`;
          
          // Skip intermediate preview - go directly to enhancement
          const enhanced = await enhanceImage(imageDataUrl);
          setCapturedImage(enhanced);
          setEnhancedImage(enhanced);
        }
      } catch (error: any) {
        console.error('Camera error:', error);
        
        if (error.message === 'User cancelled photos app') {
          toast({
            title: 'Avbrutt',
            description: 'Du avbrøt bildeopplastingen',
          });
        } else {
          toast({
            title: 'Kamera feil',
            description: 'Kunne ikke ta bilde. Prøv igjen.',
            variant: 'destructive',
          });
        }
      }
    } else {
      // Web fallback - trigger file input
      fileInputRef.current?.click();
    }
  };

  const pickFromGallery = async () => {
    // Native Capacitor photo picker
    if (isNative) {
      try {
        // @ts-ignore - Capacitor modules loaded dynamically
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        // @ts-ignore
        const { Filesystem } = await import('@capacitor/filesystem');
        
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Photos,
        });
        
        if (image.webPath) {
          // Convert image to base64 data URL for display
          const base64Data = await Filesystem.readFile({
            path: image.path!
          });
          
          const imageDataUrl = `data:image/jpeg;base64,${base64Data.data}`;
          
          // Skip intermediate preview - go directly to enhancement
          const enhanced = await enhanceImage(imageDataUrl);
          setCapturedImage(enhanced);
          setEnhancedImage(enhanced);
        }
      } catch (error: any) {
        console.error('Gallery picker error:', error);
        
        if (error.message === 'User cancelled photos app') {
          toast({
            title: 'Avbrutt',
            description: 'Du avbrøt bildeopplastingen',
          });
        } else {
          toast({
            title: 'Galleri feil',
            description: 'Kunne ikke velge bilde. Prøv igjen.',
            variant: 'destructive',
          });
        }
      }
    } else {
      // Web fallback - trigger file input
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        
        // Skip intermediate preview - go directly to enhancement
        const enhanced = await enhanceImage(imageData);
        setCapturedImage(enhanced);
        setEnhancedImage(enhanced);
      };
      reader.readAsDataURL(file);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setEnhancedImage(null);
    setShowOriginal(false);
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
    navigate('/dashboard');
  };

  if (!capturedImage) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-card border-b">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Skann kvittering</h1>
          <div className="w-10" />
        </div>

        {/* Content area with buttons */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
          <div className="text-center mb-8">
            <CameraIcon className="h-24 w-24 mx-auto mb-4 text-primary opacity-80" />
            <h2 className="text-2xl font-bold mb-2">Ta bilde av kvitteringen</h2>
            <p className="text-muted-foreground">
              Hold kameraet over kvitteringen og ta et klart bilde
            </p>
          </div>

          <div className="w-full max-w-md space-y-4">
            <Button 
              className="w-full h-16 text-lg bg-gradient-brand text-white hover:scale-[1.02] transition-transform" 
              size="lg"
              onClick={takePhoto}
            >
              <CameraIcon className="mr-2 h-6 w-6" />
              Ta bilde
            </Button>

            <Button 
              variant="outline"
              className="w-full h-16 text-lg"
              size="lg"
              onClick={pickFromGallery}
            >
              <ImageIcon className="mr-2 h-6 w-6" />
              Velg fra galleri
            </Button>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground max-w-md">
            <p>Tips: Sørg for god belysning og hold kameraet rett over kvitteringen for best resultat</p>
          </div>
        </div>

        {/* Hidden file input for web fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileUpload}
        />
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
          className="w-full bg-gradient-brand text-white hover:scale-[1.02] transition-transform" 
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
