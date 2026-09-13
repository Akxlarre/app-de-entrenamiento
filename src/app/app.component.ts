import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { Toast } from 'primeng/toast';
import { AppUpdateFacade } from './core/facades/app-update.facade';
import { AppUpdateModalComponent } from './shared/components/app-update-modal/app-update-modal.component';

/**
 * AppComponent — raíz de la aplicación.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonApp, IonRouterOutlet, Toast, AppUpdateModalComponent],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
      <p-toast
        position="bottom-right"
        [breakpoints]="{ '768px': { width: '100%', right: '0', left: '0' } }"
      />
      <app-update-modal
        [visible]="!!updateFacade.updateAvailable()"
        [updateInfo]="updateFacade.updateAvailable()"
        [isDownloading]="updateFacade.isDownloading()"
        [downloadProgress]="updateFacade.downloadProgress()"
        [error]="updateFacade.error()"
        (startUpdate)="updateFacade.downloadAndInstall()"
        (dismiss)="updateFacade.dismissUpdate()"
      />
    </ion-app>
  `,
})
export class AppComponent implements OnInit {
  updateFacade = inject(AppUpdateFacade);

  ngOnInit() {
    this.updateFacade.checkForUpdates();
  }
}
