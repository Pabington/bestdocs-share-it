
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkAdminStatus = async () => {
    console.log('useAdmin: checkAdminStatus called, user:', user?.email);
    if (!user) {
      console.log('useAdmin: no user found');
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      console.log('useAdmin: calling is_admin RPC for user:', user.id);
      const { data, error } = await supabase.rpc('is_admin', { user_id: user.id });
      if (error) throw error;
      console.log('useAdmin: RPC result:', data);
      setIsAdmin(data || false);
    } catch (error) {
      console.error('Erro ao verificar status de admin:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  return {
    isAdmin,
    loading,
    refetch: checkAdminStatus
  };
};
