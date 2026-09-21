import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
} from '@angular/core';
import { CoachFacade } from '@core/services/ai/coach.facade';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { CoachChatComponent } from '@shared/components/coach-chat/coach-chat.component';
import { AlertCardComponent } from '@shared/components/alert-card/alert-card.component';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';

@Component({
  selector: 'app-coach-page',
  standalone: true,
  imports: [CoachChatComponent, AlertCardComponent, AppHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="coach-page tier-trabajo">
      <app-header title="Entrenador IA Personal" />
      <p class="coach-subtitle" data-anim="bloque">
        Analiza tu progreso y rutinas en tiempo real gracias al protocolo MCP.
      </p>

      @if (coachFacade.error()) {
        <div class="coach-alert">
          <app-alert-card severity="error" title="Error de Comunicación" [dismissible]="true">
            {{ coachFacade.error() }}
          </app-alert-card>
        </div>
      }

      <div class="coach-body" data-anim="bloque">
        <app-coach-chat
          [messages]="coachFacade.messages()"
          [isLoading]="coachFacade.isLoading()"
          [toolStatus]="coachFacade.toolStatus()"
          [memories]="coachFacade.memories()"
          [isMemoryOpen]="coachFacade.isMemoryOpen()"
          (onSend)="coachFacade.sendMessage($event.text, $event.imageBase64)"
          (onClear)="coachFacade.clearChat()"
          (onToggleMemory)="coachFacade.toggleMemory()"
          (onDeleteMemory)="coachFacade.deleteMemory($event)"
        />
      </div>
    </div>
  `,
  styles: [
    `
      /* El alto sale del cromo que publica el shell: tabs, y la barra de
         sesión cuando la hay. Antes era 100vh - 6rem fijo, y con sesión
         en curso la vista se metía 18px debajo de la barra. La primera
         declaración es el respaldo para WebViews sin dvh. */
      .coach-page {
        height: calc(100vh - var(--chrome-bottom, 114px));
        height: calc(100dvh - var(--chrome-bottom, 114px));
        display: flex;
        flex-direction: column;
        max-width: 56rem;
        margin: 0 auto;
      }

      .coach-subtitle {
        margin: -1rem 1rem 1rem;
        font-size: var(--text-xs);
        color: var(--text-muted);
      }

      .coach-alert {
        margin: 0 1rem 1rem;
      }

      .coach-body {
        flex: 1;
        min-height: 0;
        margin: 0 1rem;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }
    `,
  ],
})
export class CoachPage implements AfterViewInit {
  readonly coachFacade = inject(CoachFacade);
  private gsap = inject(GsapAnimationsService);
  private host = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    this.gsap.animateTierEnter(this.host.nativeElement.querySelector('.tier-trabajo'));
  }

  handleSend(event: {text: string; imageBase64?: string}): void {
    this.coachFacade.sendMessage(event.text, event.imageBase64);
  }
}
