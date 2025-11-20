import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Receipt, calculateStatus, saveReceipt } from '@/lib/storage';
import { formatDate, formatCurrency, getDaysUntil, formatDaysRemaining } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, Gift, Receipt as ReceiptIcon, Eye, Trash2, Loader2, Check } from 'lucide-react';
import { useState } from 'react';
import { differenceInDays, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReceiptCardProps {
  receipt: Receipt;
}

const ReceiptCard = ({ receipt }: ReceiptCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isMarkingUsed, setIsMarkingUsed] = useState(false);
  
  const handleMarkAsUsed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMarkingUsed(true);
    try {
      // Update is_used in database
      const { error } = await supabase
        .from('receipts')
        .update({ is_used: true })
        .eq('id', receipt.id);
      
      if (error) throw error;
      
      toast({
        title: 'Markert som brukt',
        description: 'Kvitteringen er flyttet til arkiv',
      });
      
      window.location.reload();
    } catch (error) {
      console.error('Mark as used error:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke markere som brukt',
        variant: 'destructive',
      });
    }
    setIsMarkingUsed(false);
  };
  
  const getWarrantyBadge = () => {
    if (!receipt.warranty_until) return null;
    
    const warrantyDate = new Date(receipt.warranty_until);
    const today = new Date();
    const daysRemaining = differenceInDays(warrantyDate, today);
    
    if (daysRemaining < 0) return null; // Expired
    
    let badgeColor = 'bg-green-600';
    if (daysRemaining < 30) badgeColor = 'bg-red-600';
    else if (daysRemaining < 90) badgeColor = 'bg-orange-500';
    
    return (
      <Badge className={`${badgeColor} text-white text-xs`}>
        <Shield className="h-3 w-3 mr-1" />
        Garanti til {format(warrantyDate, 'd. MMM yyyy', { locale: nb })}
      </Badge>
    );
  };
  
  const getReturnBadge = () => {
    // Use return_until as primary, fall back to return_by for legacy
    const returnDeadline = receipt.return_until || receipt.return_by;
    if (!returnDeadline) return null;
    
    const returnDate = new Date(returnDeadline);
    const today = new Date();
    const daysRemaining = differenceInDays(returnDate, today);
    
    if (daysRemaining < 0) return null; // Expired
    
    let badgeColor = 'bg-green-600';
    if (daysRemaining < 3) badgeColor = 'bg-red-600';
    else if (daysRemaining < 7) badgeColor = 'bg-orange-500';
    
    return (
      <Badge className={`${badgeColor} text-white text-xs`}>
        <RefreshCw className="h-3 w-3 mr-1" />
        🔄 Bytte til {format(returnDate, 'd. MMM yyyy', { locale: nb })}
      </Badge>
    );
  };
  const [isHovered, setIsHovered] = useState(false);
  const status = calculateStatus(receipt);
  
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

      // Use return_until as primary field
      const returnDeadline = receipt.return_until || receipt.return_by;
      if (receipt.type === 'return_slip' && returnDeadline) {
        const returnDate = new Date(returnDeadline);
        const daysRemaining = differenceInDays(returnDate, new Date());
        
        if (daysRemaining > 7) {
          return {
            text: `🔄 Bytte til ${formatDate(returnDeadline)}`,
            bgColor: 'bg-green-50',
            textColor: 'text-green-700',
            icon: RefreshCw,
            showProgress: true,
            progressColor: 'green'
          };
        }
        if (daysRemaining >= 3) {
          return {
            text: `🔄 Bytte til ${formatDate(returnDeadline)}`,
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-700',
            icon: RefreshCw,
            showProgress: true,
            progressColor: 'orange'
          };
        }
        return {
          text: `🔄 Bytte til ${formatDate(returnDeadline)}`,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        icon: RefreshCw,
        showProgress: true,
        progressColor: 'red'
      };
    }

    // Show archived status
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
        bgColor: 'bg-muted',
        textColor: 'text-muted-foreground',
        icon: Shield,
        showProgress: false,
        progressColor: 'gray'
      };
    }

    if (status === 'used') {
      return {
        text: 'BRUKT',
        bgColor: 'bg-muted',
        textColor: 'text-muted-foreground',
        icon: Gift,
        showProgress: false,
        progressColor: 'gray'
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
  
  const getExpiryWarning = () => {
    if (!daysUntil || daysUntil < 0) {
      if (status === 'expired') {
        const returnDeadline = receipt.return_until || receipt.return_by;
        // Show specific reason for archiving
        if (receipt.warranty_until && new Date(receipt.warranty_until) < new Date()) {
          return <Badge variant="secondary" className="absolute top-4 right-4 bg-muted">GARANTI UTLØPT</Badge>;
        }
        if (returnDeadline && new Date(returnDeadline) < new Date()) {
          return <Badge variant="secondary" className="absolute top-4 right-4 bg-muted">BYTTEFRIST UTLØPT</Badge>;
        }
        return <Badge variant="secondary" className="absolute top-4 right-4 bg-muted">UTLØPT</Badge>;
      }
      if (status === 'used') {
        return <Badge variant="secondary" className="absolute top-4 right-4 bg-muted">BRUKT</Badge>;
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
    if (action === 'delete') {
      setShowDeleteDialog(true);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receipt.id);
      
      if (error) throw error;
      
      toast({
        title: 'Kvittering slettet',
        description: 'Kvitteringen er fjernet',
      });
      
      window.location.reload();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette kvittering',
        variant: 'destructive',
      });
    }
    setShowDeleteDialog(false);
  };

  // Check if receipt is marked as used
  const isUsed = (receipt as any).is_used === true;
  
  return (
    <>
      <Card 
        className={`relative overflow-hidden border-l-4 ${typeConfig.borderColor} hover:shadow-xl transition-all duration-200 cursor-pointer rounded-xl ${
          isHovered ? 'scale-[1.01]' : ''
        } ${isUsed ? 'opacity-60 bg-muted/50' : ''}`}
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
      
      <CardContent className="p-2">
        {/* Header with icon and type label */}
        <div className={`flex items-center gap-1 mb-1.5 px-1.5 py-0.5 rounded ${typeConfig.bgColor} w-fit`}>
          <TypeIcon className={`h-2.5 w-2.5 ${typeConfig.labelColor}`} />
          <span className={`text-[9px] font-bold tracking-wide ${typeConfig.labelColor}`}>
            {typeConfig.label}
          </span>
        </div>
        
        <div className="flex gap-2">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Main info */}
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-foreground leading-[1.2]">
                {receipt.product_name}
              </h3>
              <p className="text-xs text-muted-foreground leading-[1.2]">
                {receipt.shop_name}
              </p>
              <p className="text-[11px] text-muted-foreground/70 leading-[1.2]">
                {receipt.type === 'return_slip' ? 'Utstedt: ' : 'Kjøpt: '}{formatDate(receipt.purchase_date)}
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
                className={`${statusBadgeConfig.bgColor} ${statusBadgeConfig.textColor} rounded-md p-1.5 cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/item/${receipt.id}`);
                }}
              >
                <div className="flex items-start gap-1">
                  <statusBadgeConfig.icon className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-[1.2]">
                      {statusBadgeConfig.text}
                    </p>
                    {statusBadgeConfig.showProgress && (
                      <div className="mt-1 space-y-0.5">
                        <Progress 
                          value={receipt.type === 'warranty' ? getWarrantyProgress() : 
                                 receipt.type === 'return_slip' && receipt.return_by ? 
                                 Math.max(0, Math.min(100, (daysUntil! / 14) * 100)) : 0} 
                          className="h-1"
                        />
                        <p className="text-[9px] opacity-75 leading-[1.2]">
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
              <div className="bg-gray-100 text-gray-600 rounded-md p-1.5">
                <p className="text-xs font-semibold leading-[1.2]">Brukt</p>
              </div>
            )}
            
            {/* Info chips */}
            <div className="flex gap-1 flex-wrap">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 leading-[1.2]">
                {formatCurrency(receipt.amount)}
              </Badge>
              
              {/* Warranty/Return badges */}
              {getWarrantyBadge()}
              {getReturnBadge()}
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-1.5 pt-0.5">
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/item/${receipt.id}`);
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                Se detaljer
              </Button>
              
              {!isUsed && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={handleMarkAsUsed}
                  disabled={isMarkingUsed}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Brukt
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => handleAction(e, 'delete')}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Thumbnail - Fixed 50x50px */}
          <div className="w-[50px] h-[50px] min-w-[50px] min-h-[50px] max-w-[50px] max-h-[50px] rounded-lg bg-muted flex-shrink-0 overflow-hidden">
            {receipt.image_url ? (
              <img 
                src={receipt.image_url} 
                alt={receipt.product_name}
                className="w-full h-full object-cover"
                style={{ width: '50px', height: '50px', objectFit: 'cover' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TypeIcon className="h-5 w-5 text-muted-foreground opacity-30" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slett kvittering</AlertDialogTitle>
          <AlertDialogDescription>
            Er du sikker på at du vil slette denne kvitteringen?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Slett
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default ReceiptCard;
