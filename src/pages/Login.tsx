import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getUser, saveUser } from '@/lib/storage';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Feil',
        description: 'Vennligst fyll ut alle feltene',
        variant: 'destructive',
      });
      return;
    }

    // Simple demo login - in production this would check against backend
    const storedUsers = localStorage.getItem('kvittr_users');
    const users = storedUsers ? JSON.parse(storedUsers) : [];
    const user = users.find((u: any) => u.email === email && u.password === password);

    if (user) {
      saveUser({ id: user.id, email: user.email, created_at: user.created_at });
      toast({
        title: 'Velkommen!',
        description: 'Du er nå logget inn',
      });
      navigate('/dashboard');
    } else {
      toast({
        title: 'Feil',
        description: 'Feil e-post eller passord',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-primary">Kvittr</CardTitle>
          <CardDescription>Logg inn på din konto</CardDescription>
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
            <Button type="submit" className="w-full">
              Logg inn
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/signup')}
            >
              Har du ikke konto? Registrer deg
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
