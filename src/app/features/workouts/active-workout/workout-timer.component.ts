import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';

@Component({
  selector: 'app-workout-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // El cronómetro es lo único de Tier 3 que puede moverse (_tiers.scss).
  host: { class: 'tier-cronometro' },
  template: ` <span class="timer-display">{{ formattedTime() }}</span> `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      /* Iba en Anton: Tier 3 la prohíbe, y en un número que cambia
         cada segundo las cifras de ancho fijo evitan que tiemble. */
      .timer-display {
        font-family: var(--font-data);
        font-size: var(--text-4xl);
        font-weight: var(--font-semibold);
        letter-spacing: 0.02em;
        color: var(--ds-brand);
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class WorkoutTimerComponent implements OnInit, OnDestroy {
  startTime = input.required<Date>();

  private timerId: any;
  private elapsedSeconds = signal<number>(0);

  formattedTime = computed(() => {
    const totalSeconds = this.elapsedSeconds();
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');

    // Opcional: mostrar horas si pasa de 60 mins
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${remainingMins.toString().padStart(2, '0')}:${ss}`;
    }

    return `${mm}:${ss}`;
  });

  ngOnInit() {
    this.updateElapsed();
    this.timerId = setInterval(() => {
      this.updateElapsed();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  private updateElapsed() {
    const raw = this.startTime();
    if (!raw) return;
    const start = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
    if (isNaN(start)) return;
    const now = new Date().getTime();
    const diff = Math.max(0, Math.floor((now - start) / 1000));
    this.elapsedSeconds.set(diff);
  }
}
