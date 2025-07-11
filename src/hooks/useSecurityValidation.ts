import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ValidationResult {
  valid: boolean;
  sanitizedFileName?: string;
  error?: string;
}

interface AuthRateLimitResult {
  allowed: boolean;
  error?: string;
}

export const useSecurityValidation = () => {
  const [isValidating, setIsValidating] = useState(false);

  const validateFileUpload = async (
    file: File
  ): Promise<ValidationResult> => {
    setIsValidating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-upload', {
        body: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        }
      });

      if (error) {
        console.error('Erro na validação de upload:', error);
        toast({
          title: "Erro de validação",
          description: error.message || "Erro ao validar arquivo",
          variant: "destructive",
        });
        return { valid: false, error: error.message };
      }

      if (!data?.valid) {
        toast({
          title: "Arquivo inválido",
          description: data?.error || "Arquivo não passou na validação de segurança",
          variant: "destructive",
        });
        return { valid: false, error: data?.error };
      }

      return {
        valid: true,
        sanitizedFileName: data.sanitizedFileName
      };
    } catch (error: any) {
      console.error('Erro na validação:', error);
      toast({
        title: "Erro de validação",
        description: "Não foi possível validar o arquivo",
        variant: "destructive",
      });
      return { valid: false, error: "Erro interno de validação" };
    } finally {
      setIsValidating(false);
    }
  };

  const checkAuthRateLimit = async (
    action: 'login' | 'signup' | 'reset_password',
    email?: string
  ): Promise<AuthRateLimitResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-rate-limit', {
        body: {
          action,
          email
        }
      });

      if (error) {
        console.error('Erro na verificação de rate limit:', error);
        // Em caso de erro, permite a ação (fail-safe)
        return { allowed: true };
      }

      if (!data?.allowed) {
        toast({
          title: "Muitas tentativas",
          description: data?.error || "Tente novamente mais tarde",
          variant: "destructive",
        });
        return { allowed: false, error: data?.error };
      }

      return { allowed: true };
    } catch (error: any) {
      console.error('Erro na verificação de rate limit:', error);
      // Em caso de erro, permite a ação (fail-safe)
      return { allowed: true };
    }
  };

  const sanitizeFileName = (fileName: string): string => {
    // Sanitização básica no frontend como fallback
    let sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    sanitized = sanitized.replace(/_+/g, '_');
    sanitized = sanitized.replace(/^_+|_+$/g, '');
    
    if (!sanitized || sanitized.length === 0) {
      sanitized = 'arquivo_' + Date.now();
    }
    
    return sanitized;
  };

  return {
    validateFileUpload,
    checkAuthRateLimit,
    sanitizeFileName,
    isValidating
  };
};