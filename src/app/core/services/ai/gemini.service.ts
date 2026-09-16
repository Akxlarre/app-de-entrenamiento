import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { McpClientService } from './mcp-client.service';
import { environment } from '../../../../environments/environment';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private http = inject(HttpClient);
  private mcpClient = inject(McpClientService);

  // Usamos la misma variable del environment, pero ahora será la clave de DeepSeek
  private apiKey = environment.geminiApiKey || '';

  // Declaración de Tools en formato OpenAI / Groq
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
          'Obtiene el historial de sesiones de entrenamiento pasadas/finalizadas del usuario autenticado, indicando si pertenecieron a una rutina.',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Número de sesiones a consultar (default: 5)' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'obtener_series_de_entrenamiento',
        description:
          'Obtiene las series, repeticiones, peso y RIR de una sesión de entrenamiento específica pasada.',
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
          'Crea una nueva plantilla de rutina de entrenamiento para el usuario en la base de datos con los ejercicios especificados.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Nombre claro de la rutina (Ej: Empuje A - Hipertrofia Pecho y Tríceps)',
            },
            notes: { type: 'string', description: 'Descripción o notas explicativas de la rutina' },
            exercises: {
              type: 'array',
              description:
                'Lista de ejercicios a incluir en la rutina. IMPORTANTE: Usa primero buscar_ejercicios para obtener los UUIDs reales.',
              items: {
                type: 'object',
                properties: {
                  exercise_id: {
                    type: 'string',
                    description: 'UUID del ejercicio en la base de datos',
                  },
                  order_index: {
                    type: 'number',
                    description: 'Orden en la rutina (0 para el primero, 1 para el segundo, etc.)',
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
        name: 'eliminar_rutina',
        description: 'Elimina una plantilla de rutina del usuario por su UUID.',
        parameters: {
          type: 'object',
          properties: {
            routine_id: { type: 'string', description: 'UUID de la rutina a eliminar' },
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
          'Obtiene el historial de feedback (dolor, técnica, intensidad) reportado por el usuario en ejercicios específicos.',
        parameters: {
          type: 'object',
          properties: {
            exercise_id: {
              type: 'string',
              description: 'UUID del ejercicio a analizar (opcional)',
            },
            limit: { type: 'number', description: 'Número máximo de reportes (default: 10)' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'buscar_ejercicios',
        description:
          'Busca ejercicios en el catálogo maestro de la app por término o grupo muscular para encontrar sus UUIDs.',
        parameters: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Término de búsqueda (ej: press, sentadilla, bicep)',
            },
            muscle: {
              type: 'string',
              description: 'Grupo muscular opcional (ej: chest, legs, back, shoulders)',
            },
            limit: { type: 'number', description: 'Número máximo de resultados (default: 10)' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'analizar_volumen_muscular',
        description:
          'Calcula las series efectivas completadas y el tonelaje total por grupo muscular en los últimos días.',
        parameters: {
          type: 'object',
          properties: {
            days_ago: {
              type: 'number',
              description: 'Cantidad de días hacia atrás a analizar. Default: 7',
            },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'analizar_progresion_ejercicio',
        description:
          'Evalúa la progresión histórica (hasta 10 sesiones) en un ejercicio específico calculando 1RM estimado y RIR promedio.',
        parameters: {
          type: 'object',
          properties: {
            exercise_id: {
              type: 'string',
              description:
                'UUID del ejercicio (búscalo con buscar_ejercicios primero si no lo tienes)',
            },
          },
          required: ['exercise_id'],
        },
      },
    },
  ];

  /**
   * Genera respuesta utilizando Groq API + bucle de Function Calling con el MCP Server
   */
  async generateResponse(history: ChatMessage[], prompt: string): Promise<string> {
    const nowIso = new Date().toISOString();
    const nowTimeStr = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Formato de mensajes OpenAI / Groq con System Prompt de Alto Rendimiento
    const messages: any[] = [
      {
        role: 'system',
        content: `Eres el Coach de Entrenamiento Personal IA de esta aplicación, experto en fisiología del ejercicio, biomecánica y entrenamiento de fuerza e hipertrofia basado en evidencia científica.

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
      ...history.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      })),
      { role: 'user', content: prompt },
    ];

    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    });

    try {
      let body: any = {
        model: 'qwen/qwen3.8-27b',
        messages,
        tools: this.toolsDeclaration,
        tool_choice: 'auto',
        max_tokens: 1500,
      };

      // 1. Primera llamada a Groq
      let res: any = await firstValueFrom(this.http.post(url, body, { headers }));
      let responseMessage = res?.choices?.[0]?.message;

      // 2. Bucle de resolución de Function Calls (MCP)
      while (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        messages.push(responseMessage); // Guardamos la intención de llamar la herramienta

        // Ejecutar cada tool call
        for (const toolCall of responseMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

          let toolResultText: string;
          try {
            toolResultText = await this.mcpClient.callTool(toolName, toolArgs);
          } catch (toolErr: any) {
            toolResultText = this.extractToolErrorMessage(toolErr);
          }

          // Añadir el resultado de la función al contexto
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResultText,
          });
        }

        // Llamar a la IA nuevamente con el resultado de las herramientas
        body = {
          model: 'qwen/qwen3.8-27b',
          messages,
          tools: this.toolsDeclaration,
          tool_choice: 'auto',
          max_tokens: 1500,
        };
        res = await firstValueFrom(this.http.post(url, body, { headers }));
        responseMessage = res?.choices?.[0]?.message;
      }

      return responseMessage?.content || 'Lo siento, no pude procesar la solicitud.';
    } catch (err: any) {
      console.error('[Groq API] Error:', err);
      if (err?.status === 429) {
        const retryAfter = err?.headers?.get?.('retry-after') || err?.error?.error?.message;
        return `⚠️ **Límite de solicitudes de Groq alcanzado (429 - Rate Limit)**.\n\nGroq tiene un límite gratuito de tokens/solicitudes por minuto para este modelo. Por favor espera unos segundos e intenta nuevamente${retryAfter ? ` (${retryAfter})` : ''}.`;
      }
      return 'Hubo un inconveniente al comunicarme con tu Coach (Groq). Verifica tu API Key o conexión.';
    }
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
