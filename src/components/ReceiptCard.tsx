import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Receipt, calculateStatus } from '@/lib/storage';
import { formatDate, formatCurrency, getDaysUntil } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, Gift, Receipt as ReceiptIcon, Eye, Loader2, Check, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { differenceInDays, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { shouldShowWarranty } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToastNotification } from '@/components/CenteredToast';

interface ReceiptCardProps {
  receipt: Receipt;
}

const ReceiptCard = ({ receipt }: ReceiptCardProps) => {
  const navigate = useNavigate();
  const [isMarkingUsed, setIsMarkingUsed] = useState(false);
  const { showToast } = useToastNotification();
  
  const handleMarkAsUsed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMarkingUsed(true);
    try {
      const { error } = await supabase
        .from('receipts')
        .update({ is_used: true })
        .eq('id', receipt.id);
      
      if (error) throw error;
      
      showToast('Merket som brukt', 'success');
      window.location.reload();
    } catch (error) {
      console.error('Mark as used error:', error);
      showToast('Kunne ikke markere som brukt', 'error');
    }
    setIsMarkingUsed(false);
  };
  
  const getWarrantyBadge = () => {
    if (!shouldShowWarranty(receipt.has_warranty, receipt.shop_name, receipt.type)) return null;
    if (!receipt.warranty_until) return null;
    
    const warrantyDate = new Date(receipt.warranty_until);
    const today = new Date();
    const daysRemaining = differenceInDays(warrantyDate, today);
    
    if (daysRemaining < 0) return null;
    
    let badgeColor = 'bg-success';
    if (daysRemaining < 7) badgeColor = 'bg-destructive';
    else if (daysRemaining <= 30) badgeColor = 'bg-warning';
    
    return (
      <Badge className={`${badgeColor} text-white text-xs`}>
        <Shield className="h-3 w-3 mr-1" />
        Garanti til {format(warrantyDate, 'd. MMM yyyy', { locale: nb })}
      </Badge>
    );
  };
  
  const getReturnBadge = () => {
    if (!shouldShowWarranty(receipt.has_warranty, receipt.shop_name, receipt.type)) return null;
    
    const returnDeadline = receipt.return_until || receipt.return_by;
    if (!returnDeadline) return null;
    
    const returnDate = new Date(returnDeadline);
    const today = new Date();
    const daysRemaining = differenceInDays(returnDate, today);
    
    if (daysRemaining < 0) return null;
    
    let badgeColor = 'bg-success';
    if (daysRemaining < 7) badgeColor = 'bg-destructive';
    else if (daysRemaining <= 30) badgeColor = 'bg-warning';
    
    return (
      <Badge className={`${badgeColor} text-white text-xs`}>
        <RefreshCw className="h-3 w-3 mr-1" />
        Bytte til {format(returnDate, 'd. MMM yyyy', { locale: nb })}
      </Badge>
    );
  };
  
  const getValidUntilBadge = () => {
    if (receipt.type !== 'gift_card') return null;
    if (!receipt.expiry_date) return null;
    
    const expiryDate = new Date(receipt.expiry_date);
    const today = new Date();
    const daysRemaining = differenceInDays(expiryDate, today);
    
    if (daysRemaining < 0) return null;
    
    let badgeColor = 'bg-success';
    if (daysRemaining < 7) badgeColor = 'bg-destructive';
    else if (daysRemaining <= 30) badgeColor = 'bg-warning';
    
    return (
      <Badge className={`${badgeColor} text-white text-xs`}>
        <Gift className="h-3 w-3 mr-1" />
        Gyldig til {format(expiryDate, 'd. MMM yyyy', { locale: nb })}
      </Badge>
    );
  };
  
  const [isHovered, setIsHovered] = useState(false);
  const status = calculateStatus(receipt);
  
  const expiryDate = receipt.expiry_date || receipt.warranty_expires || receipt.return_by;
  const daysUntil = expiryDate ? getDaysUntil(expiryDate) : null;
  
  const getTypeConfig = () => {
    switch (receipt.type) {
      case 'return_slip':
        return {
          borderColor: 'border-l-warning',
          icon: RefreshCw,
          label: 'BYTTELAPP',
          labelColor: 'text-warning',
          bgColor: 'bg-warning/10',
        };
      case 'gift_card':
        return {
          borderColor: 'border-l-success',
          icon: Gift,
          label: 'GAVEKORT',
          labelColor: 'text-success',
          bgColor: 'bg-success/10',
        };
      default:
        return {
          borderColor: 'border-l-muted-foreground',
          icon: ReceiptIcon,
          label: 'KVITTERING',
          labelColor: 'text-muted-foreground',
          bgColor: 'bg-muted',
        };
    }
  };
  
  const typeConfig = getTypeConfig();
  const TypeIcon = typeConfig.icon;
  
  const getStatusBadgeConfig = () => {
    if (!daysUntil || daysUntil < 0) {
      if (receipt.status === 'expired') {
        if (receipt.type === 'return_slip') {
          return {
            text: `Byttefrist utløpt ${formatDate(receipt.return_by!)}`,
            bgColor: 'bg-muted',
            textColor: 'text-muted-foreground',
            icon: RefreshCw,
            showProgress: false
          };
        }
      }
      return null;
    }

    if (receipt.type === 'return_slip') {
      return null;
    }

    // Show expired status with RED color - CRITICAL FIX
    if (status === 'expired') {
      const returnDeadline = receipt.return_until || receipt.return_by;
      let reason = 'UTLØPT';
      if (receipt.warranty_until && new Date(receipt.warranty_until) < new Date()) {
        reason = 'GARANTI UTLØPT';
      } else if (returnDeadline && new Date(returnDeadline) < new Date()) {
        reason = 'BYTTEFRIST UTLØPT';
      }
      return {
        text: reason,
        bgColor: 'bg-destructive/10',
        textColor: 'text-destructive',
        icon: AlertTriangle,
        showProgress: false,
      };
    }

    if (status === 'used') {
      return {
        text: 'BRUKT',
        bgColor: 'bg-muted',
        textColor: 'text-muted-foreground',
        icon: Gift,
        showProgress: false,
      };
    }

    if (receipt.type === 'gift_card') {
      const validText = expiryDate ? ` - Gyldig til ${formatDate(expiryDate)}` : '';
      return {
        text: `Gavekort ${formatCurrency(receipt.remaining_value || receipt.amount)}${validText}`,
        bgColor: 'bg-success/10',
        textColor: 'text-success',
        icon: Gift,
        showProgress: false
      };
    }

    return null;
  };

  const statusBadgeConfig = getStatusBadgeConfig();
  
  const getExpiryWarning = () => {
    if (!daysUntil || daysUntil < 0) {
      if (status === 'expired') {
        const returnDeadline = receipt.return_until || receipt.return_by;
        // Show with RED styling - CRITICAL FIX
        if (receipt.warranty_until && new Date(receipt.warranty_until) < new Date()) {
          return (
            <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground">
              <AlertTriangle className="h-3 w-3 mr-1" />
              GARANTI UTLØPT
            </Badge>
          );
        }
        if (returnDeadline && new Date(returnDeadline) < new Date()) {
          return (
            <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground">
              <AlertTriangle className="h-3 w-3 mr-1" />
              BYTTEFRIST UTLØPT
            </Badge>
          );
        }
        return (
          <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground">
            <AlertTriangle className="h-3 w-3 mr-1" />
            UTLØPT
          </Badge>
        );
      }
      if (status === 'used') {
        return <Badge variant="secondary" className="absolute top-4 right-4 bg-muted">BRUKT</Badge>;
      }
      return null;
    }
    
    const shouldWarn = 
      (receipt.type === 'return_slip' && daysUntil <= 7) ||
      (receipt.type === 'gift_card' && daysUntil <= 30);
    
    if (shouldWarn) {
      return (
        <Badge className="absolute top-4 right-4 bg-warning text-warning-foreground">
          UTLØPER SNART!
        </Badge>
      );
    }
    return null;
  };

  const isUsed = (receipt as any).is_used === true;
  
  return (
    <Card 
      className={`relative overflow-hidden border-l-4 ${typeConfig.borderColor} shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer rounded-xl ${
        isHovered ? 'scale-[1.01]' : ''
      } ${isUsed ? 'opacity-60 bg-muted/50' : 'bg-card'}`}
      onClick={() => navigate(`/item/${receipt.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {getExpiryWarning()}
      
      {/* Processing indicator */}
      {receipt.processing_status === 'pending' && (
        <div className="absolute top-4 left-4 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Analyserer...
        </div>
      )}
      
      <CardContent className="p-3">
        {/* Header with icon and type label */}
        <div className={`flex items-center gap-1 mb-2 px-2 py-1 rounded-md ${typeConfig.bgColor} w-fit`}>
          <TypeIcon className={`h-3 w-3 ${typeConfig.labelColor}`} />
          <span className={`text-[10px] font-bold tracking-wide ${typeConfig.labelColor}`}>
            {typeConfig.label}
          </span>
        </div>
        
        <div className="flex gap-3">
          {/* Thumbnail - Increased to 100x100px */}
          <div className="w-[100px] h-[100px] min-w-[100px] min-h-[100px] rounded-lg bg-muted flex-shrink-0 overflow-hidden">
            {receipt.image_url ? (
              <img 
                src={receipt.image_url} 
                alt={receipt.product_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TypeIcon className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
          </div>
          
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Main info */}
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2">
                {receipt.product_name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {receipt.shop_name}
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                {receipt.type === 'return_slip' || receipt.type === 'gift_card' ? 'Utstedt: ' : 'Kjøpt: '}{formatDate(receipt.purchase_date)}
              </p>
              {isUsed && (
                <Badge variant="secondary" className="mt-1 bg-muted">
                  <Check className="h-3 w-3 mr-1" />
                  BRUKT
                </Badge>
              )}
            </div>
            
            {/* Prominent Status Badge */}
            {statusBadgeConfig && (
              <div 
                className={`${statusBadgeConfig.bgColor} ${statusBadgeConfig.textColor} rounded-md p-2`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/item/${receipt.id}`);
                }}
              >
                <div className="flex items-center gap-1.5">
                  <statusBadgeConfig.icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <p className="text-xs font-semibold">{statusBadgeConfig.text}</p>
                </div>
              </div>
            )}
            
            {/* Info chips */}
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5">
                {formatCurrency(receipt.amount)}
              </Badge>
              
              {!shouldShowWarranty(receipt.has_warranty, receipt.shop_name, receipt.type) && receipt.type === 'receipt' && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5">
                  Dagligvare - ingen garanti
                </Badge>
              )}
              
              {getWarrantyBadge()}
              {getReturnBadge()}
              {getValidUntilBadge()}
            </div>
          </div>
        </div>
        
        {/* Action buttons - Removed delete button since we have swipe */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          <Button
            variant="default"
            size="sm"
            className="flex-1 h-9 text-xs rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/item/${receipt.id}`);
            }}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Se detaljer
          </Button>
          
          {!isUsed && (receipt.type === 'gift_card' || receipt.type === 'return_slip') && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs rounded-lg"
              onClick={handleMarkAsUsed}
              disabled={isMarkingUsed}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Brukt
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceiptCard;
