
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';
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
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
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
        description: `${file.name} foi adicionado aos seus documentos.`,
      });

      setFile(null);
      setVisibility('private');
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
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="visibility">Visibilidade</Label>
          <Select value={visibility} onValueChange={(value: 'private' | 'public') => setVisibility(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Privado</SelectItem>
              <SelectItem value="public">Público</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{file.name}</span>
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
