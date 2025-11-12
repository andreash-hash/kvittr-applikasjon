import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, LogOut, Receipt as ReceiptIcon, Gift, RefreshCw, Archive, AlertTriangle } from 'lucide-react';
import { getReceipts, calculateStatus, type Receipt } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReceiptCard from '@/components/ReceiptCard';
import { Card } from '@/components/ui/card';

type FilterType = 'alle' | 'kvitteringer' | 'gavekort' | 'bytte' | 'arkiv';

const Dashboard = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('alle');
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

  const filterReceipts = (receipts: Receipt[]) => {
    if (!searchQuery) return receipts;
    const query = searchQuery.toLowerCase();
    return receipts.filter(r => 
      r.shop_name.toLowerCase().includes(query) ||
      r.product_name.toLowerCase().includes(query)
    );
  };

  // Helper to check if item is expiring soon based on type
  const isExpiringSoon = (receipt: Receipt): boolean => {
    const expiryDate = receipt.expiry_date || receipt.warranty_expires || receipt.return_by;
    if (!expiryDate) return false;
    
    const daysUntil = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (receipt.type === 'warranty' && daysUntil <= 30 && daysUntil >= 0) return true;
    if (receipt.type === 'return_slip' && daysUntil <= 14 && daysUntil >= 0) return true;
    if (receipt.type === 'gift_card' && daysUntil <= 60 && daysUntil >= 0) return true;
    
    return false;
  };

  const allReceipts = filterReceipts(receipts);
  const expiringReceipts = filterReceipts(receipts.filter(r => isExpiringSoon(r)));
  const regularReceipts = filterReceipts(receipts.filter(r => r.type === 'receipt' || !r.type));
  const giftCards = filterReceipts(receipts.filter(r => r.type === 'gift_card' && r.status !== 'expired' && r.status !== 'used'));
  const returnSlips = filterReceipts(receipts.filter(r => r.type === 'return_slip' && r.status !== 'expired' && r.status !== 'used'));
  const archived = filterReceipts(receipts.filter(r => r.status === 'expired' || r.status === 'used'));

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
      default:
        return allReceipts;
    }
  };

  const filters = [
    { id: 'alle' as FilterType, label: 'Alle', icon: ReceiptIcon },
    { id: 'kvitteringer' as FilterType, label: 'Kvitteringer', icon: ReceiptIcon },
    { id: 'gavekort' as FilterType, label: 'Gavekort', icon: Gift },
    { id: 'bytte' as FilterType, label: 'Byttelapper', icon: RefreshCw },
    { id: 'arkiv' as FilterType, label: 'Arkiv', icon: Archive },
  ];

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

        {/* Alert card for expiring items */}
        {expiringReceipts.length > 0 && selectedFilter === 'alle' && (
          <Card
            onClick={() => setSelectedFilter('alle')}
            className="bg-orange-500/10 border-orange-500/20 p-4 mb-4 cursor-pointer hover:bg-orange-500/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900 dark:text-orange-100">Utløper snart!</p>
                <p className="text-sm text-orange-700 dark:text-orange-200">
                  {expiringReceipts.length} {expiringReceipts.length === 1 ? 'kvittering' : 'kvitteringer'} utløper snart
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Receipt cards list */}
        <div className="space-y-1.5">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Laster...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Ingen kvitteringer ennå.</p>
              <p className="text-sm mt-2">Trykk + for å legge til.</p>
            </div>
          ) : (
            filteredReceipts.map(receipt => (
              <ReceiptCard key={receipt.id} receipt={receipt} />
            ))
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="container max-w-2xl mx-auto">
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => navigate('/scan')}
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
