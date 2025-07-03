
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, UserPlus, Users } from 'lucide-react';
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

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

interface ShareDialogProps {
  document: DocumentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShareComplete: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  document,
  open,
  onOpenChange,
  onShareComplete,
}) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [sharedUsers, setSharedUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id);

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchSharedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('document_shares')
        .select(`
          shared_with_user_id,
          profiles!document_shares_shared_with_user_id_fkey (
            id, email, full_name
          )
        `)
        .eq('document_id', document.id);

      if (error) throw error;
      
      const sharedProfiles = data?.map(share => share.profiles).filter(Boolean) as Profile[] || [];
      setSharedUsers(sharedProfiles);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar compartilhamentos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchSharedUsers();
    }
  }, [open, document.id]);

  const handleShare = async () => {
    if (!selectedUserId || !user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('document_shares')
        .insert({
          document_id: document.id,
          shared_with_user_id: selectedUserId,
          shared_by_user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Documento compartilhado!",
        description: "O usuário agora tem acesso ao documento.",
      });

      setSelectedUserId('');
      fetchSharedUsers();
      onShareComplete();
    } catch (error: any) {
      if (error.code === '23505') {
        toast({
          title: "Documento já compartilhado",
          description: "Este documento já foi compartilhado com este usuário.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao compartilhar",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('document_shares')
        .delete()
        .eq('document_id', document.id)
        .eq('shared_with_user_id', userId);

      if (error) throw error;

      toast({
        title: "Compartilhamento removido",
        description: "O usuário não tem mais acesso ao documento.",
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

  const availableUsers = users.filter(
    user => !sharedUsers.some(sharedUser => sharedUser.id === user.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Compartilhar Documento
          </DialogTitle>
          <DialogDescription>
            Compartilhe "{document.name}" com outros usuários do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new share */}
          <div className="space-y-3">
            <h4 className="font-medium">Compartilhar com novo usuário</h4>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <SelectItem value="" disabled>Nenhum usuário disponível</SelectItem>
                  ) : (
                    availableUsers.map((availableUser) => (
                      <SelectItem key={availableUser.id} value={availableUser.id}>
                        {availableUser.full_name || availableUser.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleShare} 
                disabled={!selectedUserId || loading || availableUsers.length === 0}
                size="sm"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Current shares */}
          {sharedUsers.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Compartilhado com:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sharedUsers.map((sharedUser) => (
                  <div key={sharedUser.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {(sharedUser.full_name || sharedUser.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {sharedUser.full_name || 'Usuário'}
                        </p>
                        <p className="text-xs text-gray-500">{sharedUser.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveShare(sharedUser.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {availableUsers.length === 0 && sharedUsers.length === 0 && (
            <div className="text-center py-6">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-500">
                Não há outros usuários registrados no sistema para compartilhar.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
