import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { WorkoutHistoryItem } from '@core/facades/workout.facade';
import { nombreTipoSerie } from '@core/utils/set-type.utils';

/** Letra de cada tipo especial en el historial; la serie normal no lleva. */
const LETRAS_TIPO_SERIE: Record<string, string> = {
  warmup: 'W',
  dropset: 'D',
  failure: 'F',
};

import { IconComponent } from '@shared/components/icon/icon.component';

/**
 * Detalle de una sesión pasada. Lo usan Entrenar e Historial, que antes
 * tenían cada uno su copia escrita con estilos en línea (spec 0008).
 */
@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [DatePipe, DecimalPipe, TitleCasePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sd">
      <div class="sd-head">
        <div>
          <div class="sd-label">Fecha</div>
          <div class="sd-text">
            {{ workout().start_time | date: 'EEEE, d MMMM yyyy' | titlecase }}
          </div>
        </div>
        <div class="sd-right">
          <div class="sd-label">Duración</div>
          <div class="sd-text">
            <span class="sd-num">{{ workout().duration_minutes }}</span> min
          </div>
        </div>
      </div>

      <div class="sd-kpis">
        <div class="sd-kpi">
          <div class="sd-kpi-value">{{ workout().total_volume | number: '1.0-0' }}</div>
          <div class="sd-label">Volumen (kg)</div>
        </div>
        <div class="sd-kpi">
          <div class="sd-kpi-value">{{ workout().total_sets }}</div>
          <div class="sd-label">Series Totales</div>
        </div>
      </div>

      @if (workout().energy_level || workout().session_rpe || workout().notes) {
        <div class="sd-report">
          @if (workout().energy_level || workout().session_rpe) {
            <div class="sd-report-row">
              @if (workout().energy_level) {
                <div>
                  <div class="sd-label">Energía</div>
                  <div class="sd-text">
                    <span class="sd-num">{{ workout().energy_level }}</span
                    >/5
                  </div>
                </div>
              }
              @if (workout().session_rpe) {
                <div>
                  <div class="sd-label">RPE</div>
                  <div class="sd-text">
                    <span class="sd-num">{{ workout().session_rpe }}</span
                    >/10
                  </div>
                </div>
              }
            </div>
          }
          @if (workout().notes) {
            <div>
              <div class="sd-label">Notas</div>
              <div class="sd-text sd-notes">{{ workout().notes }}</div>
            </div>
          }
        </div>
      }

      <section>
        <h4 class="sd-h4">Ejercicios Realizados</h4>
        <div class="sd-exercises">
          @for (ex of workout().detailed_exercises; track ex.name) {
            <div class="sd-exercise">
              <div class="sd-exercise-name">{{ ex.name }}</div>
              <div class="sd-sets">
                @for (set of ex.sets; track set.set_number; let i = $index) {
                  <div class="sd-set">
                    <div class="sd-set-id">
                      <span class="sd-set-n">S{{ i + 1 }}</span>
                      @if (tipoSerie(set.set_type); as tipo) {
                        <span
                          class="set-type"
                          [attr.aria-label]="tipo.nombre"
                          [title]="tipo.nombre"
                        >
                          {{ tipo.letra }}
                        </span>
                      }
                    </div>
                    <div class="sd-num">{{ set.weight }} kg</div>
                    <div class="sd-num">{{ set.reps }} reps</div>
                    <div class="sd-rir">RIR: {{ set.rir ?? '-' }}</div>
                  </div>
                }
              </div>
              @if (ex.feedback) {
                <div class="sd-feedback">
                  <div class="sd-feedback-header">
                    <span class="sd-label" style="display: flex; align-items: center; gap: 4px;">
                      <app-icon name="message-circle" [size]="14"></app-icon> Feedback
                    </span>
                    @if (ex.feedback.rating) {
                      <span class="sd-feedback-rating">★ {{ ex.feedback.rating }}/5</span>
                    }
                  </div>
                  @if (ex.feedback.categories.length) {
                    <div class="sd-feedback-tags">
                      @for (cat of ex.feedback.categories; track cat) {
                        <span class="sd-feedback-tag">{{ translateCategory(cat) }}</span>
                      }
                    </div>
                  }
                  @if (ex.feedback.notes) {
                    <div class="sd-text sd-notes" style="margin-top: 8px;">{{ ex.feedback.notes }}</div>
                  }
                </div>
              }
            </div>
          }
          @if (workout().detailed_exercises.length === 0) {
            <div class="sd-empty">No se registraron ejercicios detallados.</div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .sd {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        max-width: 600px;
        margin: 0 auto;
        color: var(--text-primary);
      }

      .sd-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: var(--space-4);
        border-bottom: 1px solid var(--border-subtle);
      }
      .sd-right {
        text-align: right;
      }

      /* Medían 12.8px. */
      .sd-label {
        font-size: var(--text-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
      }
      .sd-text {
        font-weight: 500;
      }
      .sd-num {
        font-family: var(--font-data);
        font-variant-numeric: tabular-nums;
      }

      .sd-kpis {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
      }
      .sd-kpi {
        padding: var(--space-4);
        border-radius: var(--radius-lg);
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
        text-align: center;
      }
      /* Hueso y no ember: dos cifras en ember por pantalla pasaban la
         regla 3-2-1. */
      .sd-kpi-value {
        font-family: var(--font-data);
        font-variant-numeric: tabular-nums;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .sd-report {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-4);
        border-radius: var(--radius-lg);
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
      }
      .sd-report-row {
        display: flex;
        gap: var(--space-6);
      }
      .sd-notes {
        font-style: italic;
      }

      .sd-h4 {
        margin: var(--space-2) 0 var(--space-3);
        font-family: var(--font-body);
        font-size: var(--text-base);
        font-weight: 700;
        color: var(--text-primary);
      }
      .sd-exercises {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .sd-exercise {
        border-radius: var(--radius-lg);
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
        overflow: hidden;
      }
      .sd-exercise-name {
        padding: var(--space-3) var(--space-4);
        background: var(--bg-subtle);
        border-bottom: 1px solid var(--border-subtle);
        font-weight: 600;
      }
      .sd-sets {
        padding: var(--space-2) var(--space-4);
      }
      .sd-set {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--border-subtle);
        font-size: var(--text-sm);
      }
      .sd-set:last-child {
        border-bottom: none;
      }
      .sd-set-id {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        width: 80px;
      }
      .sd-set-n {
        font-family: var(--font-data);
        font-weight: 600;
        color: var(--text-muted);
      }

      /* Neutras: el tipo de serie no es un estado. Iban en amarillo y
         morado, que Eclipse no tiene, y "al fallo" en rojo, que lee como
         error. Medían 10.4px. */
      .set-type {
        padding: 0 var(--space-2);
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-strong);
        font-size: var(--text-xs);
        font-weight: 700;
        color: var(--text-secondary);
      }

      .sd-rir {
        font-size: var(--text-xs);
        color: var(--text-muted);
      }
      .sd-empty {
        padding: var(--space-4);
        text-align: center;
        font-size: var(--text-sm);
        color: var(--text-muted);
      }
      .sd-feedback {
        margin: var(--space-2) var(--space-4) var(--space-4);
        padding: var(--space-3);
        background: var(--bg-base);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
      }
      .sd-feedback-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-2);
      }
      .sd-feedback-rating {
        font-size: var(--text-sm);
        font-weight: 700;
        color: var(--ds-brand);
      }
      .sd-feedback-tags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }
      .sd-feedback-tag {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: var(--radius-full);
        background: var(--bg-subtle);
        color: var(--text-secondary);
        font-weight: 600;
        border: 1px solid var(--border-subtle);
      }
    `,
  ],
})
export class SessionDetailComponent {
  readonly workout = input.required<WorkoutHistoryItem>();

  /** Letra y nombre completo del tipo de serie; null para una serie normal. */
  tipoSerie(tipo: string): { letra: string; nombre: string } | null {
    const letra = LETRAS_TIPO_SERIE[tipo];
    return letra ? { letra, nombre: nombreTipoSerie(tipo) } : null;
  }

  translateCategory(cat: string): string {
    const map: Record<string, string> = {
      technique: 'Técnica',
      pain: 'Molestia Física',
      equipment: 'Equipo',
      intensity: 'Intensidad',
      other: 'Otro'
    };
    return map[cat] || cat;
  }
}
