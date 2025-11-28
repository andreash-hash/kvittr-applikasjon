import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2, Save, Loader2, Info, Shield, RefreshCw, Check } from 'lucide-react';
import { getReceipts, saveReceipt, deleteReceipt, type Receipt } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, differenceInMonths, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { isGroceryStore, shouldShowWarranty } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

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
  const [isRetrying, setIsRetrying] = useState(false);
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
        } else if (found.processing_status === 'completed') {
          // Ensure polling is stopped if already completed
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsPolling(false);
          setProcessingError(false);
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
          
          // Stop polling if completed with valid data
          if (found.processing_status === 'completed') {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setIsPolling(false);
            setProcessingError(false);
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
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      // Re-trigger OCR webhook
      const response = await fetch('https://api.kvittr.app/webhook/receipt-ocr', {
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
      
      // Clear error and start polling
      setProcessingError(false);
      setIsRetrying(false);
      
      // Reload to trigger polling
      loadReceipt();
    } catch (error) {
      console.error('Retry error:', error);
      setIsRetrying(false);
      toast({
        title: 'Feil',
        description: 'Kunne ikke starte analyse på nytt',
        variant: 'destructive',
      });
    }
  };

  const handleFillManually = () => {
    // Stop any polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    // Clear all processing states
    setProcessingError(false);
    setIsPolling(false);
    setIsRetrying(false);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!receipt) return;
    try {
      await saveReceipt(receipt);
      setIsEditing(false);
      // Navigate to success screen with receipt type
      navigate(`/success?type=${receipt.type}`);
    } catch (error) {
      toast({
        title: 'Feil',
        description: 'Kunne ikke lagre endringer',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsUsed = async () => {
    if (!receipt) return;
    
    const itemName = receipt.type === 'gift_card' ? 'Gavekort' : 'Byttelapp';
    
    if (!confirm(`Marker som brukt? Dette flytter ${itemName.toLowerCase()} til arkiv.`)) {
      return;
    }
    
    try {
      const updatedReceipt = { 
        ...receipt, 
        status: 'used' as const
      };
      await saveReceipt(updatedReceipt);
      
      toast({
        title: `${itemName} arkivert`,
        description: "Flyttet til arkiv",
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error marking as used:', error);
      toast({
        title: "Feil",
        description: "Kunne ikke arkivere",
        variant: "destructive",
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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center safe-area-all">
        <p className="text-muted-foreground">Laster...</p>
      </div>
    );
  }

  if (!receipt) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 safe-area-all">
      <div className="container max-w-2xl mx-auto p-4 safe-area-left safe-area-right">
        <div className="flex items-center justify-between mb-6" style={{ paddingTop: 'calc(40px + env(safe-area-inset-top))' }}>
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Detaljer</h1>
          <div className="flex items-center gap-2">
            {(receipt.type === 'gift_card' || receipt.type === 'return_slip') && receipt.status !== 'used' && (
              <Button 
                onClick={handleMarkAsUsed}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                Marker som brukt
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          </div>
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

        {/* Retry starting indicator */}
        {isRetrying && (
          <Card className="mb-6 bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <div>
                  <p className="font-medium text-foreground">Starter ny analyse...</p>
                  <p className="text-sm text-muted-foreground">Sender forespørsel...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Polling indicator */}
        {isPolling && !isRetrying && (
          <Card className="mb-6 bg-primary/10">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Analyserer kvittering...</p>
                    <p className="text-sm text-muted-foreground">Dette kan ta 10-20 sekunder</p>
                  </div>
                </div>
                <Button
                  onClick={handleFillManually}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Avbryt analyse
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing error */}
        {processingError && !isRetrying && (
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
                    disabled={isRetrying}
                    className="flex-1"
                  >
                    {isRetrying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sender...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Prøv igjen
                      </>
                    )}
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

            {/* Warranty toggle - only for regular receipts */}
            {receipt.type === 'receipt' && (
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-3 bg-muted/30">
                <div className="flex-1 space-y-0.5">
                  <Label htmlFor="has-warranty" className="text-sm font-medium cursor-pointer">
                    Har garanti / Varig forbruksvare
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Aktiver for varer med garanti (elektronikk, hvitevarer, etc.)
                  </p>
                </div>
                <Switch
                  id="has-warranty"
                  checked={receipt.has_warranty ?? false}
                  onCheckedChange={(checked) => setReceipt({...receipt, has_warranty: checked})}
                  disabled={!isEditing}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Beløp (kr)</Label>
              <Input
                id="amount"
                type="number"
                value={receipt.amount ?? ''}
                onChange={(e) => setReceipt({...receipt, amount: e.target.value ? Number(e.target.value) : undefined})}
                disabled={!isEditing}
                placeholder="Valgfritt"
              />
            </div>

            {/* Conditional fields based on receipt type */}
            {receipt.type === 'return_slip' ? (
              <>
                {/* For byttelapper: Show issue date and expiry */}
                <div className="space-y-2">
                  <Label htmlFor="issue_date">Utstedelsesdato</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={receipt.purchase_date.split('T')[0]}
                    onChange={(e) => setReceipt({...receipt, purchase_date: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="byttelapp_expiry">Gyldig til</Label>
                  <Input
                    id="byttelapp_expiry"
                    type="date"
                    value={receipt.return_until?.split('T')[0] || ''}
                    onChange={(e) => setReceipt({...receipt, return_until: e.target.value})}
                    disabled={!isEditing}
                  />
                  {receipt.return_until && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      {(() => {
                        const expiryDate = new Date(receipt.return_until);
                        const daysRemaining = differenceInDays(expiryDate, new Date());
                        
                        if (daysRemaining < 0) return 'Utløpt';
                        return `${daysRemaining} ${daysRemaining === 1 ? 'dag' : 'dager'} igjen`;
                      })()}
                    </div>
                  )}
                </div>
              </>
            ) : receipt.type === 'gift_card' ? (
              <>
                {/* For gavekort: Show issue date, expiry, and remaining value */}
                <div className="space-y-2">
                  <Label htmlFor="issue_date">Utstedelsesdato</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={receipt.purchase_date.split('T')[0]}
                    onChange={(e) => setReceipt({...receipt, purchase_date: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

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
                    value={receipt.remaining_value ?? ''}
                    onChange={(e) => setReceipt({...receipt, remaining_value: e.target.value ? Number(e.target.value) : undefined})}
                    disabled={!isEditing}
                    placeholder="Valgfritt"
                  />
                </div>
              </>
            ) : (
              <>
                {/* For regular receipts: Show purchase date and warranty */}
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

                {/* Show warranty fields based on has_warranty toggle */}
                {shouldShowWarranty(receipt.has_warranty, receipt.shop_name, receipt.type) ? (
                  <>
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
                  </>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <Badge variant="secondary" className="w-fit">
                      Dagligvare - ingen garanti
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Dagligvarer har normalt ikke garanti eller bytterett. Aktiver bryteren over hvis denne varen har garanti.
                    </p>
                  </div>
                )}
              </>
            )}
            {/* Disclaimer */}
            <div className="mt-4 bg-muted/50 rounded-lg p-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Kvittr bruker AI for automatisk utlesing av kvitteringer. Kontroller alltid at informasjonen stemmer. Du er ansvarlig for å oppbevare original kvittering.
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-2">
                <strong>Garanti:</strong> Automatisk 2 års reklamasjonsrett etter norsk lov, 5 år for varige varer. For byttelapper gjelder butikkens vilkår.
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-2">
                Kvittr er ikke ansvarlig for feil i AI-analysen.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              {isEditing ? (
                <>
                  <Button className="flex-1" onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Lagre
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                  >
                    Avbryt
                  </Button>
                </>
              ) : (
                <Button className="flex-1" onClick={() => setIsEditing(true)}>
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
