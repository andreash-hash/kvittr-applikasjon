import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2, Save, Loader2, Info, Shield, RefreshCw } from 'lucide-react';
import { getReceipts, saveReceipt, deleteReceipt, type Receipt } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, differenceInMonths, format } from 'date-fns';
import { nb } from 'date-fns/locale';

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [processingError, setProcessingError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    loadReceipt();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [id]);

  // Setup realtime listener for receipt updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`receipt-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'receipts',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Receipt updated:', payload);
          if (payload.new.processing_status === 'completed') {
            const updated = payload.new;
            const details = [
              updated.shop_name && `Butikk: ${updated.shop_name}`,
              updated.product_name && `Produkt: ${updated.product_name}`,
              updated.amount && `Beløp: ${updated.amount} kr`,
              updated.warranty_until && `Garanti til: ${new Date(updated.warranty_until).toLocaleDateString('nb-NO')}`,
              updated.return_until && `Bytt innen: ${new Date(updated.return_until).toLocaleDateString('nb-NO')}`
            ].filter(Boolean).join(' • ');
            
            toast({
              title: 'Kvittering analysert! ✨',
              description: details || 'Data ekstrahert og oppdatert.',
            });
            loadReceipt();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const loadReceipt = async () => {
    if (!id) {
      navigate('/dashboard');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }

    try {
      const receipts = await getReceipts(session.user.id);
      const found = receipts.find(r => r.id === id);
      if (found) {
        setReceipt(found);
        // Auto-edit if it's a new receipt with default values
        if (found.shop_name === 'Ny butikk' && found.amount === 0) {
          setIsEditing(true);
        }
        
        // Start polling if processing is pending
        if (found.processing_status === 'pending' && !pollIntervalRef.current) {
          startPolling();
        } else if (found.processing_status === 'failed') {
          setProcessingError(true);
        }
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste kvittering',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    setIsPolling(true);
    setProcessingError(false);
    pollStartTimeRef.current = Date.now();
    
    pollIntervalRef.current = setInterval(async () => {
      if (!id) return;
      
      const elapsed = Date.now() - (pollStartTimeRef.current || 0);
      
      // Timeout after 25 seconds
      if (elapsed > 25000) {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        setIsPolling(false);
        setProcessingError(true);
        
        // Mark as failed in database
        await supabase
          .from('receipts')
          .update({ processing_status: 'failed' })
          .eq('id', id);
        
        return;
      }
      
      // Poll for updates
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const receipts = await getReceipts(session.user.id);
        const found = receipts.find(r => r.id === id);
        
        if (found) {
          setReceipt(found);
          
          if (found.processing_status === 'completed') {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setIsPolling(false);
            toast({
              title: 'Ferdig!',
              description: 'Kvitteringen er analysert',
            });
          } else if (found.processing_status === 'failed') {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setIsPolling(false);
            setProcessingError(true);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  };

  const handleRetry = async () => {
    if (!receipt) return;
    
    setRetryCount(prev => prev + 1);
    
    try {
      // Re-trigger OCR webhook
      const response = await fetch('https://diabetes-prepare-stopping-daniel.trycloudflare.com/webhook/receipt-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_id: receipt.id,
          image_url: receipt.image_url,
          user_id: receipt.user_id
        })
      });
      
      if (!response.ok) throw new Error('Webhook failed');
      
      // Update status to pending
      await supabase
        .from('receipts')
        .update({ processing_status: 'pending' })
        .eq('id', receipt.id);
      
      // Reload to trigger polling
      loadReceipt();
    } catch (error) {
      console.error('Retry error:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke starte analyse på nytt',
        variant: 'destructive',
      });
    }
  };

  const handleFillManually = () => {
    setProcessingError(false);
    setIsPolling(false);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!receipt) return;
    try {
      await saveReceipt(receipt);
      setIsEditing(false);
      toast({
        title: 'Lagret',
        description: 'Endringene er lagret',
      });
    } catch (error) {
      toast({
        title: 'Feil',
        description: 'Kunne ikke lagre endringer',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!receipt || !confirm('Er du sikker på at du vil slette denne?')) return;
    try {
      await deleteReceipt(receipt.id);
      toast({
        title: 'Slettet',
        description: 'Kvitteringen er slettet',
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette kvittering',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <p className="text-muted-foreground">Laster...</p>
      </div>
    );
  }

  if (!receipt) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Detaljer</h1>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-5 w-5 text-destructive" />
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            {receipt.image_url && (
              <img 
                src={receipt.image_url} 
                alt="Receipt"
                className="w-full rounded-lg object-contain"
                style={{ maxHeight: '250px' }}
              />
            )}
          </CardContent>
        </Card>

        {/* Polling indicator */}
        {isPolling && (
          <Card className="mb-6 bg-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div>
                  <p className="font-medium text-foreground">Analyserer kvittering...</p>
                  <p className="text-sm text-muted-foreground">Dette tar vanligvis 10-20 sekunder</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing error */}
        {processingError && (
          <Card className="mb-6 bg-orange-500/10 border-orange-500/20">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {retryCount === 0 
                        ? 'Analysen tok lengre tid enn forventet'
                        : 'Tjenesten ser ut til å være overbelastet'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {retryCount === 0
                        ? 'Dette kan skyldes høy belastning på tjenesten.'
                        : 'Prøv igjen etter 2-3 minutter, eller fyll ut manuelt.'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRetry}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Prøv igjen
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={handleFillManually}
                    className="flex-1"
                  >
                    Fyll ut manuelt
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Informasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {receipt.processing_status === 'pending' && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Analyserer kvittering...</p>
                  <p className="text-sm opacity-90">Dette kan ta noen sekunder. Siden oppdateres automatisk.</p>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select 
                value={receipt.type} 
                onValueChange={(value) => setReceipt({...receipt, type: value as Receipt['type']})}
                disabled={!isEditing}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">Kvittering</SelectItem>
                  <SelectItem value="warranty">Garantibevis</SelectItem>
                  <SelectItem value="return_slip">Byttelapp</SelectItem>
                  <SelectItem value="gift_card">Gavekort</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shop">Butikk</Label>
              <Input
                id="shop"
                value={receipt.shop_name}
                onChange={(e) => setReceipt({...receipt, shop_name: e.target.value})}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Produkt</Label>
              <Input
                id="product"
                value={receipt.product_name}
                onChange={(e) => setReceipt({...receipt, product_name: e.target.value})}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Beløp (kr)</Label>
              <Input
                id="amount"
                type="number"
                value={receipt.amount}
                onChange={(e) => setReceipt({...receipt, amount: Number(e.target.value)})}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_date">Kjøpsdato</Label>
              <Input
                id="purchase_date"
                type="date"
                value={receipt.purchase_date.split('T')[0]}
                onChange={(e) => setReceipt({...receipt, purchase_date: e.target.value})}
                disabled={!isEditing}
              />
            </div>

            {/* Warranty information */}
            <div className="space-y-2">
              <Label htmlFor="warranty_until">Garanti til</Label>
              <Input
                id="warranty_until"
                type="date"
                value={receipt.warranty_until?.split('T')[0] || ''}
                onChange={(e) => setReceipt({...receipt, warranty_until: e.target.value})}
                disabled={!isEditing}
              />
              {receipt.warranty_until && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {(() => {
                    const warrantyDate = new Date(receipt.warranty_until);
                    const daysRemaining = differenceInDays(warrantyDate, new Date());
                    const monthsRemaining = differenceInMonths(warrantyDate, new Date());
                    
                    if (daysRemaining < 0) return 'Garanti utløpt';
                    if (monthsRemaining > 0) return `${monthsRemaining} ${monthsRemaining === 1 ? 'måned' : 'måneder'} igjen`;
                    return `${daysRemaining} ${daysRemaining === 1 ? 'dag' : 'dager'} igjen`;
                  })()}
                </div>
              )}
            </div>

            {/* Return/exchange deadline */}
            <div className="space-y-2">
              <Label htmlFor="return_until">Byttefrist til</Label>
              <Input
                id="return_until"
                type="date"
                value={receipt.return_until?.split('T')[0] || ''}
                onChange={(e) => setReceipt({...receipt, return_until: e.target.value})}
                disabled={!isEditing}
              />
              {receipt.return_until && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {(() => {
                    const returnDate = new Date(receipt.return_until);
                    const daysRemaining = differenceInDays(returnDate, new Date());
                    
                    if (daysRemaining < 0) return 'Byttefrist utløpt';
                    return `${daysRemaining} ${daysRemaining === 1 ? 'dag' : 'dager'} igjen`;
                  })()}
                </div>
              )}
            </div>
            
            {/* Norwegian consumer protection info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Reklamasjonsrett:</strong> Automatisk 2 års reklamasjonsrett etter norsk lov. 5 år for varige forbruksvarer.
              </AlertDescription>
            </Alert>

            {receipt.type === 'gift_card' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Gyldig til</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={receipt.expiry_date?.split('T')[0] || ''}
                    onChange={(e) => setReceipt({...receipt, expiry_date: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remaining_value">Restverdi (kr)</Label>
                  <Input
                    id="remaining_value"
                    type="number"
                    value={receipt.remaining_value || receipt.amount}
                    onChange={(e) => setReceipt({...receipt, remaining_value: Number(e.target.value)})}
                    disabled={!isEditing}
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              {isEditing ? (
                <>
                  <Button className="flex-1" onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Lagre
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => setIsEditing(false)}
                  >
                    Avbryt
                  </Button>
                </>
              ) : (
                <Button className="w-full" onClick={() => setIsEditing(true)}>
                  Rediger
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ItemDetail;
