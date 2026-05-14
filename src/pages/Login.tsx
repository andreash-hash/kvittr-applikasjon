import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showResendOption, setShowResendOption] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Feil',
        description: 'Vennligst fyll ut alle feltene',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setShowResendOption(false);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      // Check if error is about email not being confirmed
      if (error.message.toLowerCase().includes('email not confirmed') || 
          error.message.toLowerCase().includes('not confirmed')) {
        toast({
          title: 'E-post ikke bekreftet',
          description: 'Sjekk innboksen din for bekreftelseslink.',
          variant: 'destructive',
        });
        setShowResendOption(true);
      } else {
        toast({
          title: 'Feil',
          description: error.message === 'Invalid login credentials' 
            ? 'Feil e-post eller passord' 
            : error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Velkommen!',
        description: 'Du er nå logget inn',
      });
      navigate('/dashboard');
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast({
        title: 'Feil',
        description: 'Vennligst fyll ut e-postfeltet',
        variant: 'destructive',
      });
      return;
    }

    setIsResending(true);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    setIsResending(false);

    if (error) {
      toast({
        title: 'Feil',
        description: 'Kunne ikke sende bekreftelseslink. Prøv igjen senere.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sendt!',
        description: 'En ny bekreftelseslink er sendt til din e-post.',
      });
    }
  };

  const handleForgotPassword = () => {
    setResetEmail(email);
    setShowResetDialog(true);
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      toast({
        title: 'Feil',
        description: 'Vennligst fyll ut e-postfeltet',
        variant: 'destructive',
      });
      return;
    }

    setIsResettingPassword(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'https://kvitter-meg.lovable.app/reset-password',
    });

    setIsResettingPassword(false);

    if (error) {
      toast({
        title: 'Feil',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sendt!',
        description: 'Sjekk e-posten din for tilbakestillingslenke.\n\n⚠️ Husk å sjekke søppelpostmappen også.',
      });
      setShowResetDialog(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 safe-area-all">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Logo size="medium" />
          </div>
          <h1 className="sr-only">Logg inn på Kvittr</h1>
          <CardDescription>Har du allerede konto?</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                placeholder="din@epost.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passord</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logger inn...' : 'Logg inn'}
            </Button>
            
            <button
              type="button"
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleForgotPassword}
            >
              Glemt passord?
            </button>
            
            {showResendOption && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendConfirmation}
                disabled={isResending}
              >
                <Mail className="h-4 w-4 mr-2" />
                {isResending ? 'Sender...' : 'Send bekreftelseslink på nytt'}
              </Button>
            )}
          </form>
          
          <div className="border-t mt-6 pt-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Ny bruker?</p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/signup')}
            >
              Opprett gratis konto
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tilbakestill passord</DialogTitle>
            <DialogDescription>
              Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">E-post</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="din@epost.no"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleResetPassword}
              disabled={isResettingPassword}
            >
              {isResettingPassword ? 'Sender...' : 'Send tilbakestillingslenke'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
