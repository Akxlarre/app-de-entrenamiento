import { Component, ChangeDetectionStrategy, input, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MesocycleSession } from '@core/models/mesocycle.model';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-week-detail',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="week-detail-container">
      <h3 class="section-title">Sesiones de la Semana</h3>

      @if (sessions().length === 0) {
        <div class="empty-state">
          <p>No hay sesiones programadas para esta semana.</p>
        </div>
      } @else {
        <div class="sessions-accordion">
          @for (session of sessions(); track session.id) {
            <div class="session-card" [class.is-expanded]="isExpanded(session.id)">
              <div class="session-header" (click)="toggleSession(session.id)">
                <div class="session-info">
                  <span class="day-badge">Día {{ session.day_number }}</span>
                  <span class="routine-name">{{
                    session.routine?.name || 'Rutina Desconocida'
                  }}</span>
                </div>

                <div class="header-right">
                  <span class="status-badge" [class.completed]="session.status === 'completed'">
                    {{ session.status === 'completed' ? 'Completada' : 'Pendiente' }}
                  </span>
                  @if (session.status === 'pending') {
                    <button
                      class="icon-btn play-btn"
                      (click)="onStartClick($event, session)"
                      title="Iniciar Sesión"
                    >
                      <app-icon name="play" [size]="16"></app-icon>
                    </button>
                  }
                  <app-icon
                    [name]="isExpanded(session.id) ? 'chevron-up' : 'chevron-down'"
                    [size]="16"
                    class="chevron-icon"
                  >
                  </app-icon>
                </div>
              </div>

              @if (isExpanded(session.id)) {
                <div class="session-targets animate-fade-in">
                  @if (!session.targets || session.targets.length === 0) {
                    <p class="no-targets">Sin objetivos específicos. Se usará tu historial.</p>
                  } @else {
                    <div class="target-table">
                      <div class="target-header">
                        <span>Ejercicio</span>
                        <span>Objetivo Prescrito</span>
                      </div>

                      @for (target of groupedTargets(session.targets); track target.exercise_id) {
                        <div class="target-row">
                          <div class="exercise-name">
                            {{ target.name_es || target.name_en || 'Ejercicio' }}
                          </div>
                          <div class="sets-list">
                            @for (set of target.sets; track set.set_number) {
                              <div class="set-pill">
                                <span class="set-num">S{{ set.set_number }}</span>
                                @if (set.target_weight) {
                                  <span class="val">{{ set.target_weight }}kg</span>
                                }
                                @if (set.target_reps) {
                                  <span class="val">x {{ set.target_reps }}</span>
                                }
                                @if (set.target_rir) {
                                  <span class="val rir">@RIR{{ set.target_rir }}</span>
                                }
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .week-detail-container {
        padding: 0 1rem;
      }
      .section-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-muted, var(--text-muted));
        margin-bottom: 1rem;
      }

      .sessions-accordion {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .session-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.2s ease;
      }
      .session-card.is-expanded {
        border-color: transparent;
        background: rgba(255, 255, 255, 0.04);
      }

      .session-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        cursor: pointer;
        user-select: none;
      }
      .session-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .day-badge {
        background: var(--bg-elevated);
        color: var(--ds-brand);
        padding: 3px 8px;
        border-radius: 6px;
        font-size: var(--text-floor, 13px);
        font-weight: 700;
      }
      .routine-name {
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--text-primary);
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .status-badge {
        font-size: var(--text-floor, 13px);
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 4px;
        background: var(--border-subtle);
        color: var(--text-secondary);
      }
      .status-badge.completed {
        background: color-mix(in srgb, var(--state-success) 15%, transparent);
        color: var(--state-success);
      }

      .chevron-icon {
        color: rgba(255, 255, 255, 0.4);
        transition: transform 0.2s ease;
      }

      .icon-btn.play-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, var(--state-success) 15%, transparent);
        color: var(--state-success);
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        cursor: pointer;
      }

      .session-targets {
        padding: 0 1rem 1rem 1rem;
        border-top: 1px solid var(--bg-elevated);
      }

      .target-table {
        background: rgba(0, 0, 0, 0.25);
        border-radius: 8px;
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: 0.75rem;
      }
      .target-header {
        display: flex;
        justify-content: space-between;
        font-size: var(--text-floor, 13px);
        font-weight: 700;
        color: rgba(255, 255, 255, 0.4);
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .target-row {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px dashed var(--bg-elevated);
      }
      .target-row:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .exercise-name {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-primary);
      }
      .sets-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .set-pill {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        padding: 4px 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: var(--text-floor, 13px);
      }
      .set-num {
        font-weight: 700;
        color: rgba(255, 255, 255, 0.4);
        margin-right: 2px;
      }
      .val {
        font-weight: 600;
        color: #e2e8f0;
      }
      .val.rir {
        color: #f87171;
      }
      .no-targets {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.4);
        font-style: italic;
        margin-top: 0.75rem;
      }
      .empty-state {
        padding: 1.5rem;
        text-align: center;
        color: rgba(255, 255, 255, 0.4);
        font-size: 0.9rem;
      }
    `,
  ],
})
export class WeekDetailComponent {
  sessions = input.required<MesocycleSession[]>();
  startSession = output<MesocycleSession>();

  // State to track expanded cards (all expanded by default or first expanded)
  expandedSessions = signal<Set<string>>(new Set());

  constructor() {}

  toggleSession(id: string) {
    this.expandedSessions.update((current) => {
      const newSet = new Set(current);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  isExpanded(id: string) {
    // If not set explicitly yet, default to expanded
    if (this.expandedSessions().size === 0) {
      return true;
    }
    return this.expandedSessions().has(id);
  }

  onStartClick(event: Event, session: MesocycleSession) {
    event.stopPropagation();
    this.startSession.emit(session);
  }

  groupedTargets(targets: any[]) {
    if (!targets) return [];

    const groups = new Map<string, any>();

    for (const t of targets) {
      if (!groups.has(t.exercise_id)) {
        groups.set(t.exercise_id, {
          exercise_id: t.exercise_id,
          name_es: t.exercises?.name_es,
          name_en: t.exercises?.name_en,
          sets: [],
        });
      }
      groups.get(t.exercise_id).sets.push(t);
    }

    const result = Array.from(groups.values());
    result.forEach((g) => g.sets.sort((a: any, b: any) => a.set_number - b.set_number));
    return result;
  }
}



