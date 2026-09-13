import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoachFacade } from '@core/services/ai/coach.facade';
import { CoachChatComponent } from '@shared/components/coach-chat/coach-chat.component';
import { AlertCardComponent } from '@shared/components/alert-card/alert-card.component';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-coach-page',
  standalone: true,
  imports: [CommonModule, CoachChatComponent, AlertCardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-[calc(100vh-6rem)] max-w-4xl mx-auto flex flex-col gap-4 p-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-primary flex items-center gap-2 m-0">
            <app-icon name="sparkles" [size]="24" class="text-brand" />
            Entrenador IA Personal
          </h1>
          <p class="text-xs text-muted m-0">
            Analiza tu progreso y rutinas en tiempo real gracias al protocolo MCP.
          </p>
        </div>
      </div>

      <!-- Error Banner -->
      @if (coachFacade.error()) {
        <app-alert-card
          severity="error"
          title="Error de Comunicación"
          [dismissible]="true"
        >
          {{ coachFacade.error() }}
        </app-alert-card>
      }

      <!-- Main Chat UI Container -->
      <div class="flex-1 min-h-0">
        <app-coach-chat
          [messages]="coachFacade.messages()"
          [isLoading]="coachFacade.isLoading()"
          (onSend)="handleSend($event)"
          (onClear)="coachFacade.clearChat()"
        />
      </div>
    </div>
  `,
})
export class CoachPage {
  readonly coachFacade = inject(CoachFacade);

  handleSend(userText: string): void {
    this.coachFacade.sendMessage(userText);
  }
}
