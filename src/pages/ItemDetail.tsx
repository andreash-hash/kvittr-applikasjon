import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2, Save } from 'lucide-react';
import { getUser, getReceipts, saveReceipt, deleteReceipt, type Receipt } from '@/lib/storage';
import { formatDate, formatCurrency } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getUser();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!user || !id) {
      navigate('/login');
      return;
    }
    
    const receipts = getReceipts(user.id);
    const found = receipts.find(r => r.id === id);
    if (found) {
      setReceipt(found);
      // Auto-edit if it's a new receipt with default values
      if (found.shop_name === 'Ny butikk' && found.amount === 0) {
        setIsEditing(true);
      }
    } else {
      navigate('/dashboard');
    }
  }, [id, user, navigate]);

  const handleSave = () => {
    if (!receipt) return;
    saveReceipt(receipt);
    setIsEditing(false);
    toast({
      title: 'Lagret',
      description: 'Endringene er lagret',
    });
  };

  const handleDelete = () => {
    if (!receipt || !confirm('Er du sikker på at du vil slette denne?')) return;
    deleteReceipt(receipt.id);
    toast({
      title: 'Slettet',
      description: 'Kvitteringen er slettet',
    });
    navigate('/dashboard');
  };

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
                className="w-full rounded-lg mb-4"
              />
            )}
          </CardContent>
        </Card>

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

            {receipt.type === 'warranty' && (
              <div className="space-y-2">
                <Label htmlFor="warranty_expires">Garanti utløper</Label>
                <Input
                  id="warranty_expires"
                  type="date"
                  value={receipt.warranty_expires?.split('T')[0] || ''}
                  onChange={(e) => setReceipt({...receipt, warranty_expires: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
            )}

            {receipt.type === 'return_slip' && (
              <div className="space-y-2">
                <Label htmlFor="return_by">Bytt innen</Label>
                <Input
                  id="return_by"
                  type="date"
                  value={receipt.return_by?.split('T')[0] || ''}
                  onChange={(e) => setReceipt({...receipt, return_by: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
            )}

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
