import {
  Component,
  ChangeDetectionStrategy,
  computed,
  signal,
  OnDestroy,
  inject,
  ElementRef,
  effect,
} from '@angular/core';
import { GsapAnimationsService } from '../../../core/services/ui/gsap-animations.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import gsap from 'gsap';

@Component({
  selector: 'app-rest-timer',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tier-cronometro' },
  template: `
    <div class="sticky-wrapper">
      @if (isActive()) {
        <div class="rest-timer-premium-card" [class.is-finished]="isFinished()">
          <!-- Izquierda: Indicador Circular Elegante -->
          <div class="rest-info">
            <div class="mini-ring">
              <svg viewBox="0 0 48 48" class="ring-svg">
                <circle cx="24" cy="24" r="21" class="ring-bg" />
                <circle
                  cx="24"
                  cy="24"
                  r="21"
                  class="ring-progress"
                  [class.urgent]="isUrgent() && !isFinished()"
                  [class.success]="isFinished()"
                  [style.stroke-dashoffset]="isFinished() ? 0 : dashOffset()"
                />
              </svg>
              <div class="ring-time" [class.urgent-text]="isUrgent() && !isFinished()">
                @if (isFinished()) {
                  <app-icon name="check" [size]="20" class="success-check"></app-icon>
                } @else {
                  {{ remainingFormatted() }}
                }
              </div>
            </div>
            <span class="rest-label" [class.success-text]="isFinished()">
              {{ isFinished() ? 'Completado' : 'Descanso' }}
            </span>
          </div>

          <!-- Derecha: Controles precisos -->
          <div class="rest-controls" [class.hide-controls]="isFinished()">
            <div class="time-adjust-group">
              <button class="adjust-btn" (click)="addTime(-15)" aria-label="Restar 15 segundos">
                -15
              </button>
              <div class="separator"></div>
              <button class="adjust-btn" (click)="addTime(15)" aria-label="Sumar 15 segundos">
                +15
              </button>
              <div class="separator"></div>
              <button class="adjust-btn" (click)="addTime(30)" aria-label="Sumar 30 segundos">
                +30
              </button>
            </div>
            
            <button class="skip-btn" (click)="skip()" aria-label="Saltar descanso">
              <app-icon name="fast-forward" [size]="16"></app-icon>
            </button>
          </div>
        </div>
      } @else {
        <div class="manual-rest-container">
          <button class="manual-rest-btn" (click)="start()">
            <app-icon name="timer" [size]="16"></app-icon>
            Iniciar Descanso
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .sticky-wrapper {
        position: sticky;
        top: var(--space-2);
        z-index: 50;
        display: flex;
        justify-content: center;
        padding: 0 var(--space-4) var(--space-4) var(--space-4);
        /* Quitamos el margen negativo para que no se pegue tanto arriba */
      }

      /* === ESTADO EXPANDIDO (PREMIUM CARD) === */
      .rest-timer-premium-card {
        width: 100%;
        max-width: 400px;
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        border-radius: 100px; /* Forma de píldora redonda */
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-2) var(--space-3) var(--space-2) var(--space-2);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      /* Info Izquierda */
      .rest-info {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }

      .rest-label {
        font-size: var(--text-sm);
        font-weight: var(--font-semibold);
        color: var(--text-secondary);
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }

      /* Mini Ring (Estilo Apple Watch) */
      .mini-ring {
        position: relative;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ring-svg {
        position: absolute;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .ring-bg {
        fill: none;
        stroke: var(--bg-elevated);
        stroke-width: 4;
      }

      .ring-progress {
        fill: none;
        stroke: var(--ds-brand);
        stroke-width: 4;
        stroke-linecap: round;
        stroke-dasharray: 131.95; /* 2 * PI * 21 */
        transition: stroke-dashoffset 1s linear, stroke 0.3s ease;
      }
      .ring-progress.urgent {
        stroke: var(--state-warning);
      }
      .ring-progress.success {
        stroke: var(--state-success, #10b981); /* fallback */
        transition: stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease;
      }

      .ring-time {
        font-family: var(--font-data);
        font-size: var(--text-sm);
        font-weight: var(--font-bold);
        color: var(--text-primary);
        font-variant-numeric: tabular-nums;
        transition: color 0.3s ease;
      }
      .ring-time.urgent-text {
        color: var(--state-warning);
      }
      .success-check {
        color: var(--state-success, #10b981);
      }
      .success-text {
        color: var(--state-success, #10b981);
        font-weight: var(--font-bold);
      }

      /* Controles Derecha */
      .rest-controls {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        transition: all 0.3s ease;
      }
      .hide-controls {
        opacity: 0;
        pointer-events: none;
        transform: translateX(10px);
      }

      .time-adjust-group {
        display: flex;
        align-items: center;
        background: var(--bg-elevated);
        border-radius: var(--radius-full);
        border: 1px solid var(--border-subtle);
        overflow: hidden;
      }

      .adjust-btn {
        padding: var(--space-2) var(--space-3);
        background: transparent;
        color: var(--text-primary);
        font-family: var(--font-data);
        font-size: var(--text-sm);
        font-weight: var(--font-semibold);
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .adjust-btn:active {
        background: var(--border-default);
      }

      .separator {
        width: 1px;
        height: 16px;
        background: var(--border-default);
      }

      .skip-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--bg-elevated);
        color: var(--text-secondary);
        border: 1px solid var(--border-subtle);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .skip-btn:active {
        transform: scale(0.9);
        background: var(--border-default);
        color: var(--text-primary);
      }

      /* === ESTADO INACTIVO (MANUAL) === */
      .manual-rest-container {
        display: flex;
        justify-content: center;
      }
      .manual-rest-btn {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        min-height: 40px;
        padding: 0 var(--space-5);
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-full);
        color: var(--text-primary);
        font-weight: var(--font-semibold);
        font-size: var(--text-sm);
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .manual-rest-btn:active {
        transform: scale(0.95);
        background: var(--bg-elevated);
      }
    `,
  ],
})
export class RestTimerComponent implements OnDestroy {
  private readonly CIRCUMFERENCE = 2 * Math.PI * 21; // ~131.95
  private timerId: any;
  private gsapSvc = inject(GsapAnimationsService);
  private el = inject(ElementRef);

  readonly defaultDuration = signal(
    parseInt(localStorage.getItem('fittrack_default_rest') || '90', 10),
  );
  readonly isActive = signal(false);
  readonly totalSeconds = signal(this.defaultDuration());
  readonly remainingSeconds = signal(this.defaultDuration());

  readonly isFinished = signal(false);

  readonly isUrgent = computed(() => {
    const r = this.remainingSeconds();
    return r > 0 && r <= 5;
  });

  constructor() {
    this.restoreTimer();

    // Efecto GSAP para animar la entrada de la isla cuando se activa
    effect(() => {
      const active = this.isActive();
      if (active && this.gsapSvc.canAnimate()) {
        setTimeout(() => {
          const expanded = this.el.nativeElement.querySelector('.rest-timer-premium-card');
          if (expanded) {
            gsap.fromTo(expanded, 
              { scale: 0.85, y: -8, opacity: 0 }, 
              { scale: 1, y: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.2)', clearProps: 'transform' }
            );
          }
        }, 0);
      }
    });
  }

  readonly remainingFormatted = computed(() => {
    const s = this.remainingSeconds();
    const min = Math.floor(s / 60);
    const sec = s % 60;
    if (min > 0) return `${min}:${sec.toString().padStart(2, '0')}`;
    return `${s}`;
  });

  readonly dashOffset = computed(() => {
    const progress = this.remainingSeconds() / this.totalSeconds();
    return this.CIRCUMFERENCE * (1 - progress);
  });

  private restoreTimer() {
    const saved = localStorage.getItem('fittrack_rest_timer');
    if (saved) {
      try {
        const { targetEndTime, total } = JSON.parse(saved);
        const remaining = Math.ceil((targetEndTime - Date.now()) / 1000);
        if (remaining > 0) {
          this.totalSeconds.set(total || this.defaultDuration());
          this.remainingSeconds.set(remaining);
          this.isActive.set(true);
          this.isFinished.set(false);
          this.runCountdown(targetEndTime);
        } else {
          localStorage.removeItem('fittrack_rest_timer');
        }
      } catch (e) {
        localStorage.removeItem('fittrack_rest_timer');
      }
    }
  }

  start(duration?: number) {
    this.clearTimer();
    const d = duration ?? this.defaultDuration();
    const targetEndTime = Date.now() + d * 1000;

    localStorage.setItem(
      'fittrack_rest_timer',
      JSON.stringify({
        targetEndTime,
        total: d,
      }),
    );

    this.totalSeconds.set(d);
    this.remainingSeconds.set(d);
    this.isActive.set(true);
    this.isFinished.set(false);

    this.runCountdown(targetEndTime);
  }

  private runCountdown(targetEndTime: number) {
    this.clearTimer();
    this.timerId = setInterval(() => {
      const remaining = Math.ceil((targetEndTime - Date.now()) / 1000);
      if (remaining <= 0) {
        this.finish();
      } else {
        this.remainingSeconds.set(remaining);
        
        // Efecto GSAP de latido cuando es urgente
        if (remaining <= 5 && this.gsapSvc.canAnimate()) {
           const timeText = this.el.nativeElement.querySelector('.ring-time');
           if (timeText) {
             gsap.fromTo(timeText, 
               { scale: 1.2 }, 
               { scale: 1, duration: 0.4, ease: 'power2.out', clearProps: 'transform' }
             );
           }
        }
      }
    }, 1000);
  }

  addTime(seconds: number) {
    const saved = localStorage.getItem('fittrack_rest_timer');
    let targetEndTime = Date.now() + (this.remainingSeconds() + seconds) * 1000;
    
    // Evitar que el tiempo sea menor a 0
    if (targetEndTime < Date.now()) {
      targetEndTime = Date.now();
    }
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        targetEndTime = parsed.targetEndTime + seconds * 1000;
        if (targetEndTime < Date.now()) {
           targetEndTime = Date.now();
        }
      } catch (e) {}
    }

    this.totalSeconds.update((t) => Math.max(1, t + seconds));
    const newRemaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
    this.remainingSeconds.set(newRemaining);

    if (newRemaining === 0) {
      this.finish();
      return;
    }

    localStorage.setItem(
      'fittrack_rest_timer',
      JSON.stringify({
        targetEndTime,
        total: this.totalSeconds(),
      }),
    );

    this.runCountdown(targetEndTime);
    
    // Feedback visual
    if (this.gsapSvc.canAnimate()) {
      const expanded = this.el.nativeElement.querySelector('.rest-timer-premium-card');
      if (expanded) {
        gsap.fromTo(expanded, 
          { scale: 1.01 }, 
          { scale: 1, duration: 0.2, ease: 'power2.out', clearProps: 'transform' }
        );
      }
    }
  }

  skip() {
    this.clearTimer();
    localStorage.removeItem('fittrack_rest_timer');
    this.isActive.set(false);
    this.isFinished.set(false);
  }

  private finish() {
    this.clearTimer();
    localStorage.removeItem('fittrack_rest_timer');

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([400, 150, 400, 150, 600]);
    }

    this.isFinished.set(true);
    
    if (this.gsapSvc.canAnimate()) {
      const card = this.el.nativeElement.querySelector('.rest-timer-premium-card');
      if (card) {
        gsap.fromTo(card, 
          { scale: 1.02 }, 
          { scale: 1, duration: 0.3, ease: 'back.out(2)' }
        );
      }
    }

    // 1 segundo para admirar el checkmark antes de colapsar
    setTimeout(() => {
      this.isActive.set(false);
      this.isFinished.set(false);
    }, 1200);
  }

  private clearTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  ngOnDestroy() {
    this.clearTimer();
  }
}
