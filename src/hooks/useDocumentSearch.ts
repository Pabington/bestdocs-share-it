
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';
import { DocumentItem, DocumentFilter, DocumentSearchParams, DocumentListResponse } from '@/types/document';

export const useDocumentSearch = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const searchDocuments = useCallback(async (params: DocumentSearchParams): Promise<DocumentListResponse> => {
    if (!user) {
      return { documents: [], totalCount: 0, totalPages: 0, currentPage: params.page };
    }

    setLoading(true);

    try {
      const { filter, searchTerm, page, limit } = params;
      const offset = (page - 1) * limit;

      let countQuery = supabase.from('documents').select('id', { count: 'exact', head: true });
      let dataQuery = supabase
        .from('documents')
        .select(`
          *,
          profiles!documents_user_id_fkey (email, full_name)
        `)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      // Aplicar filtro de nome se fornecido
      if (searchTerm.trim()) {
        const searchFilter = `name.ilike.%${searchTerm.trim()}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      // Aplicar filtros específicos por tipo
      if (filter === 'admin_all' && isAdmin) {
        // Admin pode ver todos os documentos - sem filtros adicionais
      } else if (filter === 'my_private') {
        const privateFilter = `and(user_id.eq.${user.id},visibility.eq.private)`;
        countQuery = countQuery.and(privateFilter);
        dataQuery = dataQuery.and(privateFilter);
      } else if (filter === 'public') {
        const publicFilter = 'visibility.eq.public';
        countQuery = countQuery.and(publicFilter);
        dataQuery = dataQuery.and(publicFilter);
      } else if (filter === 'shared') {
        // Para documentos compartilhados, precisamos fazer uma consulta diferente
        const { data: sharedDocs, error: sharedError } = await supabase
          .from('document_shares')
          .select(`
            document_id,
            documents!inner (
              *,
              profiles!documents_user_id_fkey (email, full_name)
            )
          `)
          .eq('shared_with_user_id', user.id)
          .range(offset, offset + limit - 1);

        if (sharedError) throw sharedError;

        let filteredSharedDocs = sharedDocs?.map(share => share.documents) || [];
        
        // Aplicar filtro de nome se fornecido
        if (searchTerm.trim()) {
          filteredSharedDocs = filteredSharedDocs.filter(doc => 
            doc.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
          );
        }

        // Para contar o total de documentos compartilhados
        const { data: allSharedDocs } = await supabase
          .from('document_shares')
          .select('document_id, documents!inner(name)')
          .eq('shared_with_user_id', user.id);

        let totalSharedCount = allSharedDocs?.length || 0;
        if (searchTerm.trim()) {
          totalSharedCount = allSharedDocs?.filter(share => 
            share.documents.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
          ).length || 0;
        }

        setLoading(false);
        return {
          documents: filteredSharedDocs as DocumentItem[],
          totalCount: totalSharedCount,
          totalPages: Math.ceil(totalSharedCount / limit),
          currentPage: page
        };
      } else if (filter === 'all') {
        // Documentos do usuário (privados) + públicos + compartilhados
        const userDocsFilter = `or(and(user_id.eq.${user.id},visibility.eq.private),visibility.eq.public)`;
        countQuery = countQuery.and(userDocsFilter);
        dataQuery = dataQuery.and(userDocsFilter);

        // Adicionar documentos compartilhados separadamente
        const { data: sharedDocsData } = await supabase
          .from('document_shares')
          .select(`
            documents!inner (
              *,
              profiles!documents_user_id_fkey (email, full_name)
            )
          `)
          .eq('shared_with_user_id', user.id);

        const sharedDocs = sharedDocsData?.map(share => share.documents) || [];
        
        // Executar consulta principal
        const [{ count }, { data: mainDocs, error: dataError }] = await Promise.all([
          countQuery,
          dataQuery
        ]);

        if (dataError) throw dataError;

        // Combinar resultados e remover duplicatas
        const allDocs = [...(mainDocs || []), ...sharedDocs];
        const uniqueDocs = allDocs.filter((doc, index, self) => 
          index === self.findIndex(d => d.id === doc.id)
        );

        // Aplicar filtro de nome se fornecido
        let filteredDocs = uniqueDocs;
        if (searchTerm.trim()) {
          filteredDocs = uniqueDocs.filter(doc => 
            doc.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
          );
        }

        // Paginar os resultados filtrados
        const paginatedDocs = filteredDocs.slice(offset, offset + limit);
        
        setLoading(false);
        return {
          documents: paginatedDocs,
          totalCount: filteredDocs.length,
          totalPages: Math.ceil(filteredDocs.length / limit),
          currentPage: page
        };
      }

      // Executar consultas para casos simples (my_private, public, admin_all)
      const [{ count }, { data, error }] = await Promise.all([
        countQuery,
        dataQuery
      ]);

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / limit);

      setLoading(false);
      return {
        documents: data || [],
        totalCount: count || 0,
        totalPages,
        currentPage: page
      };

    } catch (error: any) {
      console.error('Erro na busca de documentos:', error);
      toast({
        title: "Erro na busca",
        description: error.message || "Não foi possível buscar os documentos",
        variant: "destructive",
      });
      
      setLoading(false);
      return { documents: [], totalCount: 0, totalPages: 0, currentPage: params.page };
    }
  }, [user, isAdmin]);

  return {
    searchDocuments,
    loading
  };
};
