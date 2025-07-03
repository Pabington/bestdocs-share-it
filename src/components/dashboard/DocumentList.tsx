
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Share2, Download, Trash2, Eye, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ShareDialog } from './ShareDialog';

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

interface DocumentListProps {
  refreshTrigger: number;
}

export const DocumentList: React.FC<DocumentListProps> = ({ refreshTrigger }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const { user } = useAuth();

  const fetchDocuments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
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
  }, [user, refreshTrigger]);

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Erro no download",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (document: Document) => {
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

  const handleShare = (document: Document) => {
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

  if (loading) {
    return <div className="text-center py-8">Carregando documentos...</div>;
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Nenhum documento encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {documents.map((document) => (
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
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={document.visibility === 'public' ? 'default' : 'secondary'}>
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
        ))}
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
