
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, Share2, Trash2, Eye, Users } from 'lucide-react';
import { DocumentItem, DocumentFilter } from '@/types/document';
import { formatFileSize, getFileExtension, formatDate } from '@/utils/documentUtils';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';

interface DocumentCardProps {
  document: DocumentItem;
  filter: DocumentFilter;
  onDownload: (document: DocumentItem) => void;
  onShare: (document: DocumentItem) => void;
  onDelete: (document: DocumentItem) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  filter,
  onDownload,
  onShare,
  onDelete
}) => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const getDocumentOrigin = () => {
    if (filter === 'admin_all' && isAdmin) {
      if (document.user_id === user?.id) {
        return document.visibility === 'private' ? 'Meu documento privado' : 'Meu documento público';
      } else {
        return document.visibility === 'private' ? 'Documento privado (outro usuário)' : 'Documento público (outro usuário)';
      }
    }
    
    if (document.user_id === user?.id) {
      return document.visibility === 'private' ? 'Meu documento privado' : 'Meu documento público';
    } else if (document.visibility === 'public') {
      return 'Documento público';
    } else {
      return 'Compartilhado comigo';
    }
  };

  const getOriginBadgeVariant = () => {
    if (filter === 'admin_all' && isAdmin && document.user_id !== user?.id) {
      return 'destructive';
    }
    
    if (document.user_id === user?.id) {
      return document.visibility === 'private' ? 'secondary' : 'default';
    } else if (document.visibility === 'public') {
      return 'outline';
    } else {
      return 'secondary';
    }
  };

  const getUserDisplayName = () => {
    if (document.user_id === user?.id) {
      return 'Você';
    }
    
    if (document.profiles) {
      return document.profiles.full_name || document.profiles.email;
    }
    
    return 'Usuário desconhecido';
  };

  const canShare = document.visibility === 'private' && document.user_id === user?.id;
  const canDelete = document.user_id === user?.id || isAdmin;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-500" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{document.name}</h3>
                <Badge variant="outline" className="text-xs">
                  {getFileExtension(document.name)}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                {formatFileSize(document.file_size)} • {formatDate(document.created_at)}
              </p>
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <span>Enviado por:</span>
                <span className="font-medium">{getUserDisplayName()}</span>
                {document.profiles && document.user_id !== user?.id && (
                  <span className="text-gray-400">({document.profiles.email})</span>
                )}
              </p>
              <p className="text-xs text-gray-400">
                {getDocumentOrigin()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={getOriginBadgeVariant()}>
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
              onClick={() => onDownload(document)}
              title="Baixar arquivo"
            >
              <Download className="h-4 w-4" />
            </Button>

            {canShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShare(document)}
                title="Compartilhar arquivo"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}

            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(document)}
                title={isAdmin && document.user_id !== user?.id ? "Excluir arquivo (Admin)" : "Excluir arquivo"}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
