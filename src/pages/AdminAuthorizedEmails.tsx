console.log('user', user);
console.log('isAdmin', isAdmin, 'adminLoading', adminLoading);
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Trash2, Plus, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuthorizedEmails } from '@/hooks/useAuthorizedEmails';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const AdminAuthorizedEmails = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { emails, loading, addEmail, removeEmail } = useAuthorizedEmails();
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    navigate('/');
    return null;
  }

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setAdding(true);
    await addEmail(newEmail.toLowerCase().trim());
    setNewEmail('');
    setAdding(false);
  };

  const handleRemoveEmail = async (id: string) => {
    await removeEmail(id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-6 w-6 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              E-mails Autorizados
            </h1>
          </div>
          <p className="text-gray-600">
            Gerencie quais e-mails podem se cadastrar no sistema
          </p>
        </div>

        <div className="grid gap-6">
          {/* Formulário para adicionar novo e-mail */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Adicionar Novo E-mail
              </CardTitle>
              <CardDescription>
                Autorize um novo e-mail para cadastro no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddEmail} className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="email" className="sr-only">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Digite o e-mail para autorizar"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={adding || !newEmail.trim()}>
                  {adding ? "Adicionando..." : "Adicionar"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de e-mails autorizados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                E-mails Autorizados ({emails.length})
              </CardTitle>
              <CardDescription>
                Lista de e-mails que podem se cadastrar no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Carregando e-mails...</div>
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <div className="text-gray-500 mb-2">Nenhum e-mail autorizado</div>
                  <div className="text-sm text-gray-400">
                    Adicione e-mails para permitir novos cadastros
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {emails.map((emailData) => (
                    <div
                      key={emailData.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{emailData.email}</div>
                          <div className="text-sm text-gray-500">
                            Adicionado em {new Date(emailData.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover e-mail autorizado?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover "{emailData.email}" da lista de e-mails autorizados? 
                              Este e-mail não poderá mais se cadastrar no sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveEmail(emailData.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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