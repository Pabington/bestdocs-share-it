
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Shield } from 'lucide-react';
import { DocumentFilter as FilterType } from '@/types/document';
import { useAdmin } from '@/hooks/useAdmin';

interface DocumentFilterProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export const DocumentFilter: React.FC<DocumentFilterProps> = ({
  filter,
  onFilterChange
}) => {
  const { isAdmin } = useAdmin();

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

  return (
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
        <Select value={filter} onValueChange={onFilterChange}>
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
  );
};
