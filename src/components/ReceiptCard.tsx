import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt } from '@/lib/storage';
import { formatDate, formatCurrency, getDaysUntil, formatDaysRemaining } from '@/lib/format';
import { useNavigate } from 'react-router-dom';

interface ReceiptCardProps {
  receipt: Receipt;
}

const ReceiptCard = ({ receipt }: ReceiptCardProps) => {
  const navigate = useNavigate();
  
  const getStatusBadge = () => {
    const expiryDate = receipt.expiry_date || receipt.warranty_expires || receipt.return_by;
    const daysUntil = expiryDate ? getDaysUntil(expiryDate) : null;
    
    // For expired/used items
    if (receipt.status === 'expired') {
      return <Badge variant="destructive">Utløpt</Badge>;
    }
    if (receipt.status === 'used') {
      return <Badge variant="secondary">Brukt</Badge>;
    }
    
    // For active items with specific type labels
    if (daysUntil !== null && daysUntil >= 0) {
      const isExpiringSoon = 
        (receipt.type === 'warranty' && daysUntil <= 30) ||
        (receipt.type === 'return_slip' && daysUntil <= 14) ||
        (receipt.type === 'gift_card' && daysUntil <= 60);
      
      if (isExpiringSoon) {
        if (receipt.type === 'warranty') {
          return <Badge variant="warning">Garanti utløper om {daysUntil} dag{daysUntil !== 1 ? 'er' : ''}</Badge>;
        }
        if (receipt.type === 'return_slip') {
          return <Badge variant="warning">Byttefrist utløper om {daysUntil} dag{daysUntil !== 1 ? 'er' : ''}</Badge>;
        }
        if (receipt.type === 'gift_card') {
          return <Badge variant="warning">Gavekort utløper om {daysUntil} dag{daysUntil !== 1 ? 'er' : ''}</Badge>;
        }
      }
      
      // Active with days remaining
      if (receipt.type === 'warranty') {
        return <Badge variant="default">Garanti aktiv ({daysUntil} dag{daysUntil !== 1 ? 'er' : ''} igjen)</Badge>;
      }
      if (receipt.type === 'return_slip') {
        return <Badge variant="default">Byttefrist aktiv ({daysUntil} dag{daysUntil !== 1 ? 'er' : ''} igjen)</Badge>;
      }
      if (receipt.type === 'gift_card' && receipt.remaining_value) {
        return <Badge variant="default">Gavekort {formatCurrency(receipt.remaining_value)} ({daysUntil} dag{daysUntil !== 1 ? 'er' : ''} igjen)</Badge>;
      }
    }
    
    // Default active badge
    return <Badge variant="default">Aktiv</Badge>;
  };

  const expiryDate = receipt.expiry_date || receipt.warranty_expires || receipt.return_by;
  const daysUntil = expiryDate ? getDaysUntil(expiryDate) : null;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/item/${receipt.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-md bg-muted flex-shrink-0 overflow-hidden">
            {receipt.image_url ? (
              <img 
                src={receipt.image_url} 
                alt={receipt.product_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                Ingen bilde
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {receipt.shop_name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {receipt.product_name}
                </p>
              </div>
              {getStatusBadge()}
            </div>
            
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                Kjøpt: {formatDate(receipt.purchase_date)}
              </p>
              <p className="font-semibold text-foreground">
                {formatCurrency(receipt.amount)}
              </p>
              
              {receipt.type === 'gift_card' && receipt.remaining_value !== undefined && receipt.status !== 'used' && (
                <p className="text-accent font-medium">
                  Restverdi: {formatCurrency(receipt.remaining_value)}
                </p>
              )}
              
              {receipt.type === 'return_slip' && (
                <p className="text-xs text-muted-foreground">
                  Byttelapp
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceiptCard;
