
-- Atualizar o usuário existente ou criar o admin se não existir
-- Primeiro, vamos verificar se existe um usuário com este email e promovê-lo a admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'pabington@bestloterias.com.br';

-- Se não existir, precisaremos inserir manualmente (isso será feito após o usuário se registrar)
-- Vamos também garantir que a função is_admin funcione corretamente
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Vamos criar uma função para verificar se um usuário pode acessar documentos como admin
CREATE OR REPLACE FUNCTION public.can_admin_access_all_documents(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.is_admin(user_id);
$$;

-- Atualizar a política de visualização de documentos para incluir acesso admin
DROP POLICY IF EXISTS "Users can view accessible documents" ON public.documents;
CREATE POLICY "Users can view accessible documents" ON public.documents
  FOR SELECT TO authenticated USING (
    public.can_access_document(id, auth.uid()) OR 
    public.is_admin(auth.uid())
  );

-- Permitir que admins vejam todos os compartilhamentos
DROP POLICY IF EXISTS "Users can view shares for their documents or shares with them" ON public.document_shares;
CREATE POLICY "Users can view shares for their documents or shares with them" ON public.document_shares
  FOR SELECT TO authenticated USING (
    shared_by_user_id = auth.uid() OR 
    shared_with_user_id = auth.uid() OR
    public.is_admin(auth.uid())
  );
