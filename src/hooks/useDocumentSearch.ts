
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
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Otimizar consulta com índices apropriados
      let countQuery = supabase.from('documents').select('id', { count: 'exact', head: true });
      let dataQuery = supabase
        .from('documents')
        .select(`
          id,
          name,
          file_path,
          file_size,
          file_type,
          visibility,
          created_at,
          updated_at,
          user_id,
          profiles!documents_user_id_fkey (email, full_name)
        `)
        .range(from, to)
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
        countQuery = countQuery.eq('user_id', user.id).eq('visibility', 'private');
        dataQuery = dataQuery.eq('user_id', user.id).eq('visibility', 'private');
      } else if (filter === 'public') {
        countQuery = countQuery.eq('visibility', 'public');
        dataQuery = dataQuery.eq('visibility', 'public');
      } else if (filter === 'shared') {
        // Para documentos compartilhados, consulta especializada
        const sharedQuery = supabase
          .from('document_shares')
          .select(`
            documents!inner (
              *,
              profiles!documents_user_id_fkey (email, full_name)
            )
          `, { count: 'exact' })
          .eq('shared_with_user_id', user.id)
          .range(from, to)
          .order('created_at', { ascending: false });

        // Aplicar filtro de nome se fornecido
        if (searchTerm.trim()) {
          sharedQuery.or(`documents.name.ilike.%${searchTerm.trim()}%`);
        }

        const { data: sharedData, count: sharedCount, error: sharedError } = await sharedQuery;

        if (sharedError) throw sharedError;

        const documents = sharedData?.map(share => share.documents) || [];
        const totalPages = Math.ceil((sharedCount || 0) / limit);

        setLoading(false);
        return {
          documents: documents as DocumentItem[],
          totalCount: sharedCount || 0,
          totalPages,
          currentPage: page
        };
      } else if (filter === 'all') {
        // Monta filtro de busca se houver termo
        const nameFilter = searchTerm.trim()
          ? { name: `ilike.%${searchTerm.trim()}%` }
          : {};

        // 1. Documentos privados do usuário
        const { data: myPrivateDocs = [] } = await supabase
          .from('documents')
          .select(`
            id,
            name,
            file_path,
            file_size,
            file_type,
            visibility,
            created_at,
            updated_at,
            user_id,
            profiles!documents_user_id_fkey (email, full_name)
          `)
          .eq('user_id', user.id)
          .eq('visibility', 'private')
          .match(nameFilter);

        // 2. Documentos públicos
        const { data: publicDocs = [] } = await supabase
          .from('documents')
          .select(`
            id,
            name,
            file_path,
            file_size,
            file_type,
            visibility,
            created_at,
            updated_at,
            user_id,
            profiles!documents_user_id_fkey (email, full_name)
          `)
          .eq('visibility', 'public')
          .match(nameFilter);

        // 3. Documentos compartilhados com o usuário
        let sharedDocs = [];
        const { data: sharedDocsData = [] } = await supabase
          .from('document_shares')
          .select(`
            documents!inner (
              id,
              name,
              file_path,
              file_size,
              file_type,
              visibility,
              created_at,
              updated_at,
              user_id,
              profiles!documents_user_id_fkey (email, full_name)
            )
          `)
          .eq('shared_with_user_id', user.id);

        if (sharedDocsData.length > 0) {
          sharedDocs = sharedDocsData
            .map(share => share.documents)
            .filter(doc => {
              if (!doc) return false;
              if (!searchTerm.trim()) return true;
              // Filtro manual para nome, pois não dá para usar .match() em join
              return doc.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
            });
        }

        // Unir todos, removendo duplicatas pelo id
        const allDocs = [...myPrivateDocs, ...publicDocs, ...sharedDocs];
        const uniqueDocsMap = new Map();
        allDocs.forEach(doc => {
          if (doc && doc.id) uniqueDocsMap.set(doc.id, doc);
        });
        const uniqueDocs = Array.from(uniqueDocsMap.values());

        // Paginação manual
        const paginatedDocs = uniqueDocs.slice(from, to + 1);

        setLoading(false);
        return {
          documents: paginatedDocs,
          totalCount: uniqueDocs.length,
          totalPages: Math.ceil(uniqueDocs.length / limit),
          currentPage: page
        };
      }

      // Executar consultas para casos simples
      const { data, count, error } = await dataQuery;

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
