import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonSpinner } from '@ionic/angular';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ExerciseDefinition } from '@core/facades/exercise.facade';
import {
  getExerciseIcon,
  getStepPhase,
  isUntranslated,
  parseInstructions,
} from '@core/utils/exercise-detail.utils';
import { TranslateExercisePipe } from '@shared/pipes/translate-exercise.pipe';

/**
 * Detalle de un ejercicio: fotos, datos y guía paso a paso. Lo usan el
 * Catálogo y el selector de ejercicios, que antes tenían cada uno su
 * copia (spec 0007). Las acciones extra, como "Seleccionar Ejercicio",
 * entran por proyección de contenido.
 */
@Component({
  selector: 'app-exercise-detail',
  standalone: true,
  imports: [IonSpinner, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="detail">
      @if (exercise().images?.length) {
        <div class="detail-photos">
          @for (img of exercise().images; track img) {
            <div class="detail-photo">
              <ion-spinner color="primary" class="detail-photo-spinner"></ion-spinner>
              <img
                [src]="img"
                [alt]="'Ejecución de ' + (exercise().name_es || exercise().name_en)"
                class="detail-photo-img opacity-0"
                (load)="$any($event.target).classList.remove('opacity-0')"
                loading="lazy"
              />
            </div>
          }
        </div>
      } @else {
        <div class="detail-placeholder">
          <app-icon [name]="icono()" [size]="64" [ariaHidden]="true" />
        </div>
      }

      <div class="detail-stats">
        <div class="detail-stat">
          <span class="detail-label">Músculo</span>
          <span class="detail-value">
            <app-icon name="activity" [size]="16" [ariaHidden]="true" />
            {{ exercise().muscle }}
          </span>
        </div>
        <div class="detail-stat">
          <span class="detail-label">Equipo</span>
          <span class="detail-value">
            <app-icon name="dumbbell" [size]="16" [ariaHidden]="true" />
            {{ exercise().equipment }}
          </span>
        </div>
        <div class="detail-stat detail-stat--wide">
          <span class="detail-label">Categoría</span>
          <span class="detail-value">
            <app-icon name="tag" [size]="16" [ariaHidden]="true" />
            {{ exercise().category }}
          </span>
        </div>
      </div>

      <section class="detail-guide">
        <div class="detail-guide-head">
          <div class="detail-guide-title">
            <span class="detail-guide-icon">
              <app-icon name="list-checks" [size]="18" [ariaHidden]="true" />
            </span>
            <div>
              <h3 class="detail-h3">Guía de Ejecución</h3>
              <span class="detail-sub">Instrucciones paso a paso del Coach</span>
            </div>
          </div>
          @if (pasos().length > 0) {
            <span class="detail-count">{{ pasos().length }} pasos</span>
          }
        </div>

        @if (sinTraducir()) {
          <div class="detail-warning">
            <app-icon name="alert-triangle" [size]="18" [ariaHidden]="true" />
            <span>Instrucción en idioma original (pendiente de traducción).</span>
          </div>
        }

        @if (pasos().length > 0) {
          <ol class="detail-steps">
            @for (paso of pasos(); track $index) {
              <li class="detail-step">
                <span class="detail-step-num">{{ $index + 1 }}</span>
                <div class="detail-step-card">
                  <span class="detail-step-label">{{ fase($index) }}</span>
                  <p class="detail-step-text">{{ paso }}</p>
                </div>
              </li>
            }
          </ol>

          <div class="detail-tip">
            <app-icon name="info" [size]="16" [ariaHidden]="true" />
            <div class="detail-tip-body">
              <span class="detail-label">Consejo de Técnica</span>
              <span class="detail-tip-text">
                Controlá el tempo en la bajada (fase excéntrica) y evitá usar el impulso o balanceo
                para maximizar la activación muscular.
              </span>
            </div>
          </div>
        } @else {
          <div class="detail-empty">
            <app-icon name="info" [size]="24" [ariaHidden]="true" />
            <p>No hay instrucciones detalladas para este ejercicio.</p>
          </div>
        }
      </section>

      <ng-content />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .detail {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
        padding-bottom: var(--space-8);
      }

      .detail-photos {
        display: flex;
        min-height: 160px;
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-subtle);
        overflow: hidden;
      }
      /* Las fotos se apoyaban sobre blanco. */
      .detail-photo {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-subtle);
      }
      .detail-photo-spinner {
        position: absolute;
      }
      .detail-photo-img {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity var(--duration-fast) var(--ease-standard);
      }

      /* El único acento de marca decorativo del detalle. */
      .detail-placeholder {
        min-height: 160px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-subtle);
        background: radial-gradient(
          circle at center,
          var(--color-primary-tint),
          var(--bg-elevated) 70%
        );
        color: var(--text-secondary);
      }

      .detail-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
      }
      .detail-stat {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-4);
        border-radius: var(--radius-lg);
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
      }
      /* Categoría era morada: Eclipse no tiene ese color. */
      .detail-stat--wide {
        grid-column: span 2;
      }
      .detail-label {
        font-size: var(--text-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
      }
      .detail-value {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-base);
        font-weight: 700;
        text-transform: capitalize;
        color: var(--text-primary);
      }

      .detail-guide {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .detail-guide-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: var(--space-2);
        border-bottom: 1px solid var(--border-subtle);
      }
      .detail-guide-title {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      .detail-guide-icon {
        width: 2rem;
        height: 2rem;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-subtle);
        color: var(--text-secondary);
      }
      .detail-h3 {
        margin: 0;
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 700;
        color: var(--text-primary);
      }
      /* Medía 11px. */
      .detail-sub {
        font-size: var(--text-xs);
        color: var(--text-muted);
      }
      .detail-count {
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-full);
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--text-secondary);
      }

      /* Oro semántico: siempre como contorno. */
      .detail-warning {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3);
        border-radius: var(--radius-lg);
        background: var(--state-warning-bg);
        border: 1px solid var(--state-warning-border);
        color: var(--state-warning);
        font-size: var(--text-xs);
        font-weight: 600;
        line-height: 1.4;
      }

      .detail-steps {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .detail-step {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
      }
      /* Neutros: el orden lo dan los números. Antes el primero iba en
         ember, el último en verde (en Eclipse el verde es "logrado") y el
         número en negro puro, a 10px. */
      .detail-step-num {
        flex-shrink: 0;
        width: 1.75rem;
        height: 1.75rem;
        margin-top: var(--space-2);
        border-radius: var(--radius-full);
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-subtle);
        border: 1px solid var(--border-strong);
        color: var(--text-primary);
        font-family: var(--font-data);
        font-size: var(--text-xs);
        font-variant-numeric: tabular-nums;
      }
      .detail-step-card {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-3);
        border-radius: var(--radius-lg);
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
      }
      /* Medía 10px. */
      .detail-step-label {
        font-size: var(--text-xs);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
      }
      .detail-step-text {
        margin: 0;
        font-size: var(--text-sm);
        line-height: 1.6;
        color: var(--text-primary);
      }

      /* El fondo usaba --color-primary-rgb, que no existe, y caía a azul. */
      .detail-tip {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-3);
        border-radius: var(--radius-lg);
        background: var(--bg-elevated);
        border: 1px dashed var(--border-strong);
        color: var(--text-secondary);
      }
      .detail-tip-body {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
      .detail-tip-text {
        font-size: var(--text-xs);
        line-height: 1.6;
        color: var(--text-secondary);
      }

      .detail-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-6);
        border-radius: var(--radius-lg);
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
        color: var(--text-muted);
        text-align: center;
      }
      .detail-empty p {
        margin: 0;
        font-size: var(--text-sm);
      }
    `,
  ],
})
export class ExerciseDetailComponent {
  readonly exercise = input.required<ExerciseDefinition>();

  readonly icono = computed(() =>
    getExerciseIcon(this.exercise().muscle, this.exercise().category),
  );
  readonly pasos = computed(() =>
    parseInstructions(this.exercise().instructions_es || this.exercise().instructions_en),
  );
  readonly sinTraducir = computed(() =>
    isUntranslated(this.exercise().instructions_es, this.exercise().instructions_en),
  );

  fase(index: number): string {
    return getStepPhase(index, this.pasos().length).label;
  }
}
