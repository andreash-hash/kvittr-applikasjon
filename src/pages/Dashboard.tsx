import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, LogOut } from 'lucide-react';
import { getReceipts, calculateStatus, type Receipt } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReceiptCard from '@/components/ReceiptCard';

const Dashboard = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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

  const allReceipts = filterReceipts(receipts);
  const expiringReceipts = filterReceipts(receipts.filter(r => r.status === 'expiring_soon'));
  const giftCards = filterReceipts(receipts.filter(r => r.type === 'gift_card' && r.status === 'active'));
  const returnSlips = filterReceipts(receipts.filter(r => r.type === 'return_slip' && r.status === 'active'));
  const archived = filterReceipts(receipts.filter(r => r.status === 'expired' || r.status === 'used'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary">Kvittr</h1>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="alle" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="alle">Alle</TabsTrigger>
            <TabsTrigger value="utloper">Utløper</TabsTrigger>
            <TabsTrigger value="gavekort">Gavekort</TabsTrigger>
            <TabsTrigger value="bytte">Bytte</TabsTrigger>
            <TabsTrigger value="arkiv">Arkiv</TabsTrigger>
          </TabsList>

          <TabsContent value="alle" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Laster...</p>
              </div>
            ) : allReceipts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Ingen kvitteringer ennå.</p>
                <p className="text-sm mt-2">Trykk + for å legge til.</p>
              </div>
            ) : (
              allReceipts.map(receipt => (
                <ReceiptCard key={receipt.id} receipt={receipt} />
              ))
            )}
          </TabsContent>

          <TabsContent value="utloper" className="space-y-4 mt-4">
            {expiringReceipts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Alt ser bra ut!</p>
                <p className="text-sm mt-2">Ingen kvitteringer utløper snart.</p>
              </div>
            ) : (
              expiringReceipts.map(receipt => (
                <ReceiptCard key={receipt.id} receipt={receipt} />
              ))
            )}
          </TabsContent>

          <TabsContent value="gavekort" className="space-y-4 mt-4">
            {giftCards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Ingen aktive gavekort</p>
              </div>
            ) : (
              giftCards.map(receipt => (
                <ReceiptCard key={receipt.id} receipt={receipt} />
              ))
            )}
          </TabsContent>

          <TabsContent value="bytte" className="space-y-4 mt-4">
            {returnSlips.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Ingen aktive byttelapper</p>
              </div>
            ) : (
              returnSlips.map(receipt => (
                <ReceiptCard key={receipt.id} receipt={receipt} />
              ))
            )}
          </TabsContent>

          <TabsContent value="arkiv" className="space-y-4 mt-4">
            {archived.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Ingen arkiverte elementer</p>
              </div>
            ) : (
              archived.map(receipt => (
                <ReceiptCard key={receipt.id} receipt={receipt} />
              ))
            )}
          </TabsContent>
        </Tabs>
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
