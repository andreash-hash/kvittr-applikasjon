import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, Mail, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      toast({
        title: 'Feil',
        description: 'Vennligst fyll ut alle feltene',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Feil',
        description: 'Passordene stemmer ikke overens',
        variant: 'destructive',
      });
      return;
    }

    if (!isPasswordValid) {
      toast({
        title: 'Feil',
        description: 'Passordet oppfyller ikke alle kravene',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    console.log('Attempting signup for:', email);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      setIsLoading(false);

      if (error) {
        console.error('Signup error:', error);
        let errorMessage = error.message;
        
        // Translate common errors to Norwegian
        if (error.message.includes('User already registered')) {
          errorMessage = 'Denne e-posten er allerede registrert. Prøv å logge inn i stedet.';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Ugyldig e-postadresse';
        } else if (error.message.includes('Password')) {
          errorMessage = 'Passordet er for svakt';
        }
        
        toast({
          title: 'Feil ved registrering',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }
      
      console.log('Signup successful, user:', data.user?.id);
      
      // Check if email confirmation is required
      if (data.user && !data.user.email_confirmed_at) {
        // Show success dialog instead of toast for better visibility on iPad
        setShowSuccessDialog(true);
      } else {
        toast({
          title: 'Velkommen!',
          description: 'Kontoen din er opprettet og aktivert',
        });
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Unexpected signup error:', err);
      setIsLoading(false);
      toast({
        title: 'Feil',
        description: 'Noe gikk galt. Vennligst prøv igjen.',
        variant: 'destructive',
      });
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    navigate('/login');
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-8 overflow-auto relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute p-2 flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          style={{ 
            top: 'max(16px, env(safe-area-inset-top, 16px))', 
            left: 'max(16px, env(safe-area-inset-left, 16px))' 
          }}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Tilbake</span>
        </button>
        <Card className="w-full max-w-md mx-auto my-auto">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <Logo size="medium" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Benefits Section */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-center">Opprett gratis konto og få:</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>2 kvitteringer per måned gratis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Skylagring og synkronisering</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Garanti-tracking (2-5 år norsk lov)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Byttelapper og gavekort</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center pt-2">
                Trenger du mer? Oppgrader til Premium for ubegrenset kvitteringer og push-varsler.
              </p>
            </div>

            <div className="border-t pt-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
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
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {password && (
                    <div className="space-y-1 text-xs">
                      <div className={`flex items-center gap-1 ${passwordRequirements.minLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordRequirements.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>Minst 8 tegn</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordRequirements.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>Minst én stor bokstav</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordRequirements.hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>Minst én liten bokstav</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordRequirements.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>Minst ett tall</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Bekreft passord</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Oppretter konto...' : 'Opprett gratis konto'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Ved å opprette konto godtar du våre{' '}
                  <a href="/terms" className="underline hover:text-foreground">Vilkår</a>
                  {' '}og{' '}
                  <a href="/privacy" className="underline hover:text-foreground">Personvern</a>
                </p>
              </form>
            </div>

            <div className="border-t pt-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">Har du allerede konto?</p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Logg inn
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog - More visible on iPad */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm mx-4 sm:mx-auto">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl">Konto opprettet!</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 text-left">
                <p>
                  Vi har sendt en bekreftelseslink til <strong>{email}</strong>.
                </p>
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Sjekk innboksen din <strong>og søppelpost/spam-mappen</strong> og klikk på linken for å aktivere kontoen.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleSuccessDialogClose} className="w-full mt-4">
            Gå til innlogging
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Signup;
