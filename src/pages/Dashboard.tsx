import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, LogOut, Receipt as ReceiptIcon, Gift, RefreshCw, Archive, ArrowRight, X, Settings, UserPlus } from 'lucide-react';
import { getReceipts, calculateStatus, type Receipt } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import ReceiptCard from '@/components/ReceiptCard';
import { Card } from '@/components/ui/card';
import { differenceInDays } from 'date-fns';
import PullToRefresh from '@/components/PullToRefresh';
import SwipeableCard from '@/components/SwipeableCard';
import { useToastNotification } from '@/components/CenteredToast';
import { Logo } from '@/components/Logo';
import { getGuestReceipts, hasGuestReceipts, getRemainingGuestScans, isGuestPremium, type GuestReceipt } from '@/lib/guestStorage';
import { checkScanLimit, FREE_MONTHLY_SCANS, type ScanLimitStatus } from '@/lib/scanLimit';

type FilterType = 'alle' | 'kvitteringer' | 'gavekort' | 'bytte' | 'arkiv' | 'expiring';

const Dashboard = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [guestReceipts, setGuestReceipts] = useState<GuestReceipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('alle');
  const [scanLimitStatus, setScanLimitStatus] = useState<ScanLimitStatus | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToastNotification();

  // DEV ONLY: Test toast buttons - remove after testing
  const testToasts = () => {
    showToast('Kvittering lagret!', 'success');
    setTimeout(() => showToast('Noe gikk galt', 'error'), 2000);
  };

  useEffect(() => {
    checkAuthAndLoadReceipts();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        // Guest mode - always allow access
        setIsGuest(true);
        setGuestReceipts(getGuestReceipts());
        setIsLoading(false);
      } else {
        // Any session means user is logged in
        setIsGuest(false);
        loadReceipts(session.user.id);
        loadScanLimit(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Setup realtime listener for receipt updates
  useEffect(() => {
    if (isGuest) return;
    
    const channel = supabase
      .channel('receipt-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'receipts'
        },
        (payload) => {
          console.log('Receipt updated:', payload);
          if (payload.new.processing_status === 'completed') {
            // Refresh receipts when OCR completes
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                loadReceipts(session.user.id);
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isGuest]);

  const checkAuthAndLoadReceipts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Guest mode - always allow access (they can scan up to 3 times)
      setIsGuest(true);
      setGuestReceipts(getGuestReceipts());
      setIsLoading(false);
      return;
    }

    setIsGuest(false);
    
    // Sync localStorage onboarding flag to Supabase if needed
    const localOnboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
    if (localOnboardingCompleted) {
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', session.user.id);
      } catch (error) {
        console.error('Error syncing onboarding status:', error);
      }
    }

    await loadReceipts(session.user.id);
    await loadScanLimit(session.user.id);
  };

  const loadReceipts = async (userId: string) => {
    try {
      setIsLoading(true);
      const allReceipts = await getReceipts(userId);
      const withStatus = allReceipts.map(r => ({ ...r, status: calculateStatus(r) }));
      setReceipts(withStatus);
    } catch (error) {
      showToast('Kunne ikke laste kvitteringer', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadScanLimit = async (userId: string) => {
    const status = await checkScanLimit(userId);
    setScanLimitStatus(status);
  };

  const handleRefresh = useCallback(async () => {
    if (isGuest) {
      setGuestReceipts(getGuestReceipts());
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await loadReceipts(session.user.id);
    }
  }, [isGuest]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    if (isGuest) {
      // For guest mode, remove from local storage
      const updatedGuest = guestReceipts.filter(r => r.id !== receiptId);
      localStorage.setItem('kvittr_guest_receipts', JSON.stringify(updatedGuest));
      setGuestReceipts(updatedGuest);
      showToast('Slettet!', 'success');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId);
      
      if (error) throw error;
      
      setReceipts(prev => prev.filter(r => r.id !== receiptId));
      showToast('Slettet!', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Kunne ikke slette', 'error');
    }
  };

  const handleArchiveReceipt = async (receiptId: string) => {
    if (isGuest) {
      showToast('Opprett konto for å arkivere', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('receipts')
        .update({ is_used: true })
        .eq('id', receiptId);
      
      if (error) throw error;
      
      setReceipts(prev => prev.map(r => 
        r.id === receiptId ? { ...r, is_used: true, status: 'used' } : r
      ));
      showToast('Flyttet til arkiv', 'success');
    } catch (error) {
      console.error('Archive error:', error);
      showToast('Kunne ikke arkivere', 'error');
    }
  };

  const filterReceipts = (receipts: Receipt[]) => {
    let filtered = receipts;

    // Filter out used receipts unless we're in arkiv view
    if (selectedFilter !== 'arkiv') {
      filtered = filtered.filter(r => !(r.is_used === true));
    }

    // Apply category filter first (but NOT for expiring - that's handled in getFilteredReceipts)
    if (selectedFilter === 'kvitteringer') {
      filtered = filtered.filter(r => r.type === 'receipt');
    } else if (selectedFilter === 'gavekort') {
      filtered = filtered.filter(r => r.type === 'gift_card');
    } else if (selectedFilter === 'bytte') {
      filtered = filtered.filter(r => r.type === 'return_slip');
    } else if (selectedFilter === 'arkiv') {
      filtered = filtered.filter(r => {
        const status = calculateStatus(r);
        return status === 'expired' || status === 'used' || r.is_used === true;
      });
    }

    // Then apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.shop_name.toLowerCase().includes(query) ||
        r.product_name.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  // Convert guest receipts to Receipt format for display
  const convertGuestToReceipts = (guestReceipts: GuestReceipt[]): Receipt[] => {
    return guestReceipts.map(gr => ({
      id: gr.id,
      user_id: 'guest',
      type: gr.type,
      shop_name: gr.shop_name,
      product_name: gr.product_name,
      amount: gr.amount,
      purchase_date: gr.purchase_date,
      image_url: gr.image_url,
      status: 'active' as const,
      created_at: gr.created_at,
      is_used: false,
    }));
  };

  const displayReceipts = isGuest ? convertGuestToReceipts(guestReceipts) : receipts;
  const allReceipts = filterReceipts(displayReceipts);
  
  // Check for expiring items
  const expiringCount = allReceipts.filter(receipt => {
    // Check warranty_until within 60 days
    if (receipt.warranty_until) {
      const daysUntilExpiry = differenceInDays(new Date(receipt.warranty_until), new Date());
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) return true;
    }
    
    // Check return_until within 14 days
    if (receipt.return_until) {
      const daysUntilExpiry = differenceInDays(new Date(receipt.return_until), new Date());
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 14) return true;
    }
    
    // Check legacy fields for backward compatibility
    if (receipt.type === 'gift_card' && receipt.expiry_date) {
      const daysUntilExpiry = differenceInDays(new Date(receipt.expiry_date), new Date());
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) return true;
    }
    if (receipt.type === 'return_slip' && receipt.return_by) {
      const daysUntilExpiry = differenceInDays(new Date(receipt.return_by), new Date());
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) return true;
    }
    
    return false;
  }).length;
  
  const expiringReceipts = filterReceipts(displayReceipts.filter(receipt => {
    // Check warranty_until within 60 days
    if (receipt.warranty_until) {
      const daysUntilExpiry = differenceInDays(new Date(receipt.warranty_until), new Date());
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) return true;
    }
    
    // Check return_until within 14 days
    if (receipt.return_until) {
      const daysUntilExpiry = differenceInDays(new Date(receipt.return_until), new Date());
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 14) return true;
    }
    
    return false;
  }));
  
  const regularReceipts = filterReceipts(displayReceipts.filter(r => 
    (r.type === 'receipt' || !r.type) && r.status !== 'expired' && r.status !== 'used'
  ));
  const giftCards = filterReceipts(displayReceipts.filter(r => 
    r.type === 'gift_card' && r.status !== 'expired' && r.status !== 'used'
  ));
  const returnSlips = filterReceipts(displayReceipts.filter(r => 
    r.type === 'return_slip' && r.status !== 'expired' && r.status !== 'used'
  ));
  const archived = filterReceipts(displayReceipts.filter(r => 
    r.status === 'expired' || r.status === 'used'
  ));

  const getFilteredReceipts = () => {
    switch (selectedFilter) {
      case 'alle':
        return allReceipts;
      case 'kvitteringer':
        return regularReceipts;
      case 'gavekort':
        return giftCards;
      case 'bytte':
        return returnSlips;
      case 'arkiv':
        return archived;
      case 'expiring':
        const expiringFiltered = allReceipts.filter(receipt => {
          if (receipt.warranty_until) {
            const daysUntilExpiry = differenceInDays(new Date(receipt.warranty_until), new Date());
            if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) return true;
          }
          if (receipt.return_until) {
            const daysUntilExpiry = differenceInDays(new Date(receipt.return_until), new Date());
            if (daysUntilExpiry >= 0 && daysUntilExpiry <= 14) return true;
          }
          if (receipt.type === 'gift_card' && receipt.expiry_date) {
            const daysUntilExpiry = differenceInDays(new Date(receipt.expiry_date), new Date());
            if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) return true;
          }
          if (receipt.type === 'return_slip' && receipt.return_by) {
            const daysUntilExpiry = differenceInDays(new Date(receipt.return_by), new Date());
            if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) return true;
          }
          return false;
        });
        return expiringFiltered;
      default:
        return allReceipts;
    }
  };

  const getEmptyStateMessage = () => {
    switch (selectedFilter) {
      case 'alle':
        return { primary: 'Ingen kvitteringer ennå.', secondary: 'Trykk + for å legge til.' };
      case 'kvitteringer':
        return { primary: 'Ingen vanlige kvitteringer.', secondary: 'Skann en kvittering for å komme i gang!' };
      case 'gavekort':
        return { primary: 'Ingen gavekort registrert.', secondary: 'Skann et gavekort for å holde styr på saldo!' };
      case 'bytte':
        return { primary: 'Ingen byttelapper eller tilgodelapper.', secondary: 'Skann en for å holde oversikt!' };
      case 'arkiv':
        return { primary: 'Ingenting i arkivet ennå.', secondary: 'Utløpte kvitteringer og brukte gavekort havner her.' };
      default:
        return { primary: 'Ingen kvitteringer ennå.', secondary: 'Trykk + for å legge til.' };
    }
  };

  const filters = [
    { id: 'alle' as FilterType, label: 'Alle', icon: ReceiptIcon },
    { id: 'kvitteringer' as FilterType, label: 'Kvitteringer', icon: ReceiptIcon },
    { id: 'gavekort' as FilterType, label: 'Gavekort', icon: Gift },
    { id: 'bytte' as FilterType, label: 'Byttelapper', icon: RefreshCw },
    { id: 'arkiv' as FilterType, label: 'Arkiv', icon: Archive },
  ];
  
  const handleScanNew = (preselectedType?: string) => {
    navigate('/scan', { state: { preselectedType } });
  };

  const filteredReceipts = getFilteredReceipts();

  return (
    <div className="min-h-screen bg-background">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="container max-w-2xl mx-auto p-4 pb-28 safe-area-top safe-area-left safe-area-right" style={{ paddingTop: 'calc(24px + env(safe-area-inset-top))' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Logo size="small" clickable />
              {/* DEV ONLY: Test toasts - remove after testing */}
              <Button variant="outline" size="sm" onClick={testToasts} className="text-xs">
                Test Toasts
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
              {!isGuest && (
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Search field - without eye icon, with clear button */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søk etter butikk eller produkt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-12 rounded-xl bg-card border-border"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Horizontal scrolling filter cards - refined */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide -mx-4 px-4">
            {filters.map((filter) => {
              const FilterIcon = filter.icon;
              const isSelected = selectedFilter === filter.id;
              
              // Category-specific colors matching logo
              const getCategoryColor = () => {
                if (!isSelected) return '';
                switch(filter.id) {
                  case 'kvitteringer': return 'bg-category-receipt';
                  case 'bytte': return 'bg-category-return';
                  case 'gavekort': return 'bg-category-giftcard';
                  default: return 'bg-primary';
                }
              };
              
              return (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`flex-shrink-0 w-[90px] h-[56px] rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
                    isSelected
                      ? `${getCategoryColor()} text-white shadow-md`
                      : 'bg-card text-muted-foreground border border-border hover:bg-muted'
                  }`}
                >
                  <FilterIcon className="h-5 w-5" />
                  <span className="text-xs font-medium">{filter.label}</span>
                </button>
              );
            })}
          </div>

          {/* Guest mode banner */}
          {isGuest && (
            <Card className={`p-4 mb-4 border-l-4 rounded-xl ${
              isGuestPremium() 
                ? 'bg-success/10 border-l-success' 
                : 'bg-primary/10 border-l-primary'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  {isGuestPremium() ? (
                    <>
                      <p className="font-medium text-sm text-success">
                        ✨ Premium aktiv - Ubegrenset scanninger
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Opprett konto for å synkronisere på tvers av enheter
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-sm">
                        Gratis prøveversjon: {getRemainingGuestScans()} av 3 prøvescanninger gjenstående
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Opprett konto for å få 2 gratis scanninger per måned
                      </p>
                    </>
                  )}
                </div>
                <Button size="sm" variant="default" onClick={() => navigate('/signup')}>
                  Opprett konto
                </Button>
              </div>
            </Card>
          )}

          {/* Premium banner for logged-in premium users */}
          {!isGuest && scanLimitStatus?.isPremium && (
            <Card className="p-4 mb-4 border-l-4 rounded-xl bg-success/10 border-l-success">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-success">
                    ✨ Premium aktiv - Ubegrenset scanninger
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Takk for at du støtter Kvittr!
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Monthly scan limit banner for logged-in free users */}
          {!isGuest && scanLimitStatus && !scanLimitStatus.isPremium && (
            <Card className={`p-4 mb-4 border-l-4 rounded-xl ${
              scanLimitStatus.scansRemaining === 0
                ? 'bg-destructive/10 border-l-destructive'
                : 'bg-primary/10 border-l-primary'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    Gratis plan: {scanLimitStatus.scansRemaining} av {FREE_MONTHLY_SCANS} scanninger denne måneden gjenstående
                  </p>
                  {scanLimitStatus.scansRemaining === 0 ? (
                    <p className="text-xs text-destructive mt-0.5">
                      Du har brukt opp gratis scanninger denne måneden
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Oppgrader til Premium for ubegrenset
                    </p>
                  )}
                </div>
                <Button 
                  size="sm" 
                  variant="default" 
                  onClick={() => navigate('/premium')}
                >
                  Oppgrader til Premium
                </Button>
              </div>
            </Card>
          )}

          {!isGuest && (
          <Card
            onClick={expiringReceipts.length > 0 ? () => setSelectedFilter('expiring') : undefined}
            className={`p-4 mb-4 transition-all rounded-xl h-[56px] flex items-center border-l-4 ${
              expiringReceipts.length > 0
                ? 'bg-category-expiring/10 border-l-category-expiring text-category-expiring cursor-pointer hover:bg-category-expiring/15'
                : 'bg-success/10 border-l-success text-success'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                 {expiringReceipts.length > 0 ? (
                  <>
                    <span className="text-xl">⚠️</span>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                      {expiringCount} garantier/bytteretter utløper snart!
                    </p>
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                      <span className="text-success-foreground text-sm">✓</span>
                    </div>
                    <p className="font-medium text-xs text-success">
                      Alt ser bra ut! Ingen garantier utløper de neste 60 dagene
                    </p>
                  </>
                )}
              </div>
            </div>
          </Card>
          )}

          {/* Receipt cards list with swipe actions */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Laster...</p>
              </div>
            ) : filteredReceipts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>{getEmptyStateMessage().primary}</p>
                <p className="text-sm mt-2">{getEmptyStateMessage().secondary}</p>
              </div>
            ) : (
              filteredReceipts.map(receipt => {
                const isExpiring = expiringReceipts.some(er => er.id === receipt.id);
                const isArchived = selectedFilter === 'arkiv';
                return (
                  <div key={receipt.id} data-expiring={isExpiring}>
                    <SwipeableCard
                      onDelete={() => handleDeleteReceipt(receipt.id)}
                      onArchive={() => handleArchiveReceipt(receipt.id)}
                      disabled={isArchived}
                    >
                      <ReceiptCard receipt={receipt} />
                    </SwipeableCard>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </PullToRefresh>

      {/* Bottom scan button with safe area */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border p-4 safe-area-left safe-area-right" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
        <div className="container max-w-2xl mx-auto">
          <Button
            className="w-full h-14 text-base font-semibold rounded-xl" 
            size="lg"
            onClick={() => {
              let preselectedType = 'receipt';
              if (selectedFilter === 'gavekort') preselectedType = 'gift_card';
              if (selectedFilter === 'bytte') preselectedType = 'return_slip';
              handleScanNew(preselectedType);
            }}
          >
            <Plus className="mr-2 h-5 w-5" />
            Skann ny
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
