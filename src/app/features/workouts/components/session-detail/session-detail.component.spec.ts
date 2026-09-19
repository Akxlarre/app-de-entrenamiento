import { TestBed } from '@angular/core/testing';
import { SessionDetailComponent } from './session-detail.component';
import { WorkoutHistoryItem } from '@core/facades/workout.facade';

describe('SessionDetailComponent', () => {
  const workout: WorkoutHistoryItem = {
    id: 'w1',
    start_time: '2026-09-14T10:00:00Z',
    end_time: '2026-09-14T10:40:00Z',
    duration_minutes: 40,
    total_volume: 1200,
    total_sets: 3,
    exercises_summary: ['Press'],
    detailed_exercises: [
      {
        name: 'Press de banca',
        sets: [
          { set_number: 1, set_type: 'warmup', weight: 40, reps: 10 },
          { set_number: 2, set_type: 'normal', weight: 60, reps: 8, rir: 2 },
          { set_number: 3, set_type: 'failure', weight: 60, reps: 6, rir: 0 },
        ],
      },
    ],
  };

  function render() {
    TestBed.configureTestingModule({ imports: [SessionDetailComponent] });
    const fixture = TestBed.createComponent(SessionDetailComponent);
    fixture.componentRef.setInput('workout', workout);
    fixture.detectChanges();
    return fixture;
  }

  it('nombra completo cada tipo de serie para lectores de pantalla', () => {
    const cmp = render().componentInstance;

    expect(cmp.tipoSerie('warmup')).toEqual({ letra: 'W', nombre: 'Calentamiento' });
    expect(cmp.tipoSerie('dropset')).toEqual({ letra: 'D', nombre: 'Drop set' });
    expect(cmp.tipoSerie('failure')).toEqual({ letra: 'F', nombre: 'Al fallo' });
  });

  it('no pone insignia a una serie normal', () => {
    expect(render().componentInstance.tipoSerie('normal')).toBeNull();
  });

  it('renderiza una insignia por cada serie especial, con su nombre completo', () => {
    const insignias = [...render().nativeElement.querySelectorAll('.set-type')] as HTMLElement[];

    expect(insignias.map((i) => i.getAttribute('aria-label'))).toEqual([
      'Calentamiento',
      'Al fallo',
    ]);
  });
});
