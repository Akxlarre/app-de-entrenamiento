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

// ── Adjuntos ────────────────────────────────────────────────────────────────
// La capa OpenAI-compat de Gemini acepta texto, imágenes y audio, pero NO
// documentos. El cliente manda el archivo como una parte `input_document`
// (convención nuestra) y acá se reemplaza por su texto antes de reenviar, así
// el resto del protocolo —streaming, herramientas, errores— no cambia.

const MAX_DOC_BYTES = 10 * 1024 * 1024;
const MAX_DOC_CHARS = 200_000;

const PLAIN_TEXT_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/xml',
  'application/xml',
];

function isPlainText(mime: string, name: string): boolean {
  if (PLAIN_TEXT_TYPES.includes(mime) || mime.startsWith('text/')) return true;
  return /\.(txt|md|csv|json|xml|log)$/i.test(name);
}

function isPdf(mime: string, name: string): boolean {
  return mime === 'application/pdf' || /\.pdf$/i.test(name);
}

/** Separa el base64 de una data URL (`data:<mime>;base64,<...>`). */
function decodeDataUrl(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function clamp(text: string, name: string): string {
  if (text.length <= MAX_DOC_CHARS) return text;
  return (
    text.slice(0, MAX_DOC_CHARS) +
    `\n\n[...] Documento "${name}" truncado en ${MAX_DOC_CHARS} caracteres. Pedile al usuario que acote el archivo si necesitás el resto.`
  );
}

/**
 * Extrae el texto de un documento. Lanza con un mensaje accionable si no puede,
 * y el llamador lo convierte en una respuesta de error entendible.
 */
async function extractDocumentText(doc: {
  name?: string;
  mime_type?: string;
  data?: string;
}): Promise<string> {
  const name = doc?.name ?? 'documento';
  const mime = doc?.mime_type ?? '';
  if (!doc?.data) throw new Error(`El documento "${name}" llegó vacío.`);

  const bytes = decodeDataUrl(doc.data);
  if (bytes.byteLength > MAX_DOC_BYTES) {
    throw new Error(
      `El documento "${name}" pesa más de ${
        MAX_DOC_BYTES / (1024 * 1024)
      } MB. Probá con uno más liviano.`
    );
  }

  if (isPlainText(mime, name)) {
    return clamp(new TextDecoder().decode(bytes), name);
  }

  if (isPdf(mime, name)) {
    // unpdf funciona en Deno/edge sin binarios nativos. Import dinámico para
    // no pagar la descarga en los mensajes que no llevan PDF.
    const { extractText, getDocumentProxy } = await import('npm:unpdf@0.12.1');
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const plano = (Array.isArray(text) ? text.join('\n') : text ?? '').trim();
    if (!plano) {
      throw new Error(
        `No se pudo leer texto de "${name}". Si es un PDF escaneado, necesita OCR: probá mandando una foto de la página.`
      );
    }
    return clamp(plano, name);
  }

  throw new Error(
    `No puedo leer archivos de tipo "${
      mime || 'desconocido'
    }" (${name}). Por ahora acepto PDF, texto plano, Markdown, CSV y JSON; para otros formatos, mandá una captura de pantalla.`
  );
}

/**
 * Recorre los mensajes y reemplaza cada parte `input_document` por el texto
 * extraído. Devuelve el cuerpo listo para Gemini.
 */
async function resolveDocuments(body: any): Promise<any> {
  if (!Array.isArray(body?.messages)) return body;

  for (const msg of body.messages) {
    if (!Array.isArray(msg?.content)) continue;

    for (let i = 0; i < msg.content.length; i++) {
      const part = msg.content[i];
      if (part?.type !== 'input_document') continue;

      const doc = part.input_document ?? {};
      const texto = await extractDocumentText(doc);
      msg.content[i] = {
        type: 'text',
        text: `--- Contenido del documento adjunto "${
          doc.name ?? 'documento'
        }" ---\n${texto}\n--- Fin del documento ---`,
      };
    }
  }

  return body;
}

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
    const rawBody = await req.text();

    // Si el mensaje trae un documento adjunto, lo convertimos a texto antes de
    // reenviar. Un fallo acá es del usuario (formato no soportado, PDF
    // escaneado), así que se responde 400 con el motivo en vez de un 502 opaco.
    let body = rawBody;
    try {
      const parsed = JSON.parse(rawBody);
      const tieneDocumento = JSON.stringify(parsed).includes('input_document');
      if (tieneDocumento) {
        body = JSON.stringify(await resolveDocuments(parsed));
      }
    } catch (docErr) {
      const message = docErr instanceof Error ? docErr.message : String(docErr);
      console.error('[Gemini Proxy] Error procesando el adjunto:', message);
      return new Response(JSON.stringify({ error: { message } }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

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
