
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Document {
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
  document: Document;
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
      toast({
        title: "Erro ao compartilhar",
        description: error.message,
        variant: "destructive",
      });
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Compartilhar Documento</DialogTitle>
          <DialogDescription>
            Compartilhe "{document.name}" com outros usuários do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new share */}
          <div className="space-y-2">
            <Label>Compartilhar com usuário</Label>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleShare} 
                disabled={!selectedUserId || loading}
                size="sm"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Current shares */}
          {sharedUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Compartilhado com:</Label>
              <div className="space-y-2">
                {sharedUsers.map((sharedUser) => (
                  <div key={sharedUser.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">
                      {sharedUser.full_name || sharedUser.email}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveShare(sharedUser.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {availableUsers.length === 0 && sharedUsers.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Não há outros usuários para compartilhar.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
