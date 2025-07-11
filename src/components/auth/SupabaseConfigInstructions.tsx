import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLink, Settings } from 'lucide-react';

export const SupabaseConfigInstructions = () => {
  const currentDomain = window.location.origin;

  const openSupabaseAuth = () => {
    window.open('https://supabase.com/dashboard/project/ydplyfdftiriqppwlcxq/auth/url-configuration', '_blank');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuração de URLs no Supabase
        </CardTitle>
        <CardDescription>
          Para corrigir os problemas de redirecionamento do reset de senha, configure as URLs no painel do Supabase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Domínio atual detectado:</strong> {currentDomain}
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-semibold">Passos para configuração:</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-primary">1.</span>
              <span>Acesse o painel de configuração de URLs do Supabase</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="font-semibold text-primary">2.</span>
              <div>
                <p>Configure a <strong>Site URL</strong> para:</p>
                <code className="bg-muted px-2 py-1 rounded text-sm">{currentDomain}</code>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="font-semibold text-primary">3.</span>
              <div>
                <p>Adicione nas <strong>Redirect URLs</strong>:</p>
                <code className="bg-muted px-2 py-1 rounded text-sm">{currentDomain}/reset-password</code>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="font-semibold text-primary">4.</span>
              <span>Salve as configurações</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="font-semibold text-primary">5.</span>
              <span>Teste novamente o reset de senha</span>
            </div>
          </div>
        </div>

        <Button onClick={openSupabaseAuth} className="w-full">
          <ExternalLink className="mr-2 h-4 w-4" />
          Abrir configurações no Supabase
        </Button>

        <Alert>
          <AlertDescription className="text-sm">
            <strong>Nota:</strong> Após a configuração, solicite um novo email de reset de senha, 
            pois os links anteriores podem ter expirado.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};