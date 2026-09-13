import { TestBed } from '@angular/core/testing';
import { WorkoutFacade } from './workout.facade';
import { SupabaseService } from '../services/infrastructure/supabase.service';
import { Router } from '@angular/router';

describe('WorkoutFacade', () => {
  let facade: WorkoutFacade;
  let mockSupabase: any;
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = { navigate: vi.fn() };
    mockSupabase = {
      client: {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } })
        },
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: { id: 'workout-1' }, error: null }),
          then: vi.fn().mockResolvedValue(true)
        })
      }
    };

    TestBed.configureTestingModule({
      providers: [
        WorkoutFacade,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: Router, useValue: mockRouter }
      ]
    });

    facade = TestBed.inject(WorkoutFacade);
  });

  it('debería crearse correctamente', () => {
    expect(facade).toBeTruthy();
  });

  it('finishWorkout() no hace nada si no hay sesión activa', async () => {
    facade.activeSession.set(null);
    await facade.finishWorkout();
    expect(mockSupabase.client.auth.getUser).not.toHaveBeenCalled();
  });

  it('finishWorkout() debería guardar el workout, recargar historial y limpiar sesión', async () => {
    facade.startAdhocWorkout();
    facade.addExercise('ex-1', 'Sentadilla');
    facade.updateSet('ex-1', facade.activeSession()!.exercises[0].sets[0].id, { completed: true, weight: 100, reps: 5 });

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.client.from.mockImplementation((table: string) => {
      if (table === 'workouts') {
        return {
          upsert: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: { id: 'workout-1' }, error: null }),
          then: vi.fn().mockResolvedValue(true)
        };
      }
      if (table === 'workout_sets') {
        return { upsert: upsertMock, then: vi.fn() };
      }
      return {};
    });

    await facade.finishWorkout();

    expect(upsertMock).toHaveBeenCalled();
    const insertedSets = upsertMock.mock.calls[0][0];
    expect(insertedSets.length).toBe(1);
    expect(insertedSets[0].weight).toBe(100);
    expect(insertedSets[0].completed).toBe(true);
    
    expect(facade.activeSession()).toBeNull();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/workouts']);
  });

  it('loadHistory() debería procesar métricas de volumen, duración y series completadas', async () => {
    const mockData = [
      {
        id: 'w-1',
        start_time: '2026-09-10T14:00:00.000Z',
        end_time: '2026-09-10T14:45:00.000Z',
        workout_sets: [
          { id: 's1', weight: 80, reps: 10, completed: true, exercises: { name_es: 'Sentadilla' } },
          { id: 's2', weight: 100, reps: 5, completed: true, exercises: { name_es: 'Sentadilla' } },
          { id: 's3', weight: 50, reps: 12, completed: false, exercises: { name_es: 'Press banca' } } // Incompleta
        ]
      }
    ];

    mockSupabase.client.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null })
    });

    await facade.loadHistory();

    const history = facade.history();
    expect(history.length).toBe(1);
    expect(history[0].duration_minutes).toBe(45);
    expect(history[0].total_volume).toBe(80 * 10 + 100 * 5); // 800 + 500 = 1300
    expect(history[0].total_sets).toBe(2);
    expect(history[0].exercises_summary).toEqual(['Sentadilla']);
  });
});
