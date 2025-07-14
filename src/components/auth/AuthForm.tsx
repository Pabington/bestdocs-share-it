
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { useSecurityValidation } from '@/hooks/useSecurityValidation';

export const AuthForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { checkAuthRateLimit } = useSecurityValidation();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verificar código de acesso
      if (accessCode !== 'B&$tl0ter!@s') {
        toast({
          title: "Código de acesso inválido",
          description: "Por favor, verifique o código de acesso fornecido.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Verificar rate limit antes de tentar o signup
      const rateLimitCheck = await checkAuthRateLimit('signup', email);
      if (!rateLimitCheck.allowed) {
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Registro realizado!",
        description: "Verifique seu email para confirmar sua conta.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no registro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verificar rate limit antes de tentar o login
      const rateLimitCheck = await checkAuthRateLimit('login', email);
      if (!rateLimitCheck.allowed) {
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6">
        <ForgotPasswordForm onBackToLogin={() => setShowForgotPassword(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-sm sm:max-w-md mx-auto">
        <CardHeader className="text-center space-y-2 sm:space-y-4 pb-4 sm:pb-6">
          <CardTitle className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Work Sans', letterSpacing: '-0.093em' }}>
            <span style={{ color: '#fc8110' }}>Best</span>
            <span style={{ color: '#545454' }}>docs</span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">Sistema de gerenciamento de documentos</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 sm:h-11">
              <TabsTrigger value="signin" className="text-sm sm:text-base">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="text-sm sm:text-base">Registrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="mt-4 sm:mt-6">
              <form onSubmit={handleSignIn} className="space-y-4 sm:space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 sm:h-11 text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm sm:text-base">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 sm:h-11 text-base"
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-11 sm:h-12 text-base font-medium" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm sm:text-base h-auto p-0"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Esqueceu sua senha?
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-4 sm:mt-6">
              <form onSubmit={handleSignUp} className="space-y-4 sm:space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm sm:text-base">Nome completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-10 sm:h-11 text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 sm:h-11 text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm sm:text-base">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 sm:h-11 text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessCode" className="text-sm sm:text-base">Código de acesso</Label>
                  <Input
                    id="accessCode"
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Digite o código de acesso"
                    className="h-10 sm:h-11 text-base"
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-11 sm:h-12 text-base font-medium" disabled={loading}>
                  {loading ? "Registrando..." : "Registrar"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
