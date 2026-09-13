import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { AppUpdate } from '../../../core/models/app-update.model';

@Component({
  selector: 'app-update-modal',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, ProgressBarModule],
  template: `
    <p-dialog 
      [visible]="visible()" 
      [modal]="true" 
      [closable]="!isForceUpdate()"
      (onHide)="onClose()"
      [draggable]="false"
      [resizable]="false"
      header="¡Nueva actualización disponible!" 
      styleClass="w-full max-w-md mx-4 bg-surface rounded-xl border border-surface-border shadow-xl">
      
      <div class="flex flex-col gap-4 py-4">
        @if (updateInfo()) {
          <div class="text-primary font-medium text-lg">
            Versión {{ updateInfo()?.version }}
          </div>
          
          <div class="text-muted text-sm whitespace-pre-wrap leading-relaxed">
            {{ updateInfo()?.release_notes }}
          </div>
        }

        @if (error()) {
          <div class="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm">
            {{ error() }}
          </div>
        }

        @if (isDownloading()) {
          <div class="flex flex-col gap-2 mt-4">
            <div class="flex justify-between text-sm">
              <span class="text-muted">Descargando...</span>
              <span class="text-primary font-medium">{{ downloadProgress() }}%</span>
            </div>
            <!-- Utiliza PrimeNG progress bar o similar, o estilos propios -->
            <p-progressBar [value]="downloadProgress()" [showValue]="false" styleClass="h-2 rounded-full"></p-progressBar>
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-3 w-full">
          @if (!isForceUpdate() && !isDownloading()) {
            <p-button 
              label="Más tarde" 
              (onClick)="onClose()" 
              styleClass="p-button-text text-muted hover:text-primary">
            </p-button>
          }
          <p-button 
            [label]="isDownloading() ? 'Descargando...' : 'Actualizar ahora'" 
            (onClick)="onUpdateClick()" 
            [disabled]="isDownloading()"
            styleClass="px-6 py-2 bg-[var(--ds-brand)] text-white border-none rounded-lg hover:brightness-110 transition-all font-medium">
          </p-button>
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppUpdateModalComponent {
  // Inputs
  readonly visible = input<boolean>(false);
  readonly updateInfo = input<AppUpdate | null>(null);
  readonly isDownloading = input<boolean>(false);
  readonly downloadProgress = input<number>(0);
  readonly error = input<string | null>(null);

  // Outputs
  readonly startUpdate = output<void>();
  readonly dismiss = output<void>();

  get isForceUpdate(): boolean {
    return this.updateInfo()?.force_update ?? false;
  }

  onUpdateClick(): void {
    this.startUpdate.emit();
  }

  onClose(): void {
    if (!this.isForceUpdate) {
      this.dismiss.emit();
    }
  }
}
