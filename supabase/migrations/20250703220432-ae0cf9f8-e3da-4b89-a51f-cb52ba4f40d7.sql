
-- Criar enum para tipos de visibilidade de documentos
CREATE TYPE public.document_visibility AS ENUM ('public', 'private');

-- Criar enum para roles de usuário
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Criar tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Criar tabela de documentos
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  visibility document_visibility NOT NULL DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de compartilhamento de documentos
CREATE TABLE public.document_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, shared_with_user_id)
);

-- Criar bucket de storage para documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view all profiles for sharing" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Função para verificar se usuário é admin
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

-- Função para verificar acesso a documento
CREATE OR REPLACE FUNCTION public.can_access_document(doc_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = doc_id AND (
      d.user_id = user_id OR -- Proprietário
      d.visibility = 'public' OR -- Documento público
      public.is_admin(user_id) OR -- Admin
      EXISTS ( -- Compartilhado com o usuário
        SELECT 1 FROM public.document_shares ds
        WHERE ds.document_id = doc_id AND ds.shared_with_user_id = user_id
      )
    )
  );
$$;

-- Políticas RLS para documents
CREATE POLICY "Users can view accessible documents" ON public.documents
  FOR SELECT TO authenticated USING (
    public.can_access_document(id, auth.uid())
  );

CREATE POLICY "Users can insert their own documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents or admins can delete any" ON public.documents
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );

-- Políticas RLS para document_shares
CREATE POLICY "Users can view shares for their documents or shares with them" ON public.document_shares
  FOR SELECT TO authenticated USING (
    shared_by_user_id = auth.uid() OR 
    shared_with_user_id = auth.uid() OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Users can share their own documents" ON public.document_shares
  FOR INSERT TO authenticated WITH CHECK (
    shared_by_user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.documents WHERE id = document_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete shares for their documents" ON public.document_shares
  FOR DELETE TO authenticated USING (
    shared_by_user_id = auth.uid() OR public.is_admin(auth.uid())
  );

-- Políticas de storage para o bucket documents
CREATE POLICY "Users can upload documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can view accessible documents in storage" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'documents' AND
    public.can_access_document(
      (string_to_array(name, '/'))[1]::UUID,
      auth.uid()
    )
  );

CREATE POLICY "Users can delete their own documents from storage" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'documents' AND (
      auth.uid()::TEXT = (string_to_array(name, '/'))[1] OR
      public.is_admin(auth.uid())
    )
  );

-- Trigger para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    'user'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
