-- Criar tabela para rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip_address INET,
  action_type TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_action ON public.rate_limits(ip_address, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

-- Função para limpar rate limits antigos
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;

-- Função para verificar rate limit (corrigida)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_attempts INTEGER := 0;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Definir início da janela
  window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Contar tentativas na janela atual
  SELECT COALESCE(SUM(attempts), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE action_type = p_action_type
    AND window_start > window_start
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
    );
  
  -- Se excedeu o limite, retorna false
  IF current_attempts >= p_max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- Registrar nova tentativa
  INSERT INTO public.rate_limits (user_id, ip_address, action_type, window_start)
  VALUES (p_user_id, p_ip_address, p_action_type, NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Extensão para busca de texto similar
CREATE EXTENSION IF NOT EXISTS pg_trgm;