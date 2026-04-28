import { Card } from '@/components/ui/card';
import { Receipt, Gift, RefreshCw, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface StatsCardsProps {
  totalAmount: number;
  receiptCount: number;
  giftCardCount: number;
  returnSlipCount: number;
}

const StatsCards = ({ totalAmount, receiptCount, giftCardCount, returnSlipCount }: StatsCardsProps) => {
  const stats = [
    {
      label: 'Totalt lagret',
      value: formatCurrency(totalAmount),
      icon: TrendingUp,
      color: 'text-logo-blue',
      bgColor: 'bg-logo-blue/10',
    },
    {
      label: 'Kvitteringer',
      value: receiptCount.toString(),
      icon: Receipt,
      color: 'text-category-receipt',
      bgColor: 'bg-category-receipt/10',
    },
    {
      label: 'Gavekort',
      value: giftCardCount.toString(),
      icon: Gift,
      color: 'text-category-giftcard',
      bgColor: 'bg-category-giftcard/10',
    },
    {
      label: 'Byttelapper',
      value: returnSlipCount.toString(),
      icon: RefreshCw,
      color: 'text-category-return',
      bgColor: 'bg-category-return/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={stat.label} 
            className="p-3 rounded-xl border border-border/50 bg-card"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-foreground truncate">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {stat.label}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsCards;
