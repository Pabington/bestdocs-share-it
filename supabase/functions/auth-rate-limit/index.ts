import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

interface AuthRateLimitRequest {
  action: 'login' | 'signup' | 'reset_password'
  email?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Configurações de rate limiting por ação
const RATE_LIMITS = {
  login: { maxAttempts: 5, windowMinutes: 15 },
  signup: { maxAttempts: 3, windowMinutes: 60 },
  reset_password: { maxAttempts: 3, windowMinutes: 60 }
}

async function checkAuthRateLimit(
  supabase: any, 
  action: string,
  email: string | null,
  ipAddress: string
): Promise<{ allowed: boolean; error?: string; remainingAttempts?: number }> {
  try {
    const limits = RATE_LIMITS[action as keyof typeof RATE_LIMITS]
    if (!limits) {
      return { allowed: true }
    }

    // Verificar rate limit por IP
    const { data: ipAllowed, error: ipError } = await supabase.rpc('check_rate_limit', {
      p_action_type: `auth_${action}_ip`,
      p_ip_address: ipAddress,
      p_max_attempts: limits.maxAttempts,
      p_window_minutes: limits.windowMinutes
    })

    if (ipError) {
      console.error('Erro ao verificar rate limit por IP:', ipError)
      return { allowed: true } // Em caso de erro, permite (fail-safe)
    }

    if (!ipAllowed) {
      return { 
        allowed: false, 
        error: `Muitas tentativas de ${action}. Tente novamente em ${limits.windowMinutes} minutos.`
      }
    }

    // Se temos email, verificar rate limit por email também
    if (email) {
      // Usar hash do email para não armazenar email em texto plano na tabela de rate limits
      const emailHash = await crypto.subtle.digest(
        'SHA-256', 
        new TextEncoder().encode(email.toLowerCase())
      )
      const emailHashHex = Array.from(new Uint8Array(emailHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const { data: emailAllowed, error: emailError } = await supabase.rpc('check_rate_limit', {
        p_action_type: `auth_${action}_email`,
        p_user_id: null,
        p_ip_address: null,
        p_max_attempts: limits.maxAttempts * 2, // Limite mais generoso por email
        p_window_minutes: limits.windowMinutes
      })

      if (emailError) {
        console.error('Erro ao verificar rate limit por email:', emailError)
      } else if (!emailAllowed) {
        return { 
          allowed: false, 
          error: `Muitas tentativas para este email. Tente novamente em ${limits.windowMinutes} minutos.`
        }
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Erro ao verificar rate limit:', error)
    return { allowed: true } // Em caso de erro, permite (fail-safe)
  }
}

async function logAuthEvent(
  supabase: any,
  action: string,
  success: boolean,
  email: string | null,
  ipAddress: string,
  userAgent?: string,
  errorDetails?: any
) {
  try {
    await supabase.rpc('create_audit_log', {
      p_action_type: `auth_${action}`,
      p_user_id: null,
      p_resource_type: 'auth',
      p_details: {
        success,
        email: email ? '***masked***' : null, // Não logar email por privacidade
        error: errorDetails,
        timestamp: new Date().toISOString()
      },
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
    const userAgent = req.headers.get('User-Agent') || ''
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    '127.0.0.1'

    // Parse request body
    const { action, email }: AuthRateLimitRequest = await req.json()

    // Validar ação
    if (!action || !Object.keys(RATE_LIMITS).includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Ação inválida' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verificar rate limit
    const rateLimitCheck = await checkAuthRateLimit(supabase, action, email, clientIP)
    
    if (!rateLimitCheck.allowed) {
      // Log da tentativa bloqueada
      await logAuthEvent(
        supabase, action, false, email, clientIP, userAgent,
        { reason: 'rate_limit_exceeded' }
      )
      
      return new Response(
        JSON.stringify({ 
          allowed: false,
          error: rateLimitCheck.error 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log da tentativa permitida
    await logAuthEvent(
      supabase, action, true, email, clientIP, userAgent
    )

    return new Response(
      JSON.stringify({ 
        allowed: true,
        message: 'Ação permitida'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na verificação de rate limit de auth:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})