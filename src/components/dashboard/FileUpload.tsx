
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
import { useSecurityValidation } from '@/hooks/useSecurityValidation';

interface FileUploadProps {
  onUploadComplete: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { validateFileUpload, isValidating } = useSecurityValidation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validação robusta no backend
      const validation = await validateFileUpload(selectedFile);
      if (!validation.valid) {
        // Reset input
        e.target.value = '';
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
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="truncate">Enviar Documento</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file" className="text-sm sm:text-base">Arquivo</Label>
          <Input
            id="file"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx,.ppt,.pptx,.csv"
            disabled={uploading || isValidating}
            className="h-10 sm:h-11 text-sm sm:text-base"
          />
          <p className="text-xs sm:text-sm text-muted-foreground">
            PDF, DOC, XLS, PPT, TXT, CSV, IMG (máx. 50MB)
          </p>
          {isValidating && (
            <p className="text-xs sm:text-sm text-primary">Validando arquivo...</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="visibility" className="text-sm sm:text-base">Visibilidade</Label>
          <Select value={visibility} onValueChange={(value: 'private' | 'public') => setVisibility(value)} disabled={uploading}>
            <SelectTrigger className="h-10 sm:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border">
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <div>
                    <div className="text-sm">Privado</div>
                    <div className="text-xs text-muted-foreground">Apenas você pode ver</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  <div>
                    <div className="text-sm">Público</div>
                    <div className="text-xs text-muted-foreground">Todos os usuários podem ver</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {file && (
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-accent rounded-lg border">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
          </div>
        )}

        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="w-full h-10 sm:h-11 text-sm sm:text-base font-medium"
        >
          {uploading ? "Enviando..." : "Enviar Arquivo"}
        </Button>
      </CardContent>
    </Card>
  );
};
