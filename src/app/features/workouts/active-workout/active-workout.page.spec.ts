import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveWorkoutPage } from './active-workout.page';
import { WorkoutFacade, ActiveWorkoutState } from '@core/facades/workout.facade';
import { signal } from '@angular/core';

import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ActiveWorkoutPage', () => {
  let component: ActiveWorkoutPage;
  let fixture: ComponentFixture<ActiveWorkoutPage>;
  let mockFacade: any;
  let facade: any;

  beforeEach(async () => {
    mockFacade = {
      activeSession: signal({
        id: 'session-1',
        startTime: new Date(),
        exercises: []
      }),
      addSet: vi.fn(),
      updateSet: vi.fn(),
      finishWorkout: vi.fn(),
      cancelWorkout: vi.fn()
    };
    facade = mockFacade;

    await TestBed.configureTestingModule({
      imports: [ActiveWorkoutPage, HttpClientTestingModule],
      providers: [
        { provide: WorkoutFacade, useValue: mockFacade }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveWorkoutPage);
    component = fixture.componentInstance;
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
