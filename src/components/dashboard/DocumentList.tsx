
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { DocumentItem, DocumentFilter } from '@/types/document';
import { useDocuments } from '@/hooks/useDocuments';
import { useDocumentActions } from '@/hooks/useDocumentActions';
import { DocumentCard } from './DocumentCard';
import { DocumentFilter as FilterComponent } from './DocumentFilter';
import { ShareDialog } from './ShareDialog';

interface DocumentListProps {
  refreshTrigger: number;
}

export const DocumentList: React.FC<DocumentListProps> = ({ refreshTrigger }) => {
  const [filter, setFilter] = useState<DocumentFilter>('all');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);

  const { documents, loading, refetch } = useDocuments(refreshTrigger, filter);
  const { handleDownload, handleDelete } = useDocumentActions(refetch);

  const handleShare = (documentItem: DocumentItem) => {
    setSelectedDocument(documentItem);
    setShareDialogOpen(true);
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
        <FilterComponent 
          filter={filter} 
          onFilterChange={setFilter}
        />

        {documents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">{getEmptyStateMessage()}</p>
            </CardContent>
          </Card>
        ) : (
          documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              filter={filter}
              onDownload={handleDownload}
              onShare={handleShare}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {selectedDocument && (
        <ShareDialog
          document={selectedDocument}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          onShareComplete={refetch}
        />
      )}
    </>
  );
};
