import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { McpClientService } from './mcp-client.service';
import { environment } from '../../../../environments/environment';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  imageBase64?: string;
  timestamp: Date;
}

export type ChatStreamEvent =
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_end'; toolName: string }
  | { type: 'chunk'; text: string }
  | { type: 'error'; text: string };

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private http = inject(HttpClient);
  private mcpClient = inject(McpClientService);

  // API Key de Gemini (Google AI Studio)
  private apiKey = environment.geminiApiKey || '';

  // Declaración de Tools en formato OpenAI-compatible (Gemini v1beta)
  private toolsDeclaration = [
    {
      type: 'function',
      function: {
        name: 'obtener_entrenamiento_en_curso',
        description:
          'Obtiene la sesión de entrenamiento ACTIVA actual del usuario (en vivo), incluyendo si proviene de una rutina guardada, hora de inicio, ejercicios, series completadas, pesos, reps, RIR y timestamps (completed_at) para calcular el descanso exacto.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'obtener_mis_rutinas',
        description:
          'Obtiene la lista de plantillas de rutinas del usuario autenticado, incluyendo los ejercicios que componen cada una con sus nombres, orden, grupos musculares y notas.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'obtener_mis_entrenamientos_recientes',
        description:
          'Obtiene el historial de sesiones pasadas del usuario. Útil para saber qué días entrenó, cuánto duró cada sesión, el nivel de energía, RPE general de la sesión y a qué rutina corresponde.',
        parameters: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Cantidad de entrenamientos a devolver (por defecto 5)',
            },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'obtener_series_de_entrenamiento',
        description:
          'Obtiene el detalle profundo de un entrenamiento pasado específico (workout_id): qué ejercicios se hicieron, cuántas series, repeticiones, peso (kg) y el RIR en cada serie.',
        parameters: {
          type: 'object',
          properties: {
            workout_id: { type: 'string', description: 'UUID del entrenamiento' },
          },
          required: ['workout_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'crear_rutina',
        description:
          'Crea y guarda una nueva plantilla de rutina en la base de datos del usuario. REQUIERE usar buscar_ejercicios antes para obtener los UUID (exercise_id) reales del catálogo.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nombre llamativo de la rutina' },
            notes: { type: 'string', description: 'Pautas de descanso, RIR, etc.' },
            exercises: {
              type: 'array',
              description: 'Lista de ejercicios a incluir',
              items: {
                type: 'object',
                properties: {
                  exercise_id: { type: 'string', description: 'UUID del ejercicio del catálogo' },
                  order_index: {
                    type: 'number',
                    description: 'Orden en la rutina empezando desde 0',
                  },
                },
                required: ['exercise_id'],
              },
            },
          },
          required: ['name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'guardar_recuerdo',
        description: 'Guarda un hecho importante o preferencia del usuario a largo plazo para futuras sesiones (lesiones, gustos, limitaciones).',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', description: "Categoría: 'injury', 'preference', 'goal', 'limitation' u 'other'." },
            content: { type: 'string', description: "Hecho concreto. Ejemplo: 'Le duele la rodilla al hacer sentadilla pesada'." },
          },
          required: ['category', 'content'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'eliminar_recuerdo',
        description: 'Elimina un recuerdo del usuario, por ejemplo, si reporta que ya se curó de una lesión.',
        parameters: {
          type: 'object',
          properties: {
            memory_id: { type: 'string', description: 'El ID UUID del recuerdo a eliminar.' },
          },
          required: ['memory_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'eliminar_rutina',
        description: 'Elimina una plantilla de rutina del usuario usando su UUID (routine_id).',
        parameters: {
          type: 'object',
          properties: {
            routine_id: { type: 'string', description: 'UUID de la rutina' },
          },
          required: ['routine_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'analizar_historial_feedback',
        description:
          'Analiza si el usuario ha reportado dolor intenso, molestia o mala técnica en las últimas semanas (general o filtrado por un ejercicio).',
        parameters: {
          type: 'object',
          properties: {
            exercise_id: {
              type: 'string',
              description: 'Opcional. UUID del ejercicio para filtrar.',
            },
            limit: {
              type: 'number',
              description: 'Cantidad de registros recientes a revisar (default: 10)',
            },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'buscar_ejercicios',
        description:
          'Busca ejercicios en el catálogo global por nombre o grupo muscular para obtener sus UUIDs exactos. Indispensable antes de crear rutinas o analizar progresiones de ejercicios específicos.',
        parameters: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Término de búsqueda (ej: "Sentadilla")' },
            muscle: {
              type: 'string',
              description: 'Grupo muscular en inglés (chest, back, legs, shoulders, arms, core)',
            },
            limit: { type: 'number', description: 'Límite de resultados (default 10)' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'analizar_volumen_muscular',
        description:
          'Calcula el volumen de entrenamiento (series efectivas y tonelaje total en kg) agrupado por grupo muscular en los últimos X días. Útil para detectar sobreentrenamiento o subentrenamiento.',
        parameters: {
          type: 'object',
          properties: {
            days_ago: { type: 'number', description: 'Días hacia atrás a analizar (default: 7)' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'analizar_progresion_ejercicio',
        description:
          'Calcula y devuelve la evolución del 1RM (Repetición Máxima) estimado, volumen y RIR medio de un ejercicio específico a lo largo de las sesiones. REQUIERE UUID del ejercicio.',
        parameters: {
          type: 'object',
          properties: {
            exercise_id: { type: 'string', description: 'UUID del ejercicio del catálogo' },
          },
          required: ['exercise_id'],
        },
      },
    },
  ];

  /**
   * Genera respuesta utilizando Gemini API + bucle de Function Calling con el MCP Server
   * Utiliza Streaming (SSE) para emitir texto y estados progresivamente a la UI.
   */
  async *generateResponseStream(history: ChatMessage[], prompt: string, imageBase64?: string, userMemories: string = ''): AsyncGenerator<ChatStreamEvent, void, unknown> {
    const nowIso = new Date().toISOString();
    const nowTimeStr = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const memorySection = userMemories ? `\n🧠 MEMORIA A LARGO PLAZO DEL USUARIO:\n${userMemories}\n` : '';

    // Formato de mensajes OpenAI-compatible (Gemini) con System Prompt de Alto Rendimiento
    const messages: any[] = [
      {
        role: 'system',
        content: `Eres el Coach de Entrenamiento Personal IA de esta aplicación, experto en fisiología del ejercicio, biomecánica y entrenamiento de fuerza e hipertrofia basado en evidencia científica.
${memorySection}
⏱️ CONTEXTO TEMPORAL ACTUAL:
- Timestamp UTC: ${nowIso}
- Hora actual local: ${nowTimeStr}

🛠️ HERRAMIENTAS Y REGLAS DE EJECUCIÓN (MCP):
1. Si el usuario pregunta por su sesión actual ("¿cómo voy?", "¿cuánto he descansado?", "mi sesión", "mi entrenamiento de hoy", "qué me toca"):
   - Llama SIEMPRE primero a 'obtener_entrenamiento_en_curso'.
   - Si no hay sesión activa, indícaselo amablemente y sugiere revisar su historial ('obtener_mis_entrenamientos_recientes') o sus rutinas guardadas ('obtener_mis_rutinas').
2. Para calcular el TIEMPO DE DESCANSO:
   - Toma el 'completed_at' de la última serie completada y réstalo de la hora actual (${nowIso}).
   - Comunica el descanso de forma útil y natural (ej: "Llevas 2 min y 15 seg descansando desde tu última serie").
3. GESTIÓN Y CREACIÓN DE RUTINAS:
   - Para ver o analizar rutinas del usuario: llama a 'obtener_mis_rutinas' (te devuelve los ejercicios que contiene, músculos y orden).
   - Si el usuario te pide crear o diseñar una rutina:
     a) Primero busca los ejercicios en el catálogo con 'buscar_ejercicios' para obtener sus UUIDs exactos ('exercise_id').
     b) Luego llama a 'crear_rutina' enviando el nombre, notas y el array 'exercises' con los IDs y sus 'order_index' (0, 1, 2...).
     c) Confírmale al usuario que la rutina ha sido guardada en su cuenta y que ya puede verla y seleccionarla en la pantalla de Entrenar.
   - Si el usuario te pide borrar una rutina: llama a 'obtener_mis_rutinas' si no tienes su UUID, y luego llama a 'eliminar_rutina' con su 'routine_id'.
4. ANÁLISIS DE DATOS Y PROGRESO:
   - Cuando el usuario pregunte sobre estancamientos, fatiga o falta de progreso, utiliza 'analizar_volumen_muscular' para revisar si está sobreentrenando (volumen excesivo) o subentrenando.
   - Utiliza 'analizar_progresion_ejercicio' (buscando primero el exercise_id con 'buscar_ejercicios') para evaluar la evolución del 1RM estimado y el RIR en un ejercicio particular a lo largo del tiempo.
5. GESTIÓN DE FEEDBACK Y DOLOR:
   - Antes de recomendar subir de peso o volumen en un ejercicio, verifica si el usuario ha reportado molestia o mala técnica usando 'analizar_historial_feedback'.
   - Si el usuario reporta una baja 'energy_level' o alto 'session_rpe' en su sesión, adapta tus recomendaciones para incluir más descanso o una semana de descarga (deload).
   - Si hay dolor recurrente (category: 'pain'), sugiere reducir la intensidad, cambiar a una variante distinta, o consultar a un profesional.
6. VISIÓN Y MULTIMODALIDAD:
   - Si el usuario te envía una imagen de una máquina, ejercicio o etiqueta nutricional, analízala en detalle. Si es una máquina, identifica qué es y qué músculos trabaja.
7. MEMORIA A LARGO PLAZO:
   - Si el usuario menciona una nueva lesión, preferencia o limitación que debes recordar permanentemente, usa 'guardar_recuerdo'.
   - Si el usuario menciona que ya no tiene una lesión o preferencia, usa 'eliminar_recuerdo' pasándole el ID exacto que verás en la sección MEMORIA A LARGO PLAZO.

🎯 FILOSOFÍA DE ANÁLISIS Y TONO:
- Tono: Profesional, directo, motivador pero riguroso (ideal para leer entre descansos sin perder tiempo).
- Interpretación de RIR (Repeticiones en Reserva):
  * RIR 0-1: Máximo esfuerzo/fallo técnico. Si quedan series, alerta sobre fatiga neuromuscular y sugiere descansar 2.5 - 3 min.
  * RIR 2-3: Zona óptima de hipertrofia con fatiga controlada.
  * RIR 4+: Estímulo submáximo o calentamiento. Sugiere subir ligeramente el peso si era una serie efectiva de trabajo.
- Sobrecarga progresiva: Da pautas accionables (ej: "En la próxima serie mantén el peso y busca 10 reps" o "Si sacas 12 reps con RIR 3, ya es hora de subir 1.25 o 2.5 kg").

📋 FORMATO DE RESPUESTA (ELEGANTE Y LIMPIO):
- Sé sumamente legible y directo.
- NO abuses de asteriscos dobles ni símbolos extraños. Usa negritas solo para palabras clave (ej: **100 kg**, **RIR 2**, **2 minutos**).
- No uses guiones dobles (\`--\`). Usa viñetas simples (\`- \`) para listar puntos.
- Para tablas de series o rutinas, usa tablas markdown limpias (| Orden | Ejercicio | Músculo |).
- Concluye siempre con un 'Siguiente paso' o recomendación accionable.`,
      },
      ...history.map((m) => {
        if (m.imageBase64 && m.sender === 'user') {
          return {
            role: 'user',
            content: [
              { type: 'text', text: m.text },
              { type: 'image_url', image_url: { url: m.imageBase64 } }
            ]
          };
        }
        return {
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        };
      }),
    ];

    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    });

    try {
      let requiresMoreTools = true;
      const hasImage = !!imageBase64 || history.some(m => !!m.imageBase64);
      let currentModel = hasImage ? 'gemini-3.5-flash' : 'gemini-3.1-flash-lite';
      
      while (requiresMoreTools) {
        let body: any = {
          model: currentModel,
          messages,
          tools: this.toolsDeclaration,
          tool_choice: 'auto',
          max_tokens: 1500,
        };

        // En fase de tools, NO usamos stream porque complicaría el parseo del JSON
        let res: any;
        try {
          res = await this.postWithRetry(url, body, headers);
        } catch (err: any) {
          if ((err?.status === 429 || err?.status === 403 || err?.status === 503) && currentModel !== 'gemini-3.1-flash-lite') {
            console.warn(`[Gemini API] Error ${err?.status} en ${currentModel}, haciendo fallback a gemini-3.1-flash-lite`);
            currentModel = 'gemini-3.1-flash-lite';
            body.model = currentModel;
            res = await this.postWithRetry(url, body, headers);
          } else {
            throw err;
          }
        }

        const responseMessage = res?.choices?.[0]?.message;

        if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
          messages.push(responseMessage); // Guardamos la intención

          for (const toolCall of responseMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
            
            yield { type: 'tool_start', toolName };
            
            let toolResultText: string;
            try {
              toolResultText = await this.mcpClient.callTool(toolName, toolArgs);
            } catch (toolErr: any) {
              toolResultText = this.extractToolErrorMessage(toolErr);
            }
            
            yield { type: 'tool_end', toolName };

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: toolResultText,
            });
          }
        } else {
          // Ya no requiere tools, pasamos a procesar el stream final de texto
          requiresMoreTools = false;

          // Hacemos una última llamada pero esta vez con stream = true
          body.model = currentModel;
          body.stream = true;
          
          let fetchRes: Response | undefined;
          let fetchErr: any;

          // Usamos la misma lógica de reintento para el fetch
          for (let attempt = 0; attempt <= 3; attempt++) {
            try {
              fetchRes = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(body),
              });

              if (fetchRes.ok) break; // Si está ok, salimos del reintento

              const status = fetchRes.status;
              if (status === 429 || status === 403 || status === 503) {
                if (currentModel !== 'gemini-3.1-flash-lite') {
                  console.warn(`[Gemini API Stream] Error ${status} en ${currentModel}, haciendo fallback a gemini-3.1-flash-lite`);
                  currentModel = 'gemini-3.1-flash-lite';
                  body.model = currentModel;
                  continue; // Reintentar inmediatamente con el nuevo modelo
                }
              }

              if (status !== 429 && status !== 503) {
                // Parseamos el error para lanzarlo y que lo agarre el catch general
                const errorData = await fetchRes.json().catch(() => null);
                throw { status, error: errorData };
              }
              
              if (attempt === 3) throw { status, error: { message: 'Max retries reached' } };
              
              const delay = Math.pow(2, attempt + 1) * 1000;
              await new Promise((r) => setTimeout(r, delay));
            } catch (e: any) {
              if (attempt === 3) throw e;
              const delay = Math.pow(2, attempt + 1) * 1000;
              await new Promise((r) => setTimeout(r, delay));
            }
          }

          if (!fetchRes || !fetchRes.body) throw new Error('No stream available');

          const reader = fetchRes.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let done = false;

          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
              const chunkText = decoder.decode(value, { stream: true });
              // Las respuestas vienen separadas por saltos de línea con prefijo "data: "
              const lines = chunkText.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                  const dataStr = line.slice(6);
                  try {
                    const parsed = JSON.parse(dataStr);
                    const token = parsed.choices?.[0]?.delta?.content;
                    if (token) {
                      yield { type: 'chunk', text: token };
                    }
                  } catch (e) {
                    // Ignorar errores de parseo en chunks incompletos
                  }
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[Gemini API] Error:', err);
      let errorMsg = 'Hubo un inconveniente al comunicarme con tu Coach (Gemini). Verifica tu API Key o conexión.';
      if (err?.status === 429) {
        let retryAfter = '';
        try {
          retryAfter = err?.headers?.get('retry-after') || err?.error?.error?.message || '';
        } catch(e) {}
        errorMsg = `⚠️ **Límite de solicitudes de Gemini alcanzado (429 - Rate Limit)**.\n\nEl free tier de Gemini tiene un límite de tokens/solicitudes por minuto. Por favor espera unos segundos e intenta nuevamente${retryAfter ? ` (${retryAfter})` : ''}.`;
      }
      if (err?.status === 503) {
        errorMsg = '⚠️ **Gemini está experimentando alta demanda**.\n\nEl servidor está temporalmente saturado. Espera unos segundos e intenta de nuevo — suele resolverse rápido.';
      }
      yield { type: 'error', text: errorMsg };
    }
  }

  /**
   * Genera respuesta (compatibilidad con tests o llamadas antiguas). No recomendado para UI.
   */
  async generateResponse(history: ChatMessage[], prompt: string): Promise<string> {
    let finalContent = '';
    const generator = this.generateResponseStream(history, prompt);
    for await (const event of generator) {
      if (event.type === 'chunk' || event.type === 'error') {
        finalContent += event.text;
      }
    }
    return finalContent || 'Lo siento, no pude procesar la solicitud.';
  }

  /**
   * POST con retry automático y backoff exponencial para errores transitorios (503, 429).
   * Máximo 3 reintentos con delays de 2s, 4s, 8s.
   */
  private async postWithRetry(url: string, body: any, headers: HttpHeaders, maxRetries = 3): Promise<any> {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await firstValueFrom(this.http.post(url, body, { headers }));
      } catch (err: any) {
        lastError = err;
        const status = err?.status;

        // Optimización Smart Routing: Si es 429/403 y usamos el modelo premium,
        // abortamos el retry interno al instante para hacer el fallback rápido al Lite.
        if ((status === 429 || status === 403) && body.model === 'gemini-3.5-flash') {
          throw err;
        }

        const isRetryable = status === 503 || status === 429;

        if (!isRetryable || attempt === maxRetries) {
          throw err;
        }

        // Backoff exponencial: 2s, 4s, 8s
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.warn(`[Gemini API] ${status} en intento ${attempt + 1}/${maxRetries + 1}. Reintentando en ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  /**
   * Extrae el mensaje de error de una herramienta MCP fallida para pasárselo al modelo.
   * La Edge Function responde `{ error: String(err) }`, que Angular expone en
   * `HttpErrorResponse.error.error` con el prefijo "Error: " que agrega `String(new Error(...))`.
   */
  private extractToolErrorMessage(err: any): string {
    const rawMessage = err?.error?.error;
    if (typeof rawMessage === 'string' && rawMessage.trim().length > 0) {
      return rawMessage.replace(/^Error:\s*/, '');
    }
    return 'La herramienta no pudo completarse. Intenta reformular la solicitud.';
  }
}

