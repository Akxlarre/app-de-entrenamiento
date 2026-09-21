// ============================================================================
// GEMINI PROXY — Edge Function
// ============================================================================
// Existe para que la API key de Gemini no viaje al navegador. Antes
// GeminiService llamaba directo a generativelanguage.googleapis.com con la
// clave inyectada en build, o sea que quedaba en el bundle y cualquiera la
// extraía desde devtools.
//
// Es un passthrough deliberadamente delgado: verifica el JWT del usuario,
// reenvía el body tal cual y devuelve la respuesta tal cual, incluido el
// stream SSE. No decide modelo ni herramientas — eso sigue siendo del cliente,
// así que el fallback de modelo y el manejo de errores del front no cambian.
//
// Secreto requerido:
//   npx supabase secrets set GEMINI_API_KEY=...

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Verifica el JWT del usuario. Mismo patrón que mcp-server. */
async function authenticateUser(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '').trim();

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    console.error('[Gemini Proxy Auth Error]:', error?.message);
    return null;
  }

  return user;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Método no permitido' } }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // 1. Sin sesión válida no se gasta cuota.
  const user = await authenticateUser(req.headers.get('Authorization'));
  if (!user) {
    return new Response(
      JSON.stringify({ error: { message: 'No autorizado: falta una sesión válida.' } }),
      { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }

  if (!geminiApiKey) {
    console.error('[Gemini Proxy] GEMINI_API_KEY no está configurada');
    return new Response(
      JSON.stringify({
        error: { message: 'El proxy de Gemini no tiene GEMINI_API_KEY configurada.' },
      }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.text();

    const upstream = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${geminiApiKey}`,
      },
      body,
    });

    // Passthrough del stream: devolvemos el body de upstream sin consumirlo,
    // para que el SSE siga llegando token a token al cliente. Se preserva el
    // status para que el manejo de 429/503/401 del front siga valiendo.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...cors,
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[Gemini Proxy] Error reenviando a Gemini:', err);
    return new Response(
      JSON.stringify({ error: { message: 'Error contactando a Gemini: ' + String(err) } }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
