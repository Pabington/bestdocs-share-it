import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

interface UploadValidationRequest {
  fileName: string
  fileSize: number
  fileType: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Configurações de validação
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MIN_FILE_SIZE = 1024 // 1KB

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.app', '.deb', '.pkg', '.dmg', '.run', '.sh', '.ps1', '.msi'
]

function sanitizeFileName(fileName: string): string {
  // Remove caracteres perigosos e mantem apenas letras, números, pontos, hífens e underscores
  let sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  
  // Remove múltiplos underscores consecutivos
  sanitized = sanitized.replace(/_+/g, '_')
  
  // Remove underscores no início e fim
  sanitized = sanitized.replace(/^_+|_+$/g, '')
  
  // Garante que tem pelo menos um caractere
  if (!sanitized || sanitized.length === 0) {
    sanitized = 'arquivo_' + Date.now()
  }
  
  return sanitized
}

function validateFileType(fileName: string, mimeType: string): { valid: boolean; error?: string } {
  // Verificar extensão perigosa
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  if (DANGEROUS_EXTENSIONS.some(ext => extension.endsWith(ext))) {
    return { valid: false, error: 'Tipo de arquivo não permitido por questões de segurança' }
  }
  
  // Verificar MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Tipo de arquivo não suportado: ${mimeType}` }
  }
  
  return { valid: true }
}

function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `Arquivo muito grande. Tamanho máximo: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` 
    }
  }
  
  if (size < MIN_FILE_SIZE) {
    return { 
      valid: false, 
      error: `Arquivo muito pequeno. Tamanho mínimo: ${Math.round(MIN_FILE_SIZE / 1024)}KB` 
    }
  }
  
  return { valid: true }
}

async function checkRateLimit(
  supabase: any, 
  userId: string | null, 
  ipAddress: string
): Promise<{ allowed: boolean; error?: string }> {
  try {
    // Verificar rate limit para uploads
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_action_type: 'upload',
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_max_attempts: 10, // 10 uploads por janela
      p_window_minutes: 15 // janela de 15 minutos
    })

    if (error) {
      console.error('Erro ao verificar rate limit:', error)
      return { allowed: true } // Em caso de erro, permite (fail-safe)
    }

    if (!data) {
      return { 
        allowed: false, 
        error: 'Muitas tentativas de upload. Tente novamente em alguns minutos.' 
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Erro ao verificar rate limit:', error)
    return { allowed: true } // Em caso de erro, permite (fail-safe)
  }
}

async function logAuditEvent(
  supabase: any,
  userId: string | null,
  actionType: string,
  details: any,
  ipAddress: string,
  userAgent?: string
) {
  try {
    await supabase.rpc('create_audit_log', {
      p_action_type: actionType,
      p_user_id: userId,
      p_resource_type: 'document',
      p_details: details,
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    })
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extrair informações do request
    const authHeader = req.headers.get('Authorization')
    const userAgent = req.headers.get('User-Agent') || ''
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    '127.0.0.1'

    // Verificar autenticação
    let userId: string | null = null
    if (authHeader) {
      const { data: { user }, error } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      if (!error && user) {
        userId = user.id
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verificar rate limit
    const rateLimitCheck = await checkRateLimit(supabase, userId, clientIP)
    if (!rateLimitCheck.allowed) {
      await logAuditEvent(
        supabase, userId, 'upload_rate_limit_exceeded', 
        { ip: clientIP }, clientIP, userAgent
      )
      
      return new Response(
        JSON.stringify({ error: rateLimitCheck.error }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { fileName, fileSize, fileType }: UploadValidationRequest = await req.json()

    // Validar dados de entrada
    if (!fileName || !fileSize || !fileType) {
      return new Response(
        JSON.stringify({ error: 'Dados de arquivo obrigatórios não fornecidos' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Sanitizar nome do arquivo
    const sanitizedFileName = sanitizeFileName(fileName)

    // Validar tipo de arquivo
    const typeValidation = validateFileType(fileName, fileType)
    if (!typeValidation.valid) {
      await logAuditEvent(
        supabase, userId, 'upload_validation_failed', 
        { fileName, fileType, error: typeValidation.error }, clientIP, userAgent
      )
      
      return new Response(
        JSON.stringify({ error: typeValidation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar tamanho do arquivo
    const sizeValidation = validateFileSize(fileSize)
    if (!sizeValidation.valid) {
      await logAuditEvent(
        supabase, userId, 'upload_validation_failed', 
        { fileName, fileSize, error: sizeValidation.error }, clientIP, userAgent
      )
      
      return new Response(
        JSON.stringify({ error: sizeValidation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log de validação bem-sucedida
    await logAuditEvent(
      supabase, userId, 'upload_validation_success', 
      { fileName: sanitizedFileName, fileSize, fileType }, clientIP, userAgent
    )

    return new Response(
      JSON.stringify({ 
        valid: true, 
        sanitizedFileName,
        message: 'Arquivo válido para upload'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na validação de upload:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})