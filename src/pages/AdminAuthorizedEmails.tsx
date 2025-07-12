import React, { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Mail } from 'lucide-react';
import { useAuthorizedEmails } from '@/hooks/useAuthorizedEmails';
import { useAdmin } from '@/hooks/useAdmin';
import { Navigate } from 'react-router-dom';

const AdminAuthorizedEmails = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { emails, loading, addEmail, removeEmail } = useAuthorizedEmails();
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  console.log('AdminAuthorizedEmails: isAdmin =', isAdmin, 'adminLoading =', adminLoading);

  if (adminLoading) {
    console.log('AdminAuthorizedEmails: showing loading screen');
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">Carregando...</div>
    </div>;
  }

  if (!isAdmin) {
    console.log('AdminAuthorizedEmails: user is not admin, redirecting to /');
    return <Navigate to="/" replace />;
  }

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setSubmitting(true);
    await addEmail(newEmail.trim());
    setNewEmail('');
    setSubmitting(false);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Emails Autorizados</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie quais emails podem se cadastrar no sistema
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Adicionar Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Adicionar Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddEmail} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="usuario@empresa.com"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={submitting || !isValidEmail(newEmail)}
                    className="w-full"
                  >
                    {submitting ? 'Adicionando...' : 'Adicionar Email'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Estatísticas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {emails.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Emails autorizados
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Emails */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Lista de Emails Autorizados</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Carregando emails...</div>
              ) : emails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum email autorizado ainda
                </div>
              ) : (
                <div className="space-y-2">
                  {emails.map((emailData) => (
                    <div
                      key={emailData.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{emailData.email}</div>
                          <div className="text-sm text-muted-foreground">
                            Adicionado em {new Date(emailData.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeEmail(emailData.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminAuthorizedEmails;