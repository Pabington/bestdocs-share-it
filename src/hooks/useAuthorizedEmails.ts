import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthorizedEmail {
  id: string;
  email: string;
  added_by: string;
  created_at: string;
}

export function useAuthorizedEmails() {
  const [emails, setEmails] = useState<AuthorizedEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmails();
  }, []);

  async function fetchEmails() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('authorized_emails')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEmails(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar e-mails",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function addEmail(email: string) {
    try {
      const { error } = await supabase
        .from('authorized_emails')
        .insert([{ email, added_by: (await supabase.auth.getUser()).data.user?.id }]);
      
      if (error) throw error;
      
      toast({
        title: "E-mail adicionado",
        description: `${email} foi autorizado para cadastro.`,
      });
      
      fetchEmails();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar e-mail",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function removeEmail(id: string) {
    try {
      const { error } = await supabase
        .from('authorized_emails')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "E-mail removido",
        description: "E-mail removido da lista de autorizados.",
      });
      
      fetchEmails();
    } catch (error: any) {
      toast({
        title: "Erro ao remover e-mail",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function checkEmailAuthorized(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('authorized_emails')
        .select('email')
        .eq('email', email.toLowerCase())
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Erro ao verificar e-mail autorizado:', error);
      return false;
    }
  }

  return { 
    emails, 
    loading, 
    addEmail, 
    removeEmail, 
    checkEmailAuthorized,
    refetch: fetchEmails 
  };
}