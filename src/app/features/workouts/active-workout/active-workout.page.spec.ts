import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveWorkoutPage } from './active-workout.page';
import { WorkoutFacade, ActiveWorkoutState } from '@core/facades/workout.facade';
import { signal } from '@angular/core';

// Mock del Facade
class MockWorkoutFacade {
  activeSession = signal<ActiveWorkoutState | null>({
    start_time: new Date(),
    exercises: [
      {
        exercise_id: 'test-1',
        exercise_name: 'Sentadilla',
        sets: [
          {
            id: 'set-1',
            set_number: 1,
            set_type: 'normal',
            weight: 60,
            reps: 10,
            completed: false
          }
        ]
      }
    ]
  });
  
  addSet = vi.fn();
  updateSet = vi.fn();
  finishWorkout = vi.fn();
}

describe('ActiveWorkoutPage', () => {
  let component: ActiveWorkoutPage;
  let fixture: ComponentFixture<ActiveWorkoutPage>;
  let facade: MockWorkoutFacade;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveWorkoutPage],
      providers: [
        { provide: WorkoutFacade, useClass: MockWorkoutFacade }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveWorkoutPage);
    component = fixture.componentInstance;
    facade = TestBed.inject(WorkoutFacade) as unknown as MockWorkoutFacade;
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería llamar a addSet en el facade', () => {
    component.addSet('test-1');
    expect(facade.addSet).toHaveBeenCalledWith('test-1');
  });

  it('debería llamar a updateSet al cambiar el estado de la serie', () => {
    component.toggleSet('test-1', 'set-1', false);
    expect(facade.updateSet).toHaveBeenCalledWith('test-1', 'set-1', { completed: true });
  });

  it('debería llamar a updateSet al cambiar los valores de repeticiones', () => {
    component.updateSet('test-1', 'set-1', 'reps', { detail: { value: '12' } });
    expect(facade.updateSet).toHaveBeenCalledWith('test-1', 'set-1', { reps: 12 });
  });
});
