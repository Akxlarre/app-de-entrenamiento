import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppUpdate } from '../../../core/models/app-update.model';

@Component({
  selector: 'app-update-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <div class="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#121217] p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
          
          <!-- Top badge / icon -->
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-2xl shadow-lg shadow-[#3b82f6]/10">
              🚀
            </div>
            <div class="flex flex-col">
              <h3 class="m-0 text-base font-bold text-white tracking-tight">¡Nueva versión disponible!</h3>
              <span class="text-xs font-semibold text-[#60a5fa]">Versión {{ updateInfo()?.version || 'actualizada' }}</span>
            </div>
          </div>

          <!-- Notes -->
          <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 text-xs text-zinc-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
            {{ updateInfo()?.release_notes || 'Mejoras de rendimiento y corrección de errores.' }}
          </div>

          <!-- Error message if any -->
          @if (error()) {
            <div class="p-3 rounded-xl text-xs font-semibold text-primary border border-surface-border" style="background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.2);">
              ⚠️ {{ error() }}
            </div>
          }

          <!-- Download Progress Bar -->
          @if (isDownloading()) {
            <div class="flex flex-col gap-2 pt-2">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-zinc-400">Descargando actualización...</span>
                <span class="text-[#60a5fa]">{{ downloadProgress() }}%</span>
              </div>
              <div class="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-[#2563eb] to-[#3b82f6] transition-all duration-200" [style.width.%]="downloadProgress()"></div>
              </div>
            </div>
          }

          <!-- Action buttons -->
          <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.06] mt-1">
            @if (!isForceUpdate && !isDownloading()) {
              <button
                type="button"
                (click)="onClose()"
                class="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer transition-all active:scale-95"
              >
                Más tarde
              </button>
            }

            <button
              type="button"
              (click)="onUpdateClick()"
              [disabled]="isDownloading()"
              class="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#60a5fa] border-none shadow-lg shadow-[#3b82f6]/20 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              @if (isDownloading()) {
                <span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                <span>Instalando...</span>
              } @else {
                <span>Actualizar Ahora</span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
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
