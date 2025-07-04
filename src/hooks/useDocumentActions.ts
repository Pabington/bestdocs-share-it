
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { DocumentItem } from '@/types/document';

export const useDocumentActions = (onRefetch: () => void) => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

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

      onRefetch();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    handleDownload,
    handleDelete
  };
};
