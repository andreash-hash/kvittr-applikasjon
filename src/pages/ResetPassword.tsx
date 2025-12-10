import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Check, X } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Password validation states
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Ugyldig lenke',
          description: 'Tilbakestillingslenken er ugyldig eller utløpt.',
          variant: 'destructive',
        });
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      toast({
        title: 'Ugyldig passord',
        description: 'Passordet oppfyller ikke kravene.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Feil',
        description: 'Passordene stemmer ikke overens.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: 'Feil',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Passord oppdatert!',
        description: 'Du kan nå logge inn med ditt nye passord.',
      });
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  const ValidationCheck = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {valid ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={valid ? 'text-green-500' : 'text-muted-foreground'}>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 safe-area-all">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Logo size="medium" />
          </div>
          <CardDescription>Opprett nytt passord</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nytt passord</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {password.length > 0 && (
                <div className="space-y-1 mt-2">
                  <ValidationCheck valid={hasMinLength} text="Minst 8 tegn" />
                  <ValidationCheck valid={hasUppercase} text="Minst én stor bokstav (A-Z)" />
                  <ValidationCheck valid={hasLowercase} text="Minst én liten bokstav (a-z)" />
                  <ValidationCheck valid={hasNumber} text="Minst ett tall (0-9)" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bekreft passord</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword.length > 0 && (
                <ValidationCheck valid={passwordsMatch} text="Passordene stemmer overens" />
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !passwordsMatch}
            >
              {isLoading ? 'Oppdaterer...' : 'Oppdater passord'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Tilbake til innlogging
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
