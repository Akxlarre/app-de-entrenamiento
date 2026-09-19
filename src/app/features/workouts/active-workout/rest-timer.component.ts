import { Component, ChangeDetectionStrategy, signal, computed, OnDestroy } from '@angular/core';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-rest-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  // El anillo es un cronómetro: lo único que Tier 3 deja moverse.
  host: { class: 'tier-cronometro' },
  template: `
    @if (isActive()) {
      <div class="rest-timer-container">
        @if (!isFinished()) {
          <div class="timer-ring">
            <svg viewBox="0 0 100 100" class="ring-svg">
              <circle cx="50" cy="50" r="42" class="ring-bg" />
              <circle
                cx="50"
                cy="50"
                r="42"
                class="ring-progress"
                [class.urgent]="isUrgent()"
                [style.stroke-dashoffset]="dashOffset()"
              />
            </svg>
            <div class="timer-text" [class.urgent-text]="isUrgent()">
              <span class="timer-seconds">{{ remainingFormatted() }}</span>
              <span class="timer-label">descanso</span>
            </div>
          </div>

          <div class="timer-actions">
            <button class="timer-action-btn" (click)="addTime(-15)">-15s</button>
            <button class="timer-action-btn" (click)="addTime(30)">+30s</button>
            <button class="timer-action-btn" (click)="addTime(60)">+1m</button>
            <button class="timer-action-btn skip" (click)="skip()">Saltar</button>
          </div>
        } @else {
          <div class="finished-state">
            <h2 class="finished-text">¡A DARLE!</h2>
          </div>
        }
      </div>
    } @else {
      <div class="manual-rest-container">
        <button class="manual-rest-btn" (click)="start()">
          <app-icon name="clock" [size]="16"></app-icon>
          Iniciar Descanso
        </button>
      </div>
    }
  `,
  styles: [
    `
      /* Tier 3: el anillo es el cronómetro y es lo único que se mueve.
         Se fueron la entrada animada, el pulso de lo urgente, el destello
         y el "pop" de "¡A DARLE!", todos en @keyframes propios. */
      .rest-timer-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--space-4) 0;
        gap: var(--space-4);
      }

      .timer-ring {
        position: relative;
        width: 120px;
        height: 120px;
      }

      .ring-svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .ring-bg {
        fill: none;
        stroke: var(--border-default);
        stroke-width: 6;
      }

      .ring-progress {
        fill: none;
        stroke: var(--ds-brand);
        stroke-width: 6;
        stroke-linecap: round;
        stroke-dasharray: 263.89;
        transition:
          stroke-dashoffset 1s linear,
          stroke 0.3s ease;
      }
      /* Aviso, no error: que el descanso se termine no es una falla. */
      .ring-progress.urgent {
        stroke: var(--state-warning);
      }

      .timer-text {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .timer-text.urgent-text .timer-seconds {
        color: var(--state-warning);
      }

      /* Iba en Anton. */
      .timer-seconds {
        font-family: var(--font-data);
        font-size: var(--text-3xl);
        font-weight: var(--font-semibold);
        line-height: 1.1;
        color: var(--text-primary);
        font-variant-numeric: tabular-nums;
      }

      /* Medía 11.2px. */
      .timer-label {
        font-size: var(--text-xs);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      /* Mismo alto que anillo + acciones, para que nada salte. */
      .finished-state {
        width: 120px;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: calc(var(--space-4) + var(--target-min-critical));
      }
      .finished-text {
        font-family: var(--font-data);
        font-size: var(--text-2xl);
        font-weight: var(--font-bold);
        color: var(--ds-brand);
        margin: 0;
      }

      .timer-actions {
        display: flex;
        gap: var(--space-2);
      }

      /* Medían 34px. */
      .timer-action-btn {
        min-width: var(--target-min-critical);
        min-height: var(--target-min-critical);
        padding: 0 var(--space-4);
        border-radius: 12px;
        border: 1px solid var(--border-default);
        background: var(--bg-surface);
        color: var(--text-primary);
        font-family: var(--font-data);
        font-weight: var(--font-semibold);
        font-size: var(--text-base);
        font-variant-numeric: tabular-nums;
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .timer-action-btn:active {
        transform: scale(0.95);
        background: var(--bg-elevated);
      }
      /* Iba en el azul de la marca anterior. */
      .timer-action-btn.skip {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--text-secondary);
      }

      .manual-rest-container {
        display: flex;
        justify-content: center;
        padding-top: var(--space-2);
      }
      /* Medía 37px. */
      .manual-rest-btn {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        min-height: var(--target-min-critical);
        padding: 0 var(--space-5);
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-full);
        color: var(--text-secondary);
        font-weight: var(--font-semibold);
        font-size: var(--text-sm);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .manual-rest-btn:active {
        transform: scale(0.95);
        background: var(--bg-elevated);
        color: var(--text-primary);
      }
    `,
  ],
})
export class RestTimerComponent implements OnDestroy {
  private readonly CIRCUMFERENCE = 2 * Math.PI * 42; // ~263.89
  private timerId: any;

  readonly defaultDuration = signal(
    parseInt(localStorage.getItem('fittrack_default_rest') || '90', 10),
  );
  readonly isActive = signal(false);
  readonly showMini = signal(false);
  readonly totalSeconds = signal(this.defaultDuration());
  readonly remainingSeconds = signal(this.defaultDuration());

  readonly isFinished = signal(false);

  readonly isUrgent = computed(() => {
    const r = this.remainingSeconds();
    return r > 0 && r <= 5;
  });

  constructor() {
    this.restoreTimer();
  }

  changeDefault(event: Event) {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    this.defaultDuration.set(val);
    localStorage.setItem('fittrack_default_rest', val.toString());
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
      }
    }, 1000);
  }

  addTime(seconds: number) {
    const saved = localStorage.getItem('fittrack_rest_timer');
    let targetEndTime = Date.now() + (this.remainingSeconds() + seconds) * 1000;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        targetEndTime = parsed.targetEndTime + seconds * 1000;
      } catch (e) {}
    }

    this.totalSeconds.update((t) => t + seconds);
    const newRemaining = Math.ceil((targetEndTime - Date.now()) / 1000);
    this.remainingSeconds.set(newRemaining);

    localStorage.setItem(
      'fittrack_rest_timer',
      JSON.stringify({
        targetEndTime,
        total: this.totalSeconds(),
      }),
    );

    this.runCountdown(targetEndTime);
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

    // Haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([400, 150, 400, 150, 600]);
    }

    // Show celebration state
    this.isFinished.set(true);

    // Auto hide after 1.5s
    setTimeout(() => {
      this.isActive.set(false);
      this.isFinished.set(false);
    }, 1500);
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
