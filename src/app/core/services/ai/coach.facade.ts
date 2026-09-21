import { inject, Injectable, signal } from '@angular/core';
import { ChatAttachment, ChatMessage, GeminiService } from './gemini.service';
import { UserMemoryFacade } from '../user-memory.facade';
import { RoutineFacade } from '@core/facades/routine.facade';

@Injectable({
  providedIn: 'root',
})
export class CoachFacade {
  private geminiService = inject(GeminiService);
  private memoryFacade = inject(UserMemoryFacade);
  private routineFacade = inject(RoutineFacade);

  // Estado reactivo con Signals
  readonly messages = signal<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: '¡Hola! Soy tu Coach de Entrenamiento personal. ¿En qué te puedo ayudar hoy? Puedo revisar tus rutinas, analizar tu historial o recomendarte tu entrenamiento del día.',
      timestamp: new Date(),
    },
  ]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly isMemoryOpen = signal<boolean>(false);
  readonly toolStatus = signal<string | null>(null);

  // Expose memory facade state
  readonly memories = this.memoryFacade.memories;

  constructor() {
    this.memoryFacade.loadMemories();
  }

  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  toggleDrawer(): void {
    this.isDrawerOpen.update((open) => !open);
  }

  toggleMemory(): void {
    this.isMemoryOpen.update((v) => !v);
  }

  deleteMemory(id: string): void {
    this.memoryFacade.deleteMemory(id);
  }

  /**
   * Envía un mensaje del usuario al Coach y procesa la respuesta vía Streaming
   */
  async sendMessage(
    prompt: string,
    imageBase64?: string,
    document?: ChatAttachment
  ): Promise<void> {
    if (!prompt.trim() && !imageBase64 && !document) return;

    // Refrescar memorias silenciosamente por si se modificaron o eliminaron en UI
    this.memoryFacade.loadMemories();

    this.isLoading.set(true);
    this.toolStatus.set(null);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: prompt.trim() || (document ? `Documento adjunto: ${document.name}` : 'Imagen adjunta'),
      imageBase64,
      timestamp: new Date(),
    };

    // Añadimos el mensaje del usuario optimísticamente
    this.messages.update((msgs) => [...msgs, userMessage]);

    // Preparamos un mensaje vacío para el asistente que iremos llenando
    const assistantMessageId = crypto.randomUUID();
    this.messages.update((msgs) => [
      ...msgs,
      {
        id: assistantMessageId,
        sender: 'assistant',
        text: '',
        timestamp: new Date(),
      },
    ]);

    try {
      const trimmed =
        prompt.trim() ||
        (document
          ? `Analiza el documento adjunto (${document.name}).`
          : 'Analiza la imagen adjunta.');

      // Formatear memorias en texto plano para el LLM
      const mems = this.memoryFacade.memories();
      let memStr = '';
      if (mems.length > 0) {
        memStr = mems
          .map((m) => `- [ID: ${m.id}] [Categoría: ${m.category}]: ${m.content}`)
          .join('\n');
      }

      let routinesModified = false;
      let memoryModified = false;

      // Usamos el historial anterior (sin contar el userMessage recién agregado ni el assistant vacío)
      const historyToPass = this.messages().slice(0, -2);
      const stream = this.geminiService.generateResponseStream(
        historyToPass,
        trimmed,
        imageBase64,
        memStr,
        document
      );

      for await (const event of stream) {
        if (event.type === 'tool_start') {
          this.toolStatus.set(this.getFriendlyToolName(event.toolName));

          if (event.toolName === 'crear_rutina' || event.toolName === 'eliminar_rutina') {
            routinesModified = true;
          }
          if (event.toolName === 'guardar_recuerdo' || event.toolName === 'eliminar_recuerdo') {
            memoryModified = true;
          }
        } else if (event.type === 'tool_end') {
          this.toolStatus.set(null);
        } else if (event.type === 'chunk' || event.type === 'error') {
          // Agregar texto al mensaje del asistente de forma reactiva
          this.messages.update((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, text: msg.text + event.text } : msg
            )
          );
        }
      }

      // Recargar datos solo si la IA modificó algo
      if (routinesModified) {
        this.routineFacade.loadRoutines();
      }
      if (memoryModified) {
        this.memoryFacade.loadMemories();
      }
    } catch (err: any) {
      this.error.set('No se pudo conectar con el Coach. Revisa tu conexión.');
    } finally {
      this.isLoading.set(false);
      this.toolStatus.set(null);
    }
  }

  clearChat(): void {
    this.messages.set([
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: '¡Hola! He limpiado nuestra conversación. ¿En qué te ayudo ahora?',
        timestamp: new Date(),
      },
    ]);
  }

  private getFriendlyToolName(toolName: string): string {
    const map: Record<string, string> = {
      obtener_mis_rutinas: 'Revisando tus rutinas...',
      obtener_mis_entrenamientos_recientes: 'Consultando historial de sesiones...',
      obtener_series_de_entrenamiento: 'Buscando detalle de series...',
      crear_rutina: 'Guardando nueva rutina...',
      eliminar_rutina: 'Borrando rutina...',
      buscar_ejercicios: 'Buscando en catálogo de ejercicios...',
      obtener_entrenamiento_en_curso: 'Revisando tu sesión activa...',
      analizar_volumen_muscular: 'Calculando volumen por músculo...',
      analizar_progresion_ejercicio: 'Analizando progresión y fuerza...',
      analizar_historial_feedback: 'Revisando tu feedback y molestias...',
      guardar_recuerdo: 'Guardando en la memoria a largo plazo...',
      eliminar_recuerdo: 'Olvidando un recuerdo antiguo...',
    };
    return map[toolName] || 'Procesando con MCP...';
  }
}
