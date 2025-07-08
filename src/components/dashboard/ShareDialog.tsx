
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Share2, X, Users, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface DocumentItem {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  visibility: 'public' | 'private';
  created_at: string;
  user_id: string;
}

interface ShareDialogProps {
  document: DocumentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShareComplete: () => void;
}

interface SharedUser {
  id: string;
  shared_with_user_id: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  document,
  open,
  onOpenChange,
  onShareComplete
}) => {
  const [email, setEmail] = useState('');
  const [sharing, setSharing] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loadingSharedUsers, setLoadingSharedUsers] = useState(false);
  const { user } = useAuth();

  const fetchSharedUsers = async () => {
    if (!document?.id) return;

    setLoadingSharedUsers(true);
    try {
      const { data, error } = await supabase
        .from('document_shares')
        .select(`
          id,
          shared_with_user_id,
          profiles!document_shares_shared_with_user_id_fkey (
            email,
            full_name
          )
        `)
        .eq('document_id', document.id);

      if (error) throw error;
      setSharedUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar usuários compartilhados:', error);
      toast({
        title: "Erro ao carregar compartilhamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingSharedUsers(false);
    }
  };

  useEffect(() => {
    if (open && document?.id) {
      fetchSharedUsers();
    }
  }, [open, document?.id]);

  const handleShare = async () => {
    if (!email.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, insira um email para compartilhar.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para compartilhar documentos.",
        variant: "destructive",
      });
      return;
    }

    setSharing(true);

    try {
      // Buscar o usuário pelo email
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.trim())
        .single();

      if (userError || !targetUser) {
        toast({
          title: "Usuário não encontrado",
          description: "Não foi possível encontrar um usuário com este email.",
          variant: "destructive",
        });
        return;
      }

      // Verificar se não está tentando compartilhar consigo mesmo
      if (targetUser.id === user.id) {
        toast({
          title: "Erro no compartilhamento",
          description: "Você não pode compartilhar um documento consigo mesmo.",
          variant: "destructive",
        });
        return;
      }

      // Verificar se já não está compartilhado
      const { data: existingShare } = await supabase
        .from('document_shares')
        .select('id')
        .eq('document_id', document.id)
        .eq('shared_with_user_id', targetUser.id)
        .single();

      if (existingShare) {
        toast({
          title: "Já compartilhado",
          description: "Este documento já foi compartilhado com este usuário.",
          variant: "destructive",
        });
        return;
      }

      // Criar o compartilhamento
      const { error: shareError } = await supabase
        .from('document_shares')
        .insert({
          document_id: document.id,
          shared_by_user_id: user.id,
          shared_with_user_id: targetUser.id,
        });

      if (shareError) throw shareError;

      toast({
        title: "Documento compartilhado!",
        description: `${document.name} foi compartilhado com ${email}.`,
      });

      setEmail('');
      fetchSharedUsers();
      onShareComplete();
    } catch (error: any) {
      console.error('Erro ao compartilhar:', error);
      toast({
        title: "Erro ao compartilhar",
        description: error.message || "Não foi possível compartilhar o documento",
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string, userEmail: string) => {
    try {
      const { error } = await supabase
        .from('document_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: "Compartilhamento removido",
        description: `O acesso de ${userEmail} foi removido.`,
      });

      fetchSharedUsers();
      onShareComplete();
    } catch (error: any) {
      toast({
        title: "Erro ao remover compartilhamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getUserDisplayName = (sharedUser: SharedUser) => {
    return sharedUser.profiles.full_name || sharedUser.profiles.email;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartilhar Documento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900">{document.name}</p>
            <p className="text-xs text-blue-600">Documento privado</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email do usuário</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sharing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleShare();
                  }
                }}
              />
              <Button onClick={handleShare} disabled={sharing || !email.trim()}>
                {sharing ? "Compartilhando..." : "Compartilhar"}
              </Button>
            </div>
          </div>

          {/* Lista de usuários com acesso */}
          <div className="space-y-2">
            <Label>Usuários com acesso</Label>
            {loadingSharedUsers ? (
              <p className="text-sm text-gray-500">Carregando...</p>
            ) : sharedUsers.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum usuário tem acesso a este documento.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sharedUsers.map((sharedUser) => (
                  <Card key={sharedUser.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">
                              {getUserDisplayName(sharedUser)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {sharedUser.profiles.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveShare(sharedUser.id, sharedUser.profiles.email)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
