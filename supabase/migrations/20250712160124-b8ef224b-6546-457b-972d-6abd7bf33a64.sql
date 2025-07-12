-- Create authorized_emails table
CREATE TABLE public.authorized_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  added_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;

-- Create policies for authorized_emails
CREATE POLICY "Only admins can view authorized emails" 
ON public.authorized_emails 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can add authorized emails" 
ON public.authorized_emails 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()) AND auth.uid() = added_by);

CREATE POLICY "Only admins can delete authorized emails" 
ON public.authorized_emails 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Create function to check if email is authorized
CREATE OR REPLACE FUNCTION public.is_email_authorized(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.authorized_emails 
    WHERE LOWER(email) = LOWER(check_email)
  );
$$;