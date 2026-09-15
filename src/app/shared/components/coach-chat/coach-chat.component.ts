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
    <!-- Minimalist Status Bar -->
    <div
      class="flex items-center justify-between px-5 py-2.5 bg-surface/90 backdrop-blur-md z-10 border-b border-border/40 shrink-0"
    >
      <p
        class="text-[11px] font-medium text-brand flex items-center gap-1.5 m-0 uppercase tracking-wider"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></span>
        Conectado (MCP)
      </p>
      <button
        type="button"
        class="p-1.5 text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
        title="Limpiar conversación"
        (click)="onClear.emit()"
      >
        <app-icon name="trash-2" [size]="14" />
      </button>
    </div>

    <!-- Chat Body / Message List (Scrollable Area) -->
    <div #scrollContainer class="flex-1 px-5 py-4 overflow-y-auto flex flex-col gap-4">
      @if (messages().length === 0) {
        <!-- Empty State -->
        <div
          class="animate-fade-in-up flex flex-col items-center justify-center my-auto py-8 text-center"
        >
          <div
            class="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-3 shadow-inner"
          >
            <app-icon name="sparkles" [size]="26" />
          </div>
          <h3 class="text-base font-semibold text-primary m-0 mb-1">Coach Virtual IA</h3>
          <p class="text-xs text-muted max-w-[80%] mb-6">
            Tu copiloto durante el entrenamiento. ¿Qué deseas consultar?
          </p>
          <div class="flex flex-col gap-2 w-full max-w-sm">
            <button
              type="button"
              (click)="sendQuickPrompt('¿Cuánto tiempo he descansado desde la última serie?')"
              class="px-3.5 py-2.5 rounded-2xl bg-base/60 hover:bg-base border border-border/50 text-xs text-primary transition-all shadow-sm text-left flex items-center gap-3 active:scale-[0.99]"
            >
              <app-icon name="timer" [size]="16" />
              <span class="font-medium">¿Cuánto tiempo llevo de descanso?</span>
            </button>
            <button
              type="button"
              (click)="
                sendQuickPrompt('¿Qué peso o repeticiones me recomiendas para mi siguiente serie?')
              "
              class="px-3.5 py-2.5 rounded-2xl bg-base/60 hover:bg-base border border-border/50 text-xs text-primary transition-all shadow-sm text-left flex items-center gap-3 active:scale-[0.99]"
            >
              <app-icon name="trending-up" [size]="16" />
              <span class="font-medium">Recomiéndame peso para la siguiente serie</span>
            </button>
            <button
              type="button"
              (click)="sendQuickPrompt('Dame un resumen y valoración de mi entrenamiento de hoy.')"
              class="px-3.5 py-2.5 rounded-2xl bg-base/60 hover:bg-base border border-border/50 text-xs text-primary transition-all shadow-sm text-left flex items-center gap-3 active:scale-[0.99]"
            >
              <app-icon name="bar-chart-2" [size]="16" />
              <span class="font-medium">Resumen y análisis de la sesión</span>
            </button>
          </div>
        </div>
      }

      @for (msg of messages(); track msg.id) {
        <div
          class="animate-fade-in-up flex flex-col max-w-[85%]"
          [class.self-end]="msg.sender === 'user'"
          [class.self-start]="msg.sender === 'assistant'"
        >
          <div
            class="px-4 py-2.5 text-sm leading-relaxed shadow-sm"
            [class.bg-brand]="msg.sender === 'user'"
            [class.text-primary-inverse]="msg.sender === 'user'"
            [class.rounded-2xl]="true"
            [class.rounded-tr-[4px]]="msg.sender === 'user'"
            [class.bg-base]="msg.sender === 'assistant'"
            [class.border]="msg.sender === 'assistant'"
            [class.border-border/60]="msg.sender === 'assistant'"
            [class.text-primary]="msg.sender === 'assistant'"
            [class.rounded-tl-[4px]]="msg.sender === 'assistant'"
          >
            @if (msg.sender === 'assistant') {
              <div [innerHTML]="msg.text | markdown"></div>
            } @else {
              <p class="m-0 whitespace-pre-wrap">{{ msg.text }}</p>
            }
          </div>
          <span
            class="text-[10px] text-muted mt-1 px-1 font-medium"
            [class.text-right]="msg.sender === 'user'"
          >
            {{ msg.timestamp | date: 'shortTime' }}
          </span>
        </div>
      }

      <!-- Loading Indicator / Skeleton -->
      @if (isLoading()) {
        <div class="animate-fade-in-up flex flex-col max-w-[75%] self-start gap-1">
          <div
            class="px-4 py-3 bg-base border border-border/50 rounded-2xl rounded-tl-[4px] shadow-sm flex items-center gap-2.5"
          >
            <app-icon name="sparkles" [size]="15" class="animate-pulse text-brand shrink-0" />
            <span class="text-xs text-muted">Analizando entrenamiento...</span>
          </div>
        </div>
      }

      <!-- Contextual Quick Actions (Chips after conversation) -->
      @if (messages().length > 0 && !isLoading()) {
        <div class="animate-fade-in-up flex flex-wrap gap-2 pt-1 pb-2">
          <button
            type="button"
            (click)="sendQuickPrompt('¿Cuánto llevo de descanso?')"
            class="text-[11px] font-medium px-3 py-1.5 rounded-full bg-base border border-border/60 text-muted hover:text-primary hover:border-brand/40 transition-all active:scale-95 shadow-sm inline-flex items-center gap-1"
          >
            <app-icon name="timer" [size]="12" /> Descanso
          </button>
          <button
            type="button"
            (click)="sendQuickPrompt('¿Qué peso me recomiendas para mi siguiente serie?')"
            class="text-[11px] font-medium px-3 py-1.5 rounded-full bg-base border border-border/60 text-muted hover:text-primary hover:border-brand/40 transition-all active:scale-95 shadow-sm inline-flex items-center gap-1"
          >
            <app-icon name="trending-up" [size]="12" /> Sugerir peso
          </button>
          <button
            type="button"
            (click)="sendQuickPrompt('Dame un resumen de lo que llevo hoy.')"
            class="text-[11px] font-medium px-3 py-1.5 rounded-full bg-base border border-border/60 text-muted hover:text-primary hover:border-brand/40 transition-all active:scale-95 shadow-sm inline-flex items-center gap-1"
          >
            <app-icon name="bar-chart-2" [size]="12" /> Resumen
          </button>
        </div>
      }
    </div>

    <!-- Pinned Bottom Input Bar -->
    <div class="p-4 bg-surface/95 backdrop-blur-md border-t border-border/40 shrink-0">
      <form
        (ngSubmit)="send()"
        class="flex items-center gap-2 bg-base border border-border/60 rounded-full px-3 py-1.5 shadow-sm focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/30 transition-all"
      >
        <input
          type="text"
          [(ngModel)]="inputText"
          name="userPrompt"
          placeholder="Pregúntale a tu Coach..."
          [disabled]="isLoading()"
          class="flex-1 bg-transparent border-none px-2 py-1.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-0"
          autocomplete="off"
        />
        <button
          type="submit"
          [disabled]="!inputText().trim() || isLoading()"
          class="min-w-9 min-h-9 w-9 h-9 aspect-square flex items-center justify-center rounded-full bg-brand text-white hover:opacity-90 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm shrink-0"
          style="border-radius: 9999px !important;"
          title="Enviar mensaje"
        >
          <app-icon name="send" [size]="14" />
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(12px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .animate-fade-in-up {
        animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
