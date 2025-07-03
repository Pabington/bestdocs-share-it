
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Share2, Download, Trash2, Eye, Users, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ShareDialog } from './ShareDialog';

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

interface DocumentListProps {
  refreshTrigger: number;
}

export const DocumentList: React.FC<DocumentListProps> = ({ refreshTrigger }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'my_private' | 'public' | 'shared'>('all');
  const { user } = useAuth();

  const fetchDocuments = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          profiles!documents_user_id_fkey (email, full_name)
        `);

      // Aplicar filtros conforme regra de negócio
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
          // Documentos compartilhados comigo
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
          
          const mappedSharedDocs = sharedDocs?.map(share => ({
            ...share.documents,
            shared_by: share.documents.profiles
          })) || [];
          
          setDocuments(mappedSharedDocs as DocumentItem[]);
          setLoading(false);
          return;
        default:
          // 'all': Meus privados + públicos de todos + compartilhados comigo
          break;
      }

      if (filter === 'all') {
        // Buscar meus documentos privados + documentos públicos
        const { data: myPrivateDocs } = await supabase
          .from('documents')
          .select(`
            *,
            profiles!documents_user_id_fkey (email, full_name)
          `)
          .eq('user_id', user.id)
          .eq('visibility', 'private');

        const { data: publicDocs } = await supabase
          .from('documents')
          .select(`
            *,
            profiles!documents_user_id_fkey (email, full_name)
          `)
          .eq('visibility', 'public');

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
        
        const allDocs = [
          ...(myPrivateDocs || []),
          ...(publicDocs || []),
          ...mappedSharedDocs
        ];

        // Remover duplicatas por ID
        const uniqueDocs = allDocs.filter((doc, index, self) => 
          index === self.findIndex(d => d.id === doc.id)
        );

        setDocuments(uniqueDocs as DocumentItem[]);
      } else {
        query = query.order('created_at', { ascending: false });
        const { data, error } = await query;
        if (error) throw error;
        setDocuments(data || []);
      }
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
  }, [user, refreshTrigger, filter]);

  const handleDownload = async (document: DocumentItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Erro no download",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (document: DocumentItem) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      toast({
        title: "Documento excluído",
        description: `${document.name} foi removido.`,
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleShare = (document: DocumentItem) => {
    setSelectedDocument(document);
    setShareDialogOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentOrigin = (document: DocumentItem) => {
    if (document.user_id === user?.id) {
      return document.visibility === 'private' ? 'Meu documento privado' : 'Meu documento público';
    } else if (document.visibility === 'public') {
      return 'Documento público';
    } else {
      return 'Compartilhado comigo';
    }
  };

  const getOriginBadgeVariant = (document: DocumentItem) => {
    if (document.user_id === user?.id) {
      return document.visibility === 'private' ? 'secondary' : 'default';
    } else if (document.visibility === 'public') {
      return 'outline';
    } else {
      return 'secondary';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando documentos...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtrar Documentos
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Select value={filter} onValueChange={(value: 'all' | 'my_private' | 'public' | 'shared') => setFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os documentos</SelectItem>
                <SelectItem value="my_private">Meus documentos privados</SelectItem>
                <SelectItem value="public">Documentos públicos</SelectItem>
                <SelectItem value="shared">Compartilhados comigo</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600 mt-2">
              {filter === 'all' && 'Mostrando seus documentos privados, documentos públicos de todos os usuários e documentos compartilhados com você.'}
              {filter === 'my_private' && 'Mostrando apenas seus documentos privados.'}
              {filter === 'public' && 'Mostrando documentos públicos de todos os usuários.'}
              {filter === 'shared' && 'Mostrando documentos que outros usuários compartilharam com você.'}
            </p>
          </CardContent>
        </Card>

        {documents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {filter === 'all' && 'Nenhum documento encontrado'}
                {filter === 'my_private' && 'Você não possui documentos privados'}
                {filter === 'public' && 'Nenhum documento público encontrado'}
                {filter === 'shared' && 'Nenhum documento foi compartilhado com você'}
              </p>
            </CardContent>
          </Card>
        ) : (
          documents.map((document) => (
            <Card key={document.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <h3 className="font-medium">{document.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(document.file_size)} • {new Date(document.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getDocumentOrigin(document)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={getOriginBadgeVariant(document)}>
                      {document.visibility === 'public' ? (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Público
                        </>
                      ) : (
                        <>
                          <Users className="h-3 w-3 mr-1" />
                          Privado
                        </>
                      )}
                    </Badge>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(document)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    {document.visibility === 'private' && document.user_id === user?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShare(document)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}

                    {document.user_id === user?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(document)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedDocument && (
        <ShareDialog
          document={selectedDocument}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          onShareComplete={fetchDocuments}
        />
      )}
    </>
  );
};
