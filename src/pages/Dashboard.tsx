import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, LogOut, Receipt as ReceiptIcon, Gift, RefreshCw, Archive, AlertTriangle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { getReceipts, calculateStatus, type Receipt } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReceiptCard from '@/components/ReceiptCard';
import { Card } from '@/components/ui/card';
import { differenceInDays } from 'date-fns';

type FilterType = 'alle' | 'kvitteringer' | 'gavekort' | 'bytte' | 'arkiv' | 'expiring';

const Dashboard = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('alle');
  const [showUsedReceipts, setShowUsedReceipts] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadReceipts();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/login');
      } else if (event === 'SIGNED_IN') {
        loadReceipts(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Setup realtime listener for receipt updates
  useEffect(() => {
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
  }, []);

  const checkAuthAndLoadReceipts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }
    await loadReceipts(session.user.id);
  };

  const loadReceipts = async (userId: string) => {
    try {
      setIsLoading(true);
      const allReceipts = await getReceipts(userId);
      const withStatus = allReceipts.map(r => ({ ...r, status: calculateStatus(r) }));
      setReceipts(withStatus);
    } catch (error) {
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste kvitteringer',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleExpiringClick = () => {
    setSelectedFilter('expiring');
    setTimeout(() => {
      const firstCard = document.querySelector('[data-expiring="true"]');
      if (firstCard) {
        firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const filterReceipts = (receipts: Receipt[]) => {
    let filtered = receipts;

    // Filter out used receipts unless showUsedReceipts is true or we're in arkiv view
    if (!showUsedReceipts && selectedFilter !== 'arkiv') {
      filtered = filtered.filter(r => !(r.is_used === true));
    }

    // Apply category filter first
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
    } else if (selectedFilter === 'expiring') {
      // Expiring filter is handled directly in getFilteredReceipts()
      // Don't pre-filter here to allow proper date-based filtering
      return filtered;
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

  const allReceipts = filterReceipts(receipts);
  
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
  
  const expiringReceipts = filterReceipts(receipts.filter(receipt => {
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
  
  const regularReceipts = filterReceipts(receipts.filter(r => 
    (r.type === 'receipt' || !r.type) && r.status !== 'expired' && r.status !== 'used'
  ));
  const giftCards = filterReceipts(receipts.filter(r => 
    r.type === 'gift_card' && r.status !== 'expired' && r.status !== 'used'
  ));
  const returnSlips = filterReceipts(receipts.filter(r => 
    r.type === 'return_slip' && r.status !== 'expired' && r.status !== 'used'
  ));
  const archived = filterReceipts(receipts.filter(r => 
    r.status === 'expired' || r.status === 'used'
  ));

  const getFilteredReceipts = () => {
    console.log('getFilteredReceipts called with filter:', selectedFilter);
    
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
        // Use the same logic as counting - filter receipts expiring soon
        const expiringFiltered = allReceipts.filter(receipt => {
          // Check warranty_until within 60 days
          if (receipt.warranty_until) {
            const daysUntilExpiry = differenceInDays(new Date(receipt.warranty_until), new Date());
            console.log(`Receipt ${receipt.id} - ${receipt.shop_name}: warranty_until=${receipt.warranty_until}, daysUntil=${daysUntilExpiry}`);
            if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) return true;
          }
          
          // Check return_until within 14 days
          if (receipt.return_until) {
            const daysUntilExpiry = differenceInDays(new Date(receipt.return_until), new Date());
            console.log(`Receipt ${receipt.id} - ${receipt.shop_name}: return_until=${receipt.return_until}, daysUntil=${daysUntilExpiry}`);
            if (daysUntilExpiry >= 0 && daysUntilExpiry <= 14) return true;
          }
          
          // Check legacy fields for backward compatibility
          if (receipt.type === 'gift_card' && receipt.expiry_date) {
            const daysUntilExpiry = differenceInDays(new Date(receipt.expiry_date), new Date());
            console.log(`Receipt ${receipt.id} - ${receipt.shop_name}: gift_card expiry_date=${receipt.expiry_date}, daysUntil=${daysUntilExpiry}`);
            if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) return true;
          }
          if (receipt.type === 'return_slip' && receipt.return_by) {
            const daysUntilExpiry = differenceInDays(new Date(receipt.return_by), new Date());
            console.log(`Receipt ${receipt.id} - ${receipt.shop_name}: return_slip return_by=${receipt.return_by}, daysUntil=${daysUntilExpiry}`);
            if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) return true;
          }
          
          return false;
        });
        console.log(`Found ${expiringFiltered.length} expiring receipts`);
        return expiringFiltered;
      default:
        return allReceipts;
    }
  };

  const getEmptyStateMessage = () => {
    switch (selectedFilter) {
      case 'alle':
        return {
          primary: 'Ingen kvitteringer ennå.',
          secondary: 'Trykk + for å legge til.'
        };
      case 'kvitteringer':
        return {
          primary: 'Ingen vanlige kvitteringer.',
          secondary: 'Skann en kvittering for å komme i gang!'
        };
      case 'gavekort':
        return {
          primary: 'Ingen gavekort registrert.',
          secondary: 'Skann et gavekort for å holde styr på saldo!'
        };
      case 'bytte':
        return {
          primary: 'Ingen byttelapper eller tilgodelapper.',
          secondary: 'Skann en for å holde oversikt!'
        };
      case 'arkiv':
        return {
          primary: 'Ingenting i arkivet ennå.',
          secondary: 'Utløpte kvitteringer og brukte gavekort havner her.'
        };
      default:
        return {
          primary: 'Ingen kvitteringer ennå.',
          secondary: 'Trykk + for å legge til.'
        };
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary">Kvittr</h1>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Button
            variant={showUsedReceipts ? "default" : "ghost"}
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => setShowUsedReceipts(!showUsedReceipts)}
            title={showUsedReceipts ? "Skjul brukte kvitteringer" : "Vis brukte kvitteringer"}
          >
            {showUsedReceipts ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>

        {/* Horizontal scrolling filter cards */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide -mx-4 px-4">
          {filters.map((filter) => {
            const FilterIcon = filter.icon;
            const isSelected = selectedFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`flex-shrink-0 w-[100px] h-[80px] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card text-muted-foreground border border-border'
                }`}
              >
                <FilterIcon className="h-6 w-6" />
                <span className="text-xs font-medium">{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Alert card - Always visible with two states */}
        <Card
          onClick={expiringReceipts.length > 0 ? () => {
            setSelectedFilter('expiring');
            setSearchQuery('');
            setTimeout(() => {
              const firstCard = document.querySelector('[data-expiring="true"]');
              if (firstCard) {
                firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          } : undefined}
          className={`p-4 mb-4 transition-all rounded-xl h-[60px] flex items-center ${
            expiringReceipts.length > 0
              ? 'bg-[#FF9500] text-white cursor-pointer hover:bg-[#FF9500]/90 hover:scale-[1.01]'
              : 'bg-[#F3F4F6] dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {expiringReceipts.length > 0 ? (
                <>
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-sm leading-tight">
                      Utløper snart! {expiringCount} garantier/bytteretter utløper snart!
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-orange-600 dark:text-orange-400 ml-auto" />
                </>
              ) : (
                <>
                  <span className="text-2xl">✓</span>
                  <div>
                    <p className="font-semibold text-xs leading-tight">
                      Alt ser bra ut! Ingen garantier eller bytteretter utløper de neste 60 dagene
                    </p>
                  </div>
                </>
              )}
            </div>
            {expiringReceipts.length > 0 && (
              <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </Card>

        {/* Receipt cards list */}
        <div className="space-y-1.5">
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
              // Check if this receipt is expiring
              const isExpiring = expiringReceipts.some(er => er.id === receipt.id);
              return (
                <div key={receipt.id} data-expiring={isExpiring}>
                  <ReceiptCard receipt={receipt} />
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="container max-w-2xl mx-auto">
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => {
              // Auto-select type based on current filter
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
