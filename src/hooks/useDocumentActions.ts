
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { DocumentItem } from '@/types/document';

const logAuditEvent = async (
  actionType: string,
  resourceId?: string,
  details?: any
) => {
  try {
    await supabase.rpc('create_audit_log', {
      p_action_type: actionType,
      p_resource_type: 'document',
      p_resource_id: resourceId,
      p_details: details
    });
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
  }
};

export const useDocumentActions = (onRefetch: () => void) => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const handleDownload = async (documentItem: DocumentItem) => {
    try {
      console.log('Iniciando download do arquivo:', documentItem.file_path);
      
      // Primeiro, verificar se o arquivo existe no storage
      const { data: fileList, error: listError } = await supabase.storage
        .from('documents')
        .list(documentItem.file_path.split('/')[0], {
          limit: 100,
          offset: 0,
        });

      if (listError) {
        console.error('Erro ao listar arquivos:', listError);
        throw new Error('Erro ao acessar o storage de documentos');
      }

      const fileName = documentItem.file_path.split('/').pop();
      const fileExists = fileList?.some(file => file.name === fileName);
      
      if (!fileExists) {
        console.error('Arquivo não encontrado no storage:', documentItem.file_path);
        throw new Error('Arquivo não encontrado no servidor');
      }

      console.log('Arquivo encontrado, criando URL assinada...');

      // Criar URL assinada com tempo de validade maior
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(documentItem.file_path, 3600); // 1 hora de validade

      if (error) {
        console.error('Erro ao criar URL assinada:', error);
        throw new Error('Erro ao gerar link de download: ' + error.message);
      }

      if (!data || !data.signedUrl) {
        throw new Error('URL de download não foi gerada corretamente');
      }

      console.log('URL assinada criada, fazendo download...');

      // Fazer download do arquivo
      const response = await fetch(data.signedUrl);
      
      if (!response.ok) {
        console.error('Erro na resposta do fetch:', response.status, response.statusText);
        throw new Error(`Erro ao baixar o arquivo: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('Blob criado, tamanho:', blob.size);

      if (blob.size === 0) {
        throw new Error('Arquivo está vazio ou não pôde ser baixado');
      }

      const url = URL.createObjectURL(blob);
      
      // Criar link de download
      const downloadLink = window.document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = documentItem.name;
      downloadLink.style.display = 'none';
      
      window.document.body.appendChild(downloadLink);
      downloadLink.click();
      window.document.body.removeChild(downloadLink);
      
      // Limpar a URL do objeto após um pequeno delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);

      // Log de auditoria para download
      await logAuditEvent('document_download', documentItem.id, {
        fileName: documentItem.name,
        fileSize: documentItem.file_size
      });

      toast({
        title: "Download concluído",
        description: `${documentItem.name} foi baixado com sucesso.`,
      });

      console.log('Download concluído com sucesso');
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

      // Log de auditoria para exclusão
      await logAuditEvent('document_delete', documentItem.id, {
        fileName: documentItem.name,
        deletedBy: user?.id,
        isAdmin: isAdmin
      });

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
