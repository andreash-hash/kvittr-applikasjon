import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Receipt } from '@/lib/storage';
import { formatDate, formatCurrency, getDaysUntil, formatDaysRemaining } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, Gift, Receipt as ReceiptIcon, Eye, Trash2, Loader2 } from 'lucide-react';
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
  
  // Get status badge configuration
  const getStatusBadgeConfig = () => {
    if (!daysUntil || daysUntil < 0) {
      if (receipt.status === 'expired') {
        if (receipt.type === 'warranty') {
          return {
            text: `Garanti utløpt ${formatDate(receipt.warranty_expires!)}`,
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-600',
            icon: Shield,
            showProgress: false
          };
        }
        if (receipt.type === 'return_slip') {
          return {
            text: `Byttefrist utløpt ${formatDate(receipt.return_by!)}`,
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-600',
            icon: RefreshCw,
            showProgress: false
          };
        }
      }
      return null;
    }

    if (receipt.type === 'warranty' && receipt.warranty_expires) {
      const monthsLeft = Math.ceil(daysUntil / 30);
      if (daysUntil > 90) {
        return {
          text: `Garanti til ${formatDate(receipt.warranty_expires)} (${monthsLeft} måned${monthsLeft !== 1 ? 'er' : ''} igjen)`,
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          icon: Shield,
          showProgress: true,
          progressColor: 'green'
        };
      }
      if (daysUntil > 30) {
        return {
          text: `Garanti utløper ${formatDate(receipt.warranty_expires)} (${daysUntil} dager igjen)`,
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700',
          icon: Shield,
          showProgress: true,
          progressColor: 'orange'
        };
      }
      return {
        text: `Garanti utløper snart! (${daysUntil} dager igjen)`,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        icon: Shield,
        showProgress: true,
        progressColor: 'red'
      };
    }

    if (receipt.type === 'return_slip' && receipt.return_by) {
      if (daysUntil > 7) {
        return {
          text: `Bytte til ${formatDate(receipt.return_by)} (${daysUntil} dager igjen)`,
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          icon: RefreshCw,
          showProgress: true,
          progressColor: 'green'
        };
      }
      if (daysUntil > 3) {
        return {
          text: `Bytte til ${formatDate(receipt.return_by)} (${daysUntil} dager igjen)`,
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700',
          icon: RefreshCw,
          showProgress: true,
          progressColor: 'orange'
        };
      }
      return {
        text: `Siste sjanse! (${daysUntil} dager igjen)`,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        icon: RefreshCw,
        showProgress: true,
        progressColor: 'red'
      };
    }

    if (receipt.type === 'gift_card') {
      const validText = expiryDate ? ` - Gyldig til ${formatDate(expiryDate)}` : '';
      return {
        text: `Gavekort ${formatCurrency(receipt.remaining_value || receipt.amount)}${validText}`,
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        icon: Gift,
        showProgress: false
      };
    }

    return null;
  };

  const statusBadgeConfig = getStatusBadgeConfig();
  
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
      
      {/* Processing indicator */}
      {receipt.processing_status === 'pending' && (
        <div className="absolute top-4 left-4 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Analyserer...
        </div>
      )}
      
      <CardContent className="p-3">
        {/* Header with icon and type label */}
        <div className={`flex items-center gap-1.5 mb-2 px-1.5 py-0.5 rounded ${typeConfig.bgColor} w-fit`}>
          <TypeIcon className={`h-3 w-3 ${typeConfig.labelColor}`} />
          <span className={`text-[10px] font-bold tracking-wide ${typeConfig.labelColor}`}>
            {typeConfig.label}
          </span>
        </div>
        
        <div className="flex gap-3">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Main info */}
            <div>
              <h3 className="text-sm font-bold text-foreground leading-tight mb-0.5">
                {receipt.product_name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {receipt.shop_name}
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                Kjøpt: {formatDate(receipt.purchase_date)}
              </p>
            </div>
            
            {/* Prominent Status Badge */}
            {statusBadgeConfig && (
              <div 
                className={`${statusBadgeConfig.bgColor} ${statusBadgeConfig.textColor} rounded-md p-2 cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/item/${receipt.id}`);
                }}
              >
                <div className="flex items-start gap-1.5">
                  <statusBadgeConfig.icon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-tight">
                      {statusBadgeConfig.text}
                    </p>
                    {statusBadgeConfig.showProgress && (
                      <div className="mt-1.5 space-y-0.5">
                        <Progress 
                          value={receipt.type === 'warranty' ? getWarrantyProgress() : 
                                 receipt.type === 'return_slip' && receipt.return_by ? 
                                 Math.max(0, Math.min(100, (daysUntil! / 14) * 100)) : 0} 
                          className="h-1.5"
                        />
                        <p className="text-[10px] opacity-75">
                          {receipt.type === 'warranty' ? 
                            `${Math.round(100 - getWarrantyProgress())}% garanti gjenstår` :
                            `${Math.round((daysUntil! / 14) * 100)}% av byttefristen gjenstår`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {receipt.status === 'used' && (
              <div className="bg-gray-100 text-gray-600 rounded-md p-2">
                <p className="text-xs font-semibold">Brukt</p>
              </div>
            )}
            
            {/* Info chips */}
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5">
                {formatCurrency(receipt.amount)}
              </Badge>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-1.5 pt-1">
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-9 text-xs"
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
                  className="bg-green-600 hover:bg-green-700 h-9 text-xs"
                  onClick={(e) => handleAction(e, 'use-gift-card')}
                >
                  Bruk gavekort
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={(e) => handleAction(e, 'delete')}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Thumbnail */}
          <div className="w-[60px] h-[60px] rounded-md bg-muted flex-shrink-0 overflow-hidden">
            {receipt.image_url ? (
              <img 
                src={receipt.image_url} 
                alt={receipt.product_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TypeIcon className="h-6 w-6 text-muted-foreground opacity-30" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceiptCard;
