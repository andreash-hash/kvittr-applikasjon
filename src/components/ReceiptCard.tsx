import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Receipt } from '@/lib/storage';
import { formatDate, formatCurrency, getDaysUntil, formatDaysRemaining } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, Gift, Receipt as ReceiptIcon, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ReceiptCardProps {
  receipt: Receipt;
}

const ReceiptCard = ({ receipt }: ReceiptCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  
  const expiryDate = receipt.expiry_date || receipt.warranty_expires || receipt.return_by;
  const daysUntil = expiryDate ? getDaysUntil(expiryDate) : null;
  
  // Get type-specific styling and config
  const getTypeConfig = () => {
    switch (receipt.type) {
      case 'warranty':
        return {
          borderColor: 'border-l-blue-500',
          icon: Shield,
          label: 'GARANTI',
          labelColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
        };
      case 'return_slip':
        return {
          borderColor: 'border-l-orange-500',
          icon: RefreshCw,
          label: 'BYTTELAPP',
          labelColor: 'text-orange-600',
          bgColor: 'bg-orange-50',
        };
      case 'gift_card':
        return {
          borderColor: 'border-l-green-500',
          icon: Gift,
          label: 'GAVEKORT',
          labelColor: 'text-green-600',
          bgColor: 'bg-green-50',
        };
      default:
        return {
          borderColor: 'border-l-gray-400',
          icon: ReceiptIcon,
          label: 'KVITTERING',
          labelColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
        };
    }
  };
  
  const typeConfig = getTypeConfig();
  const TypeIcon = typeConfig.icon;
  
  // Calculate progress for warranties (based on purchase to expiry)
  const getWarrantyProgress = () => {
    if (receipt.type !== 'warranty' || !receipt.warranty_expires) return 0;
    const purchaseDate = new Date(receipt.purchase_date);
    const expiryDate = new Date(receipt.warranty_expires);
    const today = new Date();
    const totalDays = Math.ceil((expiryDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
  };
  
  // Get status color for time remaining
  const getTimeRemainingColor = () => {
    if (!daysUntil) return 'text-muted-foreground';
    if (receipt.type === 'warranty') {
      if (daysUntil > 60) return 'text-green-600';
      if (daysUntil > 30) return 'text-orange-500';
      return 'text-red-600';
    }
    if (receipt.type === 'return_slip' || receipt.type === 'gift_card') {
      if (daysUntil > 7) return 'text-green-600';
      return 'text-orange-500';
    }
    return 'text-muted-foreground';
  };
  
  // Get expiry warning badge
  const getExpiryWarning = () => {
    if (!daysUntil || daysUntil < 0) {
      if (receipt.status === 'expired') {
        return <Badge variant="destructive" className="absolute top-4 right-4">UTLØPT</Badge>;
      }
      return null;
    }
    
    const shouldWarn = 
      (receipt.type === 'warranty' && daysUntil <= 30) ||
      (receipt.type === 'return_slip' && daysUntil <= 7) ||
      (receipt.type === 'gift_card' && daysUntil <= 30);
    
    if (shouldWarn) {
      return <Badge variant="warning" className="absolute top-4 right-4">UTLØPER SNART!</Badge>;
    }
    return null;
  };
  
  const handleAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    // Action handlers would go here
    console.log(`Action: ${action} for receipt ${receipt.id}`);
  };

  return (
    <Card 
      className={`relative overflow-hidden border-l-4 ${typeConfig.borderColor} hover:shadow-xl transition-all duration-200 cursor-pointer rounded-xl ${
        isHovered ? 'scale-[1.01]' : ''
      }`}
      onClick={() => navigate(`/item/${receipt.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {getExpiryWarning()}
      
      <CardContent className="p-4">
        {/* Header with icon and type label */}
        <div className={`flex items-center gap-2 mb-3 px-2 py-1 rounded-md ${typeConfig.bgColor} w-fit`}>
          <TypeIcon className={`h-4 w-4 ${typeConfig.labelColor}`} />
          <span className={`text-xs font-bold tracking-wide ${typeConfig.labelColor}`}>
            {typeConfig.label}
          </span>
        </div>
        
        <div className="flex gap-4">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Main info */}
            <div>
              <h3 className="text-lg font-bold text-foreground leading-tight mb-1">
                {receipt.product_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {receipt.shop_name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Kjøpt: {formatDate(receipt.purchase_date)}
              </p>
            </div>
            
            {/* Status section */}
            <div className="space-y-2">
              {receipt.type === 'warranty' && receipt.warranty_expires && daysUntil !== null && daysUntil >= 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Garanti gyldig til {formatDate(receipt.warranty_expires)}</span>
                  </div>
                  <Progress value={getWarrantyProgress()} className="h-2" />
                  <p className={`text-sm font-medium ${getTimeRemainingColor()}`}>
                    {Math.ceil(daysUntil / 30)} måned{Math.ceil(daysUntil / 30) !== 1 ? 'er' : ''} igjen
                  </p>
                </div>
              )}
              
              {receipt.type === 'return_slip' && receipt.return_by && daysUntil !== null && daysUntil >= 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Byttefrist til {formatDate(receipt.return_by)}</p>
                  <p className={`text-sm font-bold ${getTimeRemainingColor()}`}>
                    {daysUntil} dag{daysUntil !== 1 ? 'er' : ''} igjen
                  </p>
                </div>
              )}
              
              {receipt.type === 'gift_card' && receipt.remaining_value !== undefined && (
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(receipt.remaining_value)}
                  </p>
                  {expiryDate && (
                    <p className="text-xs text-muted-foreground">
                      Gyldig til {formatDate(expiryDate)}
                    </p>
                  )}
                  {receipt.remaining_value < receipt.amount && (
                    <p className="text-xs text-muted-foreground">
                      Opprinnelig: {formatCurrency(receipt.amount)}
                    </p>
                  )}
                </div>
              )}
              
              {receipt.status === 'expired' && (
                <p className="text-sm text-destructive font-medium">Utløpt</p>
              )}
              
              {receipt.status === 'used' && (
                <p className="text-sm text-muted-foreground font-medium">Brukt</p>
              )}
            </div>
            
            {/* Info chips */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {formatCurrency(receipt.amount)}
              </Badge>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/item/${receipt.id}`);
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                Se detaljer
              </Button>
              
              {receipt.type === 'gift_card' && receipt.status !== 'used' && (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={(e) => handleAction(e, 'use-gift-card')}
                >
                  Bruk gavekort
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleAction(e, 'delete')}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Thumbnail */}
          <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
            {receipt.image_url ? (
              <img 
                src={receipt.image_url} 
                alt={receipt.product_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TypeIcon className="h-8 w-8 text-muted-foreground opacity-30" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceiptCard;
