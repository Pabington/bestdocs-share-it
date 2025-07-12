import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AuthorizedEmail {
  id: string;
  email: string;
  added_by: string;
  created_at: string;
}

export const useAuthorizedEmails = () => {
  const [emails, setEmails] = useState<AuthorizedEmail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('authorized_emails')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching authorized emails:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar emails autorizados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addEmail = async (email: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('authorized_emails')
        .insert({
          email: email.toLowerCase(),
          added_by: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Email adicionado à lista de autorizados',
      });

      fetchEmails();
    } catch (error: any) {
      console.error('Error adding authorized email:', error);
      toast({
        title: 'Erro',
        description: error.message.includes('duplicate') 
          ? 'Este email já está na lista de autorizados'
          : 'Erro ao adicionar email',
        variant: 'destructive',
      });
    }
  };

  const removeEmail = async (id: string) => {
    try {
      const { error } = await supabase
        .from('authorized_emails')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Email removido da lista de autorizados',
      });

      fetchEmails();
    } catch (error) {
      console.error('Error removing authorized email:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover email',
        variant: 'destructive',
      });
    }
  };

  const checkEmailAuthorized = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_email_authorized', { 
        check_email: email 
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking email authorization:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  return {
    emails,
    loading,
    addEmail,
    removeEmail,
    checkEmailAuthorized,
    refetch: fetchEmails,
  };
};