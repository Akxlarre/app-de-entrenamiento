import { inject, Injectable, signal } from '@angular/core';
import { ChatMessage, GeminiService } from './gemini.service';

@Injectable({
  providedIn: 'root',
})
export class CoachFacade {
  private geminiService = inject(GeminiService);

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

  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  toggleDrawer(): void {
    this.isDrawerOpen.update((open) => !open);
  }

  /**
   * Envía un mensaje del usuario al Coach y procesa la respuesta
   */
  async sendMessage(userText: string): Promise<void> {
    const trimmed = userText.trim();
    if (!trimmed || this.isLoading()) return;

    this.error.set(null);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: trimmed,
      timestamp: new Date(),
    };

    // Actualizar conversación local de forma reactiva
    this.messages.update((prev) => [...prev, userMessage]);
    this.isLoading.set(true);

    try {
      const responseText = await this.geminiService.generateResponse(
        this.messages().slice(0, -1), // Historial anterior
        trimmed,
      );

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: responseText,
        timestamp: new Date(),
      };

      this.messages.update((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      this.error.set('No se pudo conectar con el Coach. Revisa tu conexión.');
    } finally {
      this.isLoading.set(false);
    }
  }

  clearChat(): void {
    this.messages.set([
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: 'Chat reiniciado. ¿En qué trabajamos hoy?',
        timestamp: new Date(),
      },
    ]);
  }
}
