
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useSecurityValidation } from '@/hooks/useSecurityValidation';
import { getResetPasswordConfig } from '@/utils/authUtils';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { checkAuthRateLimit } = useSecurityValidation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verificar rate limit antes de tentar redefinir senha
      const rateLimitCheck = await checkAuthRateLimit('reset_password', email);
      if (!rateLimitCheck.allowed) {
        setLoading(false);
        return;
      }

      const resetConfig = getResetPasswordConfig();
      const { error } = await supabase.auth.resetPasswordForEmail(email, resetConfig);

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Email enviado",
        description: "Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.",
      });
    } catch (error: any) {
      // Mesmo em caso de erro, mostramos a mensagem padrão por segurança
      setSubmitted(true);
      toast({
        title: "Email enviado",
        description: "Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email enviado</CardTitle>
          <CardDescription>
            Se o email estiver cadastrado em nosso sistema, você receberá as instruções para redefinir sua senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={onBackToLogin} 
            variant="outline" 
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Esqueceu sua senha?</CardTitle>
        <CardDescription>
          Digite seu email para receber as instruções de redefinição
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar instruções"}
          </Button>
          <Button 
            type="button" 
            onClick={onBackToLogin} 
            variant="outline" 
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
