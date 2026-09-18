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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ChatMessage } from '@core/services/ai/gemini.service';

import { MarkdownPipe } from '@shared/pipes/markdown.pipe';

@Component({
  selector: 'app-coach-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full flex flex-col bg-surface overflow-hidden',
  },
  template: `
    <div class="chat-statusbar">
      <p class="chat-status indicator-live">Conectado (MCP)</p>
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

    <!-- Chat Body / Message List (Scrollable Area) -->
    <div #scrollContainer class="flex-1 px-5 py-4 overflow-y-auto flex flex-col gap-4">
      @if (messages().length === 0) {
        <div class="flex flex-col items-center justify-center my-auto py-8 text-center">
          <div class="chat-empty-icon">
            <app-icon name="sparkles" [size]="26" [ariaHidden]="true" />
          </div>
          <h3 class="text-base font-semibold text-primary m-0 mb-1">Coach Virtual IA</h3>
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
            @if (msg.sender === 'assistant') {
              <div [innerHTML]="msg.text | markdown"></div>
            } @else {
              <p class="m-0 whitespace-pre-wrap">{{ msg.text }}</p>
            }
          </div>
          <span class="chat-time" [class.text-right]="msg.sender === 'user'">
            {{ msg.timestamp | date: 'shortTime' }}
          </span>
        </div>
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
      <form (ngSubmit)="send()" class="chat-form">
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
          type="submit"
          [disabled]="!inputText().trim() || isLoading()"
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

      /* Medía 36px, con el ícono en blanco sobre ember (2.9:1). Tinta sobre
         ember da 7.0:1. */
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

  onSend = output<string>();
  onClear = output<void>();

  inputText = signal<string>('');

  private scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  constructor() {
    // Auto-scroll al fondo cuando cambian los mensajes o el estado de carga
    effect(() => {
      const msgs = this.messages();
      const loading = this.isLoading();

      setTimeout(() => {
        const el = this.scrollContainer()?.nativeElement;
        if (el) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
      }, 100); // Pequeño delay para que el DOM renderice primero
    });
  }

  send(): void {
    const val = this.inputText().trim();
    if (val && !this.isLoading()) {
      this.onSend.emit(val);
      this.inputText.set('');
    }
  }

  sendQuickPrompt(promptText: string): void {
    if (!this.isLoading()) {
      this.onSend.emit(promptText);
    }
  }
}
