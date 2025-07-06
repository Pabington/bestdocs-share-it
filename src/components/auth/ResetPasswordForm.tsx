
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

export const ResetPasswordForm = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [session, setSession] = useState<any>(null);

  // Validações de senha forte
  const passwordValidations = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordValidations).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  useEffect(() => {
    // Verificar se há uma sessão ativa (usuário veio do link de reset)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      toast({
        title: "Senha não atende aos critérios",
        description: "Por favor, certifique-se de que sua senha atende a todos os requisitos.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast({
        title: "Senha redefinida com sucesso",
        description: "Sua senha foi alterada. Você será redirecionado para o login.",
      });

      // Fazer logout e redirecionar para login
      await supabase.auth.signOut();
      setTimeout(() => {
        window.location.href = '/auth';
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Link inválido ou expirado</CardTitle>
          <CardDescription>
            O link de redefinição de senha é inválido ou já expirou.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => window.location.href = '/auth'} 
            className="w-full"
          >
            Voltar ao login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Redefinir senha</CardTitle>
        <CardDescription>
          Digite sua nova senha
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Indicadores de validação da senha */}
            <div className="space-y-1 text-sm">
              <div className={`flex items-center space-x-2 ${passwordValidations.minLength ? 'text-green-600' : 'text-red-600'}`}>
                {passwordValidations.minLength ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                <span>Mínimo 8 caracteres</span>
              </div>
              <div className={`flex items-center space-x-2 ${passwordValidations.hasUppercase ? 'text-green-600' : 'text-red-600'}`}>
                {passwordValidations.hasUppercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                <span>Uma letra maiúscula</span>
              </div>
              <div className={`flex items-center space-x-2 ${passwordValidations.hasLowercase ? 'text-green-600' : 'text-red-600'}`}>
                {passwordValidations.hasLowercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                <span>Uma letra minúscula</span>
              </div>
              <div className={`flex items-center space-x-2 ${passwordValidations.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                {passwordValidations.hasNumber ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                <span>Um número</span>
              </div>
              <div className={`flex items-center space-x-2 ${passwordValidations.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                {passwordValidations.hasSpecialChar ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                <span>Um caractere especial</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {confirmPassword && (
              <div className={`flex items-center space-x-2 text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                {passwordsMatch ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                <span>{passwordsMatch ? 'Senhas coincidem' : 'Senhas não coincidem'}</span>
              </div>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !isPasswordValid || !passwordsMatch}
          >
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
