
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';
import { DocumentItem, DocumentFilter } from '@/types/document';

export const useDocuments = (refreshTrigger: number, filter: DocumentFilter) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const fetchDocuments = async () => {
    if (!user) return;

    try {
      let allDocs: DocumentItem[] = [];

      if (filter === 'admin_all' && isAdmin) {
        // Admin pode ver TODOS os documentos
        const { data, error } = await supabase
          .from('documents')
          .select(`
            *,
            profiles!documents_user_id_fkey (email, full_name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        allDocs = data || [];
      } else if (filter === 'all') {
        // Buscar meus documentos privados
        const { data: myPrivateDocs } = await supabase
          .from('documents')
          .select(`
            *,
            profiles!documents_user_id_fkey (email, full_name)
          `)
          .eq('user_id', user.id)
          .eq('visibility', 'private');

        // Buscar documentos públicos de todos os usuários
        const { data: publicDocs } = await supabase
          .from('documents')
          .select(`
            *,
            profiles!documents_user_id_fkey (email, full_name)
          `)
          .eq('visibility', 'public');

        // Buscar documentos compartilhados comigo
        const { data: sharedDocs } = await supabase
          .from('document_shares')
          .select(`
            document_id,
            documents!inner (
              *,
              profiles!documents_user_id_fkey (email, full_name)
            )
          `)
          .eq('shared_with_user_id', user.id);

        const mappedSharedDocs = sharedDocs?.map(share => share.documents) || [];
        
        allDocs = [
          ...(myPrivateDocs || []),
          ...(publicDocs || []),
          ...mappedSharedDocs
        ];
      } else {
        // Aplicar filtros específicos
        let query = supabase
          .from('documents')
          .select(`
            *,
            profiles!documents_user_id_fkey (email, full_name)
          `);

        switch (filter) {
          case 'my_private':
            query = query
              .eq('user_id', user.id)
              .eq('visibility', 'private');
            break;
          case 'public':
            query = query.eq('visibility', 'public');
            break;
          case 'shared':
            const { data: sharedDocs } = await supabase
              .from('document_shares')
              .select(`
                document_id,
                documents!inner (
                  *,
                  profiles!documents_user_id_fkey (email, full_name)
                )
              `)
              .eq('shared_with_user_id', user.id);
            
            allDocs = sharedDocs?.map(share => share.documents) || [];
            setDocuments(allDocs as DocumentItem[]);
            setLoading(false);
            return;
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        allDocs = data || [];
      }

      // Remover duplicatas por ID
      const uniqueDocs = allDocs.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );

      setDocuments(uniqueDocs);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar documentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user, refreshTrigger, filter, isAdmin]);

  return {
    documents,
    loading,
    refetch: fetchDocuments
  };
};
