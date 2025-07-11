-- Tabela para logs de auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para logs de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Função para criar log de auditoria (corrigida)
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id, action_type, resource_type, resource_id, 
    details, ip_address, user_agent
  )
  VALUES (
    p_user_id, p_action_type, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- RLS para rate_limits (apenas admins podem ver)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view rate limits"
ON public.rate_limits
FOR SELECT
USING (public.is_admin(auth.uid()));

-- RLS para audit_logs (apenas admins podem ver)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Melhorar índices existentes para documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id_visibility ON public.documents(user_id, visibility);
CREATE INDEX IF NOT EXISTS idx_documents_visibility_created_at ON public.documents(visibility, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_name_gin ON public.documents USING gin(name gin_trgm_ops);