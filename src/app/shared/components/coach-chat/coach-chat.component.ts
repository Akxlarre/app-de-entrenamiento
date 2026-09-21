import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ChatMessage } from '@core/services/ai/gemini.service';
import { UserMemory } from '@core/services/user-memory.service';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';

@Component({
  selector: 'app-coach-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex h-full flex-col bg-surface overflow-hidden relative',
  },
  template: `
    <div class="chat-statusbar">
      <div class="flex items-center gap-2">
        <span class="indicator-live"></span>
        <p class="chat-status">Conectado (MCP)</p>
      </div>
      <div class="flex gap-1">
        <button
          type="button"
          class="chat-icon-btn"
          title="Ver Perfil de Memoria"
          aria-label="Ver Perfil de Memoria"
          (click)="onToggleMemory.emit()"
        >
          <app-icon name="brain" [size]="18" [ariaHidden]="true" />
        </button>
        <button
          type="button"
          class="chat-icon-btn"
          title="Limpiar conversación"
          aria-label="Limpiar conversación"
          data-llm-action="limpiar-chat-coach"
          (click)="onClear.emit()"
        >
          <app-icon name="trash-2" [size]="18" [ariaHidden]="true" />
        </button>
      </div>
    </div>

    <!-- Capa de Memoria a Largo Plazo -->
    @if (isMemoryOpen()) {
      <div class="absolute top-[49px] left-0 right-0 bottom-0 z-50 bg-surface flex flex-col animation-fade-in">
        <div class="px-5 py-4 flex-1 overflow-y-auto">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-semibold text-text-primary m-0 flex items-center gap-2">
              <app-icon name="brain" [size]="18" /> Memoria del Coach
            </h3>
            <button
              type="button"
              class="bg-transparent border-none text-text-muted hover:text-text-primary cursor-pointer p-1"
              (click)="onToggleMemory.emit()"
              title="Volver al chat"
              aria-label="Cerrar memoria"
            >
              <app-icon name="x" [size]="20" />
            </button>
          </div>
          <p class="text-sm text-text-muted mb-6">
            Aquí están los datos que la IA ha aprendido sobre ti. Puedes eliminarlos si ya no son relevantes.
          </p>

          @if (memories().length === 0) {
            <div class="text-center py-8">
              <p class="text-sm text-text-muted">Aún no hay recuerdos guardados.</p>
            </div>
          } @else {
            <div class="flex flex-col gap-3">
              @for (mem of memories(); track mem.id) {
                <div class="p-3 bg-base border border-subtle rounded-lg flex gap-3 items-start">
                  <div class="mt-0.5 text-brand">
                    <app-icon [name]="getMemoryIcon(mem.category)" [size]="16" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-text-primary m-0">{{ mem.content }}</p>
                    <span class="text-xs text-text-muted mt-1 inline-block">{{ getMemoryLabel(mem.category) | uppercase }}</span>
                  </div>
                  <button 
                    type="button" 
                    class="text-text-muted hover:text-[var(--state-error)] shrink-0 bg-transparent border-none p-1 cursor-pointer"
                    (click)="onDeleteMemory.emit(mem.id)"
                    title="Olvidar recuerdo"
                  >
                    <app-icon name="trash-2" [size]="16" />
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }

    <!-- Chat Body / Message List (Scrollable Area) -->
    <div #scrollContainer class="flex-1 px-5 py-4 overflow-y-auto flex flex-col gap-4">
      @if (messages().length === 0) {
        <div class="flex flex-col items-center justify-center my-auto py-8 text-center">
          <div class="chat-empty-icon">
            <app-icon name="sparkles" [size]="26" [ariaHidden]="true" />
          </div>
          <h3 class="text-base font-semibold text-text-primary m-0 mb-1">Coach Virtual IA</h3>
          <p class="chat-empty-sub">Tu copiloto durante el entrenamiento. ¿Qué deseas consultar?</p>
          <div class="flex flex-col gap-2 w-full max-w-sm">
            <button
              type="button"
              class="chat-prompt"
              (click)="sendQuickPrompt('¿Cuánto tiempo he descansado desde la última serie?')"
            >
              <app-icon name="timer" [size]="16" [ariaHidden]="true" />
              <span>¿Cuánto tiempo llevo de descanso?</span>
            </button>
            <button
              type="button"
              class="chat-prompt"
              (click)="
                sendQuickPrompt('¿Qué peso o repeticiones me recomiendas para mi siguiente serie?')
              "
            >
              <app-icon name="trending-up" [size]="16" [ariaHidden]="true" />
              <span>Recomiéndame peso para la siguiente serie</span>
            </button>
            <button
              type="button"
              class="chat-prompt"
              (click)="sendQuickPrompt('Dame un resumen y valoración de mi entrenamiento de hoy.')"
            >
              <app-icon name="bar-chart-2" [size]="16" [ariaHidden]="true" />
              <span>Resumen y análisis de la sesión</span>
            </button>
          </div>
        </div>
      }

      @for (msg of messages(); track msg.id) {
        @if (msg.text || msg.imageBase64) {
          <div
            class="flex flex-col max-w-[85%]"
            [class.self-end]="msg.sender === 'user'"
            [class.self-start]="msg.sender === 'assistant'"
          >
            <div
              class="chat-bubble"
              [class.chat-bubble--user]="msg.sender === 'user'"
              [class.chat-bubble--assistant]="msg.sender === 'assistant'"
            >
              @if (msg.imageBase64) {
                <img [src]="msg.imageBase64" alt="Adjunto" class="chat-bubble-img" />
              }
              @if (msg.text) {
                @if (msg.sender === 'assistant') {
                  <div [innerHTML]="msg.text | markdown"></div>
                } @else {
                  <p class="m-0 whitespace-pre-wrap">{{ msg.text }}</p>
                }
              }
            </div>
            <span class="chat-time" [class.text-right]="msg.sender === 'user'">
              {{ msg.timestamp | date: 'shortTime' }}
            </span>
          </div>
        }
      }

      @if (isLoading()) {
        <div class="flex flex-col max-w-[75%] self-start gap-1">
          <div class="chat-bubble chat-bubble--assistant chat-thinking">
            <app-icon
              name="sparkles"
              [size]="15"
              [ariaHidden]="true"
              class="animate-pulse text-brand shrink-0"
            />
            <span class="chat-thinking-text">Analizando entrenamiento...</span>
          </div>
        </div>
      }

      <!-- Sugerencias después de la conversación -->
      @if (messages().length > 0 && !isLoading()) {
        <div class="flex flex-wrap gap-2 pt-1 pb-2">
          <button
            type="button"
            class="chat-chip"
            (click)="sendQuickPrompt('¿Cuánto llevo de descanso?')"
          >
            <app-icon name="timer" [size]="14" [ariaHidden]="true" /> Descanso
          </button>
          <button
            type="button"
            class="chat-chip"
            (click)="sendQuickPrompt('¿Qué peso me recomiendas para mi siguiente serie?')"
          >
            <app-icon name="trending-up" [size]="14" [ariaHidden]="true" /> Sugerir peso
          </button>
          <button
            type="button"
            class="chat-chip"
            (click)="sendQuickPrompt('Dame un resumen de lo que llevo hoy.')"
          >
            <app-icon name="bar-chart-2" [size]="14" [ariaHidden]="true" /> Resumen
          </button>
        </div>
      }
    </div>

    <div class="chat-inputbar">
      @if (selectedImageBase64()) {
        <div class="chat-image-preview">
          <img [src]="selectedImageBase64()" alt="Imagen adjunta" class="preview-img" />
          <button type="button" class="preview-remove" (click)="selectedImageBase64.set(null)" aria-label="Eliminar imagen">
            <app-icon name="x" [size]="14" [ariaHidden]="true" />
          </button>
        </div>
      }
      <form (ngSubmit)="send()" class="chat-form">
        <input type="file" #fileInput accept="image/*" hidden (change)="onFileSelected($event)" />
        <button
          type="button"
          (click)="fileInput.click()"
          class="chat-attach"
          title="Adjuntar imagen"
        >
          <app-icon name="image" [size]="18" [ariaHidden]="true" />
        </button>
        <input
          type="text"
          [(ngModel)]="inputText"
          name="userPrompt"
          placeholder="Pregúntale a tu Coach..."
          [disabled]="isLoading()"
          class="chat-input"
          autocomplete="off"
        />
        <button
          type="button"
          (click)="toggleRecording()"
          class="chat-mic"
          [class.is-recording]="isRecording()"
          title="Dictado por voz"
        >
          <app-icon [name]="isRecording() ? 'mic' : 'mic-off'" [size]="18" [ariaHidden]="true" />
        </button>
        <button
          type="submit"
          [disabled]="(!inputText().trim() && !selectedImageBase64()) || isLoading()"
          class="chat-send"
          title="Enviar mensaje"
          aria-label="Enviar mensaje"
          data-llm-action="enviar-mensaje-coach"
        >
          <app-icon name="send" [size]="18" [ariaHidden]="true" />
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      /* Utilidades de texto que podrían faltar en Tailwind local */
      .text-primary { color: var(--text-primary); }
      .text-muted { color: var(--text-muted); }
      .text-brand { color: var(--ds-brand); }
      .bg-surface { background-color: var(--bg-surface); }
      .bg-base { background-color: var(--bg-base); }
      .border-subtle { border-color: var(--border-subtle); }

      /* Soporte para hover explícito */
      .hover\\:text-primary:hover { color: var(--text-primary); }
      .hover\\:text-\\[var\\(--state-error\\)\\]:hover { color: var(--state-error); }

      .animation-fade-in {
        animation: fade-in 0.2s ease-out forwards;
      }
      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .chat-statusbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 0.5rem 0 1.25rem;
        background: var(--bg-surface);
        border-bottom: 1px solid var(--border-subtle);
        flex-shrink: 0;
      }

      /* Medía 11px, bajo el piso de 13. */
      .chat-status {
        margin: 0;
        font-size: var(--text-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ds-brand);
      }

      /* Medía 17 por 14px. */
      .chat-icon-btn {
        min-width: var(--target-min);
        min-height: var(--target-min);
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        border-radius: var(--radius-md);
        color: var(--text-muted);
        cursor: pointer;
      }
      .chat-icon-btn:active {
        color: var(--state-error);
        background: var(--state-error-bg);
      }

      .chat-empty-icon {
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 1rem;
        background: var(--color-primary-tint);
        color: var(--ds-brand);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.75rem;
      }

      .chat-empty-sub {
        max-width: 80%;
        margin: 0 0 1.5rem;
        font-size: var(--text-xs);
        color: var(--text-muted);
      }

      .chat-prompt {
        min-height: var(--target-min);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.625rem 0.875rem;
        background: var(--bg-base);
        border: 1px solid var(--border-default);
        border-radius: 1rem;
        color: var(--text-primary);
        font-size: var(--text-xs);
        font-weight: 500;
        text-align: left;
        cursor: pointer;
      }
      .chat-prompt:active {
        transform: scale(0.99);
      }

      .chat-bubble {
        padding: 0.625rem 1rem;
        border-radius: 1rem;
        font-size: var(--text-sm);
        line-height: 1.6;
        color: var(--text-primary);
        animation: chat-fade-in-up 0.3s ease-out forwards;
      }

      .chat-bubble-img {
        max-width: 100%;
        border-radius: var(--radius-sm);
        margin-bottom: 0.5rem;
      }

      @keyframes chat-fade-in-up {
        0% { opacity: 0; transform: translateY(12px); }
        100% { opacity: 1; transform: translateY(0); }
      }

      /* Sin ember: con varios mensajes en pantalla la marca pasaba de la
         regla 3-2-1. La posición y la esquina ya dicen quién habla. */
      .chat-bubble--user {
        background: var(--bg-subtle);
        border-top-right-radius: 4px;
      }
      .chat-bubble--assistant {
        background: var(--bg-base);
        border: 1px solid var(--border-default);
        border-top-left-radius: 4px;
      }
      .chat-thinking {
        display: flex;
        align-items: center;
        gap: 0.625rem;
      }
      .chat-thinking-text {
        font-size: var(--text-xs);
        color: var(--text-muted);
      }

      /* Medía 10px. */
      .chat-time {
        margin-top: 0.25rem;
        padding: 0 0.25rem;
        font-size: var(--text-xs);
        color: var(--text-muted);
      }

      /* Medían 12px de alto con letra de 11px. */
      .chat-chip {
        min-height: var(--target-min);
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0 0.875rem;
        background: var(--bg-base);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-full);
        color: var(--text-secondary);
        font-size: var(--text-xs);
        font-weight: 500;
        cursor: pointer;
      }
      .chat-chip:active {
        transform: scale(0.97);
      }

      .chat-inputbar {
        padding: 0.75rem 1rem;
        background: var(--bg-surface);
        border-top: 1px solid var(--border-subtle);
        flex-shrink: 0;
      }

      .chat-form {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.25rem 0.25rem 0.75rem;
        background: var(--bg-base);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-full);
      }
      .chat-form:focus-within {
        border-color: var(--ds-brand);
      }

      /* El campo medía 36px. */
      .chat-input {
        flex: 1;
        min-width: 0;
        min-height: var(--target-min);
        background: transparent;
        border: none;
        outline: none;
        color: var(--text-primary);
        font-size: var(--text-sm);
      }
      .chat-input::placeholder {
        color: var(--text-muted);
      }

      .chat-image-preview {
        position: relative;
        display: inline-block;
        margin-bottom: 0.75rem;
      }
      .preview-img {
        height: 60px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-subtle);
        object-fit: cover;
      }
      .preview-remove {
        position: absolute;
        top: -6px;
        right: -6px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--text-muted);
      }

      .chat-mic, .chat-attach {
        width: var(--target-min);
        height: var(--target-min);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: var(--radius-full);
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        transition: color 0.2s ease, transform 0.15s ease;
      }
      .chat-mic:active, .chat-attach:active {
        transform: scale(0.94);
      }
      .chat-mic.is-recording {
        color: var(--state-error);
        background: var(--state-error-bg);
        animation: pulse-recording 1.5s infinite ease-in-out;
      }

      @keyframes pulse-recording {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
        50% { transform: scale(1.08); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }

      .chat-send {
        width: var(--target-min);
        height: var(--target-min);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: var(--radius-full);
        background: var(--ds-brand);
        color: var(--color-primary-text);
        cursor: pointer;
      }
      .chat-send:active {
        transform: scale(0.94);
      }
      .chat-send:disabled {
        opacity: var(--input-disabled-opacity);
        cursor: not-allowed;
      }
    `,
  ],
})
export class CoachChatComponent {
  messages = input.required<ChatMessage[]>();
  isLoading = input<boolean>(false);
  toolStatus = input<string | null>(null);
  
  // Memory properties
  memories = input<UserMemory[]>([]);
  isMemoryOpen = input<boolean>(false);

  onSend = output<{text: string; imageBase64?: string}>();
  onClear = output<void>();
  onToggleMemory = output<void>();
  onDeleteMemory = output<string>();

  inputText = signal<string>('');
  isRecording = signal<boolean>(false);
  selectedImageBase64 = signal<string | null>(null);

  private scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');
  private recognition: any;

  constructor() {
    effect(() => {
      const msgs = this.messages();
      const loading = this.isLoading();

      setTimeout(() => {
        const el = this.scrollContainer()?.nativeElement;
        if (el) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    });

    this.initSpeechRecognition();
  }

  getMemoryIcon(category: string): string {
    const map: Record<string, string> = {
      injury: 'activity',
      preference: 'star',
      goal: 'target',
      equipment: 'dumbbell',
      schedule: 'calendar',
      level: 'award',
      other: 'info',
    };
    return map[category] || 'brain';
  }

  getMemoryLabel(category: string): string {
    const map: Record<string, string> = {
      injury: 'Lesión / Molestia',
      preference: 'Preferencia',
      goal: 'Objetivo',
      equipment: 'Equipamiento',
      schedule: 'Disponibilidad',
      level: 'Nivel',
      other: 'Otro',
    };
    return map[category] || category;
  }

  private initSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;

      this.recognition.onstart = () => {
        this.isRecording.set(true);
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const newText = finalTranscript || interimTranscript;
        if (newText) {
          this.inputText.set(newText);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        this.isRecording.set(false);
      };

      this.recognition.onend = () => {
        this.isRecording.set(false);
      };
    } else {
      console.warn('Speech Recognition API no está soportada en este navegador.');
    }
  }

  toggleRecording(): void {
    if (!this.recognition) {
      alert('Tu navegador no soporta el dictado por voz.');
      return;
    }

    if (this.isRecording()) {
      this.recognition.stop();
    } else {
      this.inputText.set('');
      this.recognition.start();
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => this.selectedImageBase64.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  }

  send(): void {
    const val = this.inputText().trim();
    const img = this.selectedImageBase64();
    if ((val || img) && !this.isLoading()) {
      this.onSend.emit({ text: val, imageBase64: img || undefined });
      this.inputText.set('');
      this.selectedImageBase64.set(null);
    }
  }

  sendQuickPrompt(text: string): void {
    this.inputText.set(text);
    this.send();
  }
}
