import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MesocycleWeek } from '@core/models/mesocycle.model';

@Component({
  selector: 'app-meso-timeline',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="timeline-container">
      <div class="timeline-track">
        @for (week of weeks(); track week.id; let i = $index) {
          <button 
            class="week-node" 
            [class.is-active]="selectedWeekId() === week.id"
            [class.is-past]="week.week_number < currentWeekNumber()"
            [class.is-current]="week.week_number === currentWeekNumber()"
            [class.is-deload]="week.is_deload"
            (click)="selectWeek.emit(week.id)">
            
            <div class="node-circle">
              @if (week.week_number < currentWeekNumber()) {
                <span class="icon">✓</span>
              } @else if (week.is_deload) {
                <span class="icon">🔋</span>
              } @else {
                <span class="number">{{ week.week_number }}</span>
              }
            </div>
            <span class="node-label">Sem {{ week.week_number }}</span>
          </button>
          
          @if (i < weeks().length - 1) {
            <div class="timeline-connector" [class.is-past]="week.week_number < currentWeekNumber()"></div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .timeline-container {
      width: 100%;
      overflow-x: auto;
      padding: 1.5rem 1rem;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .timeline-container::-webkit-scrollbar {
      display: none;
    }

    .timeline-track {
      display: inline-flex;
      align-items: center;
      min-width: min-content;
      gap: 4px;
    }

    .week-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      opacity: 0.6;
      transition: all 0.2s ease;
      min-width: 48px;
    }
    .week-node:hover {
      opacity: 0.8;
    }
    .week-node.is-active, .week-node.is-current {
      opacity: 1;
    }

    .node-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.5);
      transition: all 0.3s ease;
    }

    .node-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
    }

    .week-node.is-past .node-circle {
      background: rgba(16, 185, 129, 0.1);
      border-color: #10b981;
      color: #10b981;
    }
    
    .week-node.is-current .node-circle {
      background: rgba(59, 130, 246, 0.15);
      border-color: #3b82f6;
      color: #3b82f6;
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
    }
    .week-node.is-current .node-label {
      color: #3b82f6;
    }

    .week-node.is-active:not(.is-current) .node-circle {
      border-color: #fff;
      color: #fff;
    }
    .week-node.is-active .node-label {
      color: #fff;
    }

    .week-node.is-deload .node-circle {
      border-style: dashed;
    }

    .timeline-connector {
      height: 2px;
      width: 32px;
      background: rgba(255, 255, 255, 0.1);
      margin-bottom: 20px;
      border-radius: 2px;
    }
    .timeline-connector.is-past {
      background: #10b981;
    }

    .icon { font-size: 1rem; }
    .number { font-size: 0.9rem; font-weight: 700; }
  `]
})
export class MesoTimelineComponent {
  weeks = input.required<MesocycleWeek[]>();
  currentWeekNumber = input.required<number>();
  selectedWeekId = input<string | null>(null);
  
  selectWeek = output<string>();
}
