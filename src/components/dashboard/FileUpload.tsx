
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Eye, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface FileUploadProps {
  onUploadComplete: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validar tamanho do arquivo (máximo 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }

      // Validar tipo de arquivo
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "Tipo de arquivo não suportado",
          description: "Apenas arquivos PDF, DOC, DOCX, TXT, JPG, JPEG e PNG são permitidos.",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Insert document record into database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          visibility: visibility,
        });

      if (dbError) throw dbError;

      toast({
        title: "Arquivo enviado com sucesso!",
        description: `${file.name} foi adicionado aos seus documentos como ${visibility === 'public' ? 'público' : 'privado'}.`,
      });

      // Reset form
      setFile(null);
      setVisibility('private');
      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Enviar Documento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Arquivo</Label>
          <Input
            id="file"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500">
            Tipos permitidos: PDF, DOC, DOCX, TXT, JPG, PNG (máx. 10MB)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visibility">Visibilidade</Label>
          <Select value={visibility} onValueChange={(value: 'private' | 'public') => setVisibility(value)} disabled={uploading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <div>
                    <div>Privado</div>
                    <div className="text-xs text-gray-500">Apenas você pode ver</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <div>
                    <div>Público</div>
                    <div className="text-xs text-gray-500">Todos os usuários podem ver</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {file && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <FileText className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">{file.name}</p>
              <p className="text-xs text-blue-600">{formatFileSize(file.size)}</p>
            </div>
          </div>
        )}

        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? "Enviando..." : "Enviar Arquivo"}
        </Button>
      </CardContent>
    </Card>
  );
};
