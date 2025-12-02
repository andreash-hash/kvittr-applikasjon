import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2 } from 'lucide-react';

interface WebcamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export const WebcamModal = ({ isOpen, onClose, onCapture }: WebcamModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Webcam error:', err);
      setError('Kunne ikke åpne kamera. Sjekk at nettleseren har tilgang til kameraet.');
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      stopCamera();
      onCapture(imageDataUrl);
    }
  }, [onCapture, stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-black/80">
        <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20">
          <X className="h-6 w-6" />
        </Button>
        <h2 className="text-white text-lg font-semibold">Ta bilde</h2>
        <div className="w-10" />
      </div>

      {/* Video preview */}
      <div className="flex-1 flex items-center justify-center bg-black relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="bg-card rounded-lg p-6 max-w-sm text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={handleClose}>Lukk</Button>
            </div>
          </div>
        )}
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`max-w-full max-h-full object-contain ${isLoading || error ? 'invisible' : 'visible'}`}
        />
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Capture button */}
      {!error && (
        <div className="p-6 bg-black/80 flex justify-center">
          <Button
            size="lg"
            onClick={capturePhoto}
            disabled={isLoading}
            className="h-16 w-16 rounded-full bg-white hover:bg-gray-200"
          >
            <Camera className="h-8 w-8 text-black" />
          </Button>
        </div>
      )}
    </div>
  );
};
