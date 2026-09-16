import { Component, ChangeDetectionStrategy, signal, computed, OnDestroy } from '@angular/core';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-rest-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
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
            <div class="finished-ripple"></div>
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
      .rest-timer-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1.25rem 0;
        gap: 1rem;
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
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
        stroke: rgba(255, 255, 255, 0.06);
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
      .ring-progress.urgent {
        stroke: var(--state-error);
      }

      .timer-text {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: color 0.3s ease;
      }

      .timer-text.urgent-text {
        animation: pulse-urgent 1s infinite;
      }
      .timer-text.urgent-text .timer-seconds,
      .timer-text.urgent-text .timer-label {
        color: var(--state-error) !important;
      }
      @keyframes pulse-urgent {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.08);
        }
        100% {
          transform: scale(1);
        }
      }

      .timer-seconds {
        font-family: var(--font-display);
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-primary, #fff);
        font-variant-numeric: tabular-nums;
        transition: color 0.3s ease;
      }

      .timer-label {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted, #a1a1aa);
        margin-top: 2px;
        transition: color 0.3s ease;
      }

      .finished-state {
        position: relative;
        width: 120px;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 34px; /* matches timer-actions height roughly to prevent jump */
      }
      .finished-ripple {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.2);
        border: 2px solid var(--ds-brand);
        animation: ripple-out 1.2s ease-out forwards;
      }
      .finished-text {
        position: relative;
        z-index: 10;
        font-size: 1.5rem;
        font-weight: 800;
        font-style: italic;
        color: var(--text-primary);
        margin: 0;
        text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }

      @keyframes ripple-out {
        0% {
          transform: scale(0.8);
          opacity: 1;
        }
        100% {
          transform: scale(2.5);
          opacity: 0;
        }
      }
      @keyframes pop-in {
        0% {
          transform: scale(0.5);
          opacity: 0;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      .timer-actions {
        display: flex;
        gap: 0.75rem;
      }

      .timer-action-btn {
        padding: 0.5rem 1.25rem;
        border-radius: 10px;
        border: none;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.15s ease;
        background: rgba(255, 255, 255, 0.06);
        color: var(--text-primary, #fff);
      }

      .timer-action-btn:active {
        transform: scale(0.95);
      }

      .timer-action-btn.skip {
        background: rgba(59, 130, 246, 0.15);
        color: var(--color-primary-hover);
      }

      .manual-rest-container {
        display: flex;
        justify-content: center;
        padding-top: 0.5rem;
        animation: fadeIn 0.3s ease;
      }
      .manual-rest-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1.25rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        color: var(--text-muted, #a1a1aa);
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .manual-rest-btn:active {
        transform: scale(0.95);
        background: rgba(255, 255, 255, 0.1);
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
