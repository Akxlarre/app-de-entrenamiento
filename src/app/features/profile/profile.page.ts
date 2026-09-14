import { Component, ChangeDetectionStrategy, inject, AfterViewInit } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem, IonLabel, IonAvatar, IonList, IonListHeader, IonIcon, IonSpinner } from '@ionic/angular';
import { AuthFacade } from '@core/facades/auth.facade';
import { AppUpdateFacade } from '@core/facades/app-update.facade';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { addIcons } from 'ionicons';
import { logOutOutline, settingsOutline, chevronForwardOutline, cloudDownloadOutline } from 'ionicons/icons';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonButton, IonItem, IonLabel, IonAvatar, IonList, IonListHeader, IonIcon, IonSpinner, AppHeaderComponent],
  template: `
    <ion-content class="profile-content" [fullscreen]="true">
      <app-header title="Perfil"></app-header>
      @if (auth.currentUser(); as user) {
        <div class="profile-hero">
          <div class="avatar">
            {{ user.initials }}
          </div>
          <h2 class="user-name">{{ user.name }}</h2>
          <p class="user-email">{{ user.email }}</p>
        </div>
        
        <div class="options-section">
          <p class="section-label">OPCIONES</p>
          <ion-list class="options-list">
            <ion-item button detail="false" lines="none" class="option-item" (click)="checkForUpdates()">
              <ion-icon name="cloud-download-outline" slot="start" class="option-icon"></ion-icon>
              <ion-label>Buscar Actualizaciones</ion-label>
              @if (updateFacade.isChecking()) {
                <ion-spinner slot="end" name="crescent" style="width: 18px; height: 18px; color: #3b82f6;"></ion-spinner>
              } @else {
                <ion-icon name="chevron-forward-outline" slot="end" class="chevron-icon"></ion-icon>
              }
            </ion-item>
            <ion-item button detail="false" lines="none" class="option-item">
              <ion-icon name="settings-outline" slot="start" class="option-icon"></ion-icon>
              <ion-label>Preferencias</ion-label>
              <ion-icon name="chevron-forward-outline" slot="end" class="chevron-icon"></ion-icon>
            </ion-item>
          </ion-list>
        </div>

        <div class="logout-section">
          <button class="logout-btn" (click)="logout()">
            <ion-icon name="log-out-outline"></ion-icon>
            Cerrar Sesión
          </button>
        </div>
      } @else {
        <div class="empty-state">
          <p>No has iniciado sesión.</p>
        </div>
      }
    </ion-content>
  `,
  styles: [`

    .profile-content {
      --background: var(--ion-background-color, #121212);
    }

    .page-container {
      padding: 1rem;
      padding-bottom: calc(90px + env(safe-area-inset-bottom, 16px));
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .profile-hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem 2.5rem 1rem;
      background: transparent;
    }

    .avatar {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 1rem;
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.35);
    }

    .user-name {
      margin: 0 0 0.25rem 0;
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary, #fff);
    }

    .user-email {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-muted, #a1a1aa);
    }

    .options-section {
      padding: 0 1rem;
    }

    .section-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted, #a1a1aa);
      padding: 0 4px;
      margin: 0 0 0.5rem 0;
    }

    .options-list {
      background: transparent;
      padding: 0;
    }

    .option-item {
      --background: rgba(255,255,255,0.04);
      --color: var(--text-primary, #fff);
      --border-radius: 12px;
      --padding-start: 16px;
      --padding-end: 16px;
      --min-height: 52px;
      margin-bottom: 4px;
    }

    .option-icon {
      color: var(--text-muted, #a1a1aa);
      font-size: 1.2rem;
      margin-right: 12px;
    }

    .chevron-icon {
      color: var(--text-muted, #a1a1aa);
      font-size: 1rem;
    }

    .logout-section {
      padding: 2rem 1rem;
    }

    .logout-btn {
      width: 100%;
      padding: 0.9rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 12px;
      color: #ef4444;
      font-weight: 700;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .logout-btn:active {
      background: rgba(239, 68, 68, 0.2);
      transform: scale(0.98);
    }

    .logout-btn ion-icon {
      font-size: 1.2rem;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: var(--text-muted, #a1a1aa);
    }
  `]
})
export class ProfilePage implements AfterViewInit {
  auth = inject(AuthFacade);
  updateFacade = inject(AppUpdateFacade);
  gsap = inject(GsapAnimationsService);

  constructor() {
    addIcons({ logOutOutline, settingsOutline, chevronForwardOutline, cloudDownloadOutline });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      const options = document.querySelectorAll('.option-item, .logout-section');
      this.gsap.staggerListItems(options as any);
    }, 50);
  }

  async checkForUpdates() {
    await this.updateFacade.checkForUpdates();
  }

  async logout() {
    await this.auth.logout();
  }
}


