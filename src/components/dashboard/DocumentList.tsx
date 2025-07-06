
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { DocumentItem, DocumentFilter } from '@/types/document';
import { useDocumentActions } from '@/hooks/useDocumentActions';
import { useDocumentSearch } from '@/hooks/useDocumentSearch';
import { DocumentCard } from './DocumentCard';
import { DocumentFilter as FilterComponent } from './DocumentFilter';
import { DocumentSearch } from './DocumentSearch';
import { DocumentPagination } from './DocumentPagination';
import { ShareDialog } from './ShareDialog';
import { useDebounce } from '@/hooks/useDebounce';

interface DocumentListProps {
  refreshTrigger: number;
}

export const DocumentList: React.FC<DocumentListProps> = ({ refreshTrigger }) => {
  const [filter, setFilter] = useState<DocumentFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);

  const { searchDocuments, loading } = useDocumentSearch();
  const { handleDownload, handleDelete } = useDocumentActions(() => {
    // Recarregar a página atual após ações
    loadDocuments();
  });

  // Debounce da busca para evitar muitas requisições
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const loadDocuments = useCallback(async () => {
    const result = await searchDocuments({
      filter,
      searchTerm: debouncedSearchTerm,
      page: currentPage,
      limit: itemsPerPage
    });

    setDocuments(result.documents);
    setTotalCount(result.totalCount);
    setTotalPages(result.totalPages);
  }, [searchDocuments, filter, debouncedSearchTerm, currentPage, itemsPerPage]);

  // Carregar documentos quando parâmetros mudarem
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Recarregar quando refreshTrigger mudar
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadDocuments();
    }
  }, [refreshTrigger, loadDocuments]);

  // Resetar para primeira página quando filtro ou busca mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, debouncedSearchTerm]);

  const handleShare = (documentItem: DocumentItem) => {
    setSelectedDocument(documentItem);
    setShareDialogOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Resetar para primeira página
  };

  const getEmptyStateMessage = () => {
    if (searchTerm.trim()) {
      return `Nenhum documento encontrado para "${searchTerm}"`;
    }

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

  return (
    <>
      <div className="space-y-4">
        <FilterComponent 
          filter={filter} 
          onFilterChange={setFilter}
        />

        <DocumentSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Buscar documentos por nome..."
        />

        {loading ? (
          <div className="text-center py-8">Carregando documentos...</div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">{getEmptyStateMessage()}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                filter={filter}
                onDownload={handleDownload}
                onShare={handleShare}
                onDelete={handleDelete}
              />
            ))}

            <DocumentPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </>
        )}
      </div>

      {selectedDocument && (
        <ShareDialog
          document={selectedDocument}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          onShareComplete={loadDocuments}
        />
      )}
    </>
  );
};
