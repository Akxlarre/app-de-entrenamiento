import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { AppUpdateService } from '../services/app-update.service';
import { AppUpdate } from '../models/app-update.model';

@Injectable({
  providedIn: 'root'
})
export class AppUpdateFacade {
  private updateService = inject(AppUpdateService);

  // State signals
  private _isChecking = signal(false);
  private _isDownloading = signal(false);
  private _downloadProgress = signal(0);
  private _updateAvailable = signal<AppUpdate | null>(null);
  private _error = signal<string | null>(null);

  // Public computed signals for the UI
  readonly isChecking = computed(() => this._isChecking());
  readonly isDownloading = computed(() => this._isDownloading());
  readonly downloadProgress = computed(() => this._downloadProgress());
  readonly updateAvailable = computed(() => this._updateAvailable());
  readonly error = computed(() => this._error());

  async checkForUpdates(): Promise<void> {
    this._isChecking.set(true);
    this._error.set(null);

    try {
      const currentBuild = await this.updateService.getCurrentBuild();
      if (currentBuild === null) {
        // Not a native platform or error
        this._isChecking.set(false);
        return;
      }

      const latestUpdate = await this.updateService.getLatestUpdate();
      if (latestUpdate && latestUpdate.build_number > currentBuild) {
        this._updateAvailable.set(latestUpdate);
      } else {
        this._updateAvailable.set(null);
      }
    } catch (err) {
      console.error('Check update failed:', err);
      this._error.set('No se pudo comprobar si hay actualizaciones.');
    } finally {
      this._isChecking.set(false);
    }
  }

  async downloadAndInstall(): Promise<void> {
    const update = this._updateAvailable();
    if (!update) return;

    this._isDownloading.set(true);
    this._downloadProgress.set(0);
    this._error.set(null);

    try {
      const downloadUrl = await this.updateService.getApkDownloadUrl(update.apk_path);
      if (!downloadUrl) throw new Error('No download URL available');

      this.updateService.downloadApk(downloadUrl).subscribe({
        next: async (event) => {
          if (event.type === HttpEventType.DownloadProgress) {
            const percent = Math.round((100 * event.loaded) / (event.total || 1));
            this._downloadProgress.set(percent);
          } else if (event.type === HttpEventType.Response) {
            const blob = event.body;
            if (blob) {
              await this.updateService.installApk(blob, 'update.apk');
            } else {
               throw new Error('Empty file received');
            }
            this._isDownloading.set(false);
          }
        },
        error: (err) => {
          console.error('Download failed:', err);
          this._error.set('Error al descargar la actualización.');
          this._isDownloading.set(false);
        }
      });
    } catch (err) {
      console.error('Setup download failed:', err);
      this._error.set('No se pudo iniciar la descarga.');
      this._isDownloading.set(false);
    }
  }

  dismissUpdate(): void {
    const update = this._updateAvailable();
    if (update?.force_update) {
      return; // No se puede descartar si es forzada
    }
    this._updateAvailable.set(null);
  }
}
