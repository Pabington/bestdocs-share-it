
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
      <CardContent className="p-3 sm:p-4">
        {/* Mobile Layout */}
        <div className="block sm:hidden space-y-3">
          <div className="flex items-start gap-3">
            <FileText className="h-6 w-6 text-primary shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-sm truncate">{document.name}</h3>
                <Badge variant="outline" className="text-xs shrink-0">
                  {getFileExtension(document.name)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(document.file_size)} • {formatDate(document.created_at)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium">{getUserDisplayName()}</span>
                {document.profiles && document.user_id !== user?.id && (
                  <span className="text-muted-foreground/70"> ({document.profiles.email})</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge variant={getOriginBadgeVariant()} className="text-xs">
              {document.visibility === 'public' ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  <span className="hidden xs:inline">Público</span>
                  <span className="xs:hidden">Pub</span>
                </>
              ) : (
                <>
                  <Users className="h-3 w-3 mr-1" />
                  <span className="hidden xs:inline">Privado</span>
                  <span className="xs:hidden">Priv</span>
                </>
              )}
            </Badge>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(document)}
                title="Baixar arquivo"
                className="h-8 w-8 p-0"
              >
                <Download className="h-3 w-3" />
              </Button>

              {canShare && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShare(document)}
                  title="Compartilhar arquivo"
                  className="h-8 w-8 p-0"
                >
                  <Share2 className="h-3 w-3" />
                </Button>
              )}

              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(document)}
                  title={isAdmin && document.user_id !== user?.id ? "Excluir arquivo (Admin)" : "Excluir arquivo"}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{document.name}</h3>
                <Badge variant="outline" className="text-xs">
                  {getFileExtension(document.name)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(document.file_size)} • {formatDate(document.created_at)}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span>Enviado por:</span>
                <span className="font-medium">{getUserDisplayName()}</span>
                {document.profiles && document.user_id !== user?.id && (
                  <span className="text-muted-foreground/70">({document.profiles.email})</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground/50">
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
