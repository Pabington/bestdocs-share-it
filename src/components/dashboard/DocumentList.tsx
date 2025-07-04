import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Share2, Download, Trash2, Eye, Users, Filter, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
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
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

interface DocumentListProps {
  refreshTrigger: number;
}

export const DocumentList: React.FC<DocumentListProps> = ({ refreshTrigger }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'my_private' | 'public' | 'shared' | 'admin_all'>('all');
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

  const handleDownload = async (documentItem: DocumentItem) => {
    try {
      // Obter URL pública do arquivo
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(documentItem.file_path, 3600); // 1 hora de validade

      if (error) throw error;

      // Fazer download do arquivo
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error('Erro ao baixar o arquivo');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const downloadLink = window.document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = documentItem.name;
      window.document.body.appendChild(downloadLink);
      downloadLink.click();
      window.document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      toast({
        title: "Download concluído",
        description: `${documentItem.name} foi baixado com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro no download:', error);
      toast({
        title: "Erro no download",
        description: error.message || "Não foi possível baixar o arquivo",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (documentItem: DocumentItem) => {
    const canDelete = documentItem.user_id === user?.id || isAdmin;
    
    if (!canDelete) {
      toast({
        title: "Permissão negada",
        description: "Você não tem permissão para excluir este documento.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([documentItem.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentItem.id);

      if (dbError) throw dbError;

      toast({
        title: "Documento excluído",
        description: `${documentItem.name} foi removido.`,
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

  const handleShare = (documentItem: DocumentItem) => {
    setSelectedDocument(documentItem);
    setShareDialogOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileExtension = (fileName: string) => {
    return fileName.split('.').pop()?.toUpperCase() || '';
  };

  const getDocumentOrigin = (documentItem: DocumentItem) => {
    if (filter === 'admin_all' && isAdmin) {
      if (documentItem.user_id === user?.id) {
        return documentItem.visibility === 'private' ? 'Meu documento privado' : 'Meu documento público';
      } else {
        return documentItem.visibility === 'private' ? 'Documento privado (outro usuário)' : 'Documento público (outro usuário)';
      }
    }
    
    if (documentItem.user_id === user?.id) {
      return documentItem.visibility === 'private' ? 'Meu documento privado' : 'Meu documento público';
    } else if (documentItem.visibility === 'public') {
      return 'Documento público';
    } else {
      return 'Compartilhado comigo';
    }
  };

  const getOriginBadgeVariant = (documentItem: DocumentItem) => {
    if (filter === 'admin_all' && isAdmin && documentItem.user_id !== user?.id) {
      return 'destructive';
    }
    
    if (documentItem.user_id === user?.id) {
      return documentItem.visibility === 'private' ? 'secondary' : 'default';
    } else if (documentItem.visibility === 'public') {
      return 'outline';
    } else {
      return 'secondary';
    }
  };

  const getUserDisplayName = (documentItem: DocumentItem) => {
    if (documentItem.user_id === user?.id) {
      return 'Você';
    }
    
    if (documentItem.profiles) {
      return documentItem.profiles.full_name || documentItem.profiles.email;
    }
    
    return 'Usuário desconhecido';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getFilterDescription = () => {
    switch (filter) {
      case 'all':
        return 'Mostrando seus documentos privados, documentos públicos de todos os usuários e documentos compartilhados com você.';
      case 'my_private':
        return 'Mostrando apenas seus documentos privados.';
      case 'public':
        return 'Mostrando documentos públicos de todos os usuários.';
      case 'shared':
        return 'Mostrando documentos que outros usuários compartilharam com você.';
      case 'admin_all':
        return isAdmin ? 'Visualização administrativa: mostrando TODOS os documentos do sistema (públicos e privados).' : '';
      default:
        return '';
    }
  };

  const getEmptyStateMessage = () => {
    switch (filter) {
      case 'all':
        return 'Nenhum documento encontrado';
      case 'my_private':
        return 'Você não possui documentos privados';
      case 'public':
        return 'Nenhum documento público encontrado';
      case 'shared':
        return 'Nenhum documento foi compartilhado com você';
      case 'admin_all':
        return 'Nenhum documento encontrado no sistema';
      default:
        return 'Nenhum documento encontrado';
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
                {isAdmin && (
                  <Badge variant="destructive" className="ml-2">
                    <Shield className="h-3 w-3 mr-1" />
                    ADMIN
                  </Badge>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Select value={filter} onValueChange={(value: 'all' | 'my_private' | 'public' | 'shared' | 'admin_all') => setFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os documentos</SelectItem>
                <SelectItem value="my_private">Meus documentos privados</SelectItem>
                <SelectItem value="public">Documentos públicos</SelectItem>
                <SelectItem value="shared">Compartilhados comigo</SelectItem>
                {isAdmin && (
                  <SelectItem value="admin_all">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Todos (Administrador)
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600 mt-2">
              {getFilterDescription()}
            </p>
          </CardContent>
        </Card>

        {documents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">{getEmptyStateMessage()}</p>
            </CardContent>
          </Card>
        ) : (
          documents.map((documentItem) => (
            <Card key={documentItem.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{documentItem.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {getFileExtension(documentItem.name)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(documentItem.file_size)} • {formatDate(documentItem.created_at)}
                      </p>
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <span>Enviado por:</span>
                        <span className="font-medium">{getUserDisplayName(documentItem)}</span>
                        {documentItem.profiles && documentItem.user_id !== user?.id && (
                          <span className="text-gray-400">({documentItem.profiles.email})</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getDocumentOrigin(documentItem)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={getOriginBadgeVariant(documentItem)}>
                      {documentItem.visibility === 'public' ? (
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
                      onClick={() => handleDownload(documentItem)}
                      title="Baixar arquivo"
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    {documentItem.visibility === 'private' && documentItem.user_id === user?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShare(documentItem)}
                        title="Compartilhar arquivo"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}

                    {(documentItem.user_id === user?.id || isAdmin) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(documentItem)}
                        title={isAdmin && documentItem.user_id !== user?.id ? "Excluir arquivo (Admin)" : "Excluir arquivo"}
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
