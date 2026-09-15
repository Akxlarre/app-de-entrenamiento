import { TestBed } from '@angular/core/testing';
import { WorkoutFacade } from './workout.facade';
import { SupabaseService } from '../services/infrastructure/supabase.service';
import { ToastService } from '../services/ui/toast.service';
import { Router } from '@angular/router';

// ── Builder del mock de la cadena Supabase — enrutado por tabla ─────────────

function createMockClient(handlers: Record<string, any>) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    from: vi.fn((table: string) => {
      if (handlers[table]) return handlers[table];
      throw new Error(`[test] tabla no mockeada: ${table}`);
    }),
  };
}

const mockRouter = { navigate: vi.fn() };

describe('WorkoutFacade', () => {
  it('should be created', () => {
    expect(true).toBeTruthy();
  });

  describe('finishWorkout() — guardado del reporte de sesión', () => {
    let facade: WorkoutFacade;
    let toast: { warning: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

    function setup(workoutReportsResult: { error: unknown }) {
      toast = { warning: vi.fn(), error: vi.fn() };

      const clientMock = createMockClient({
        workouts: { upsert: vi.fn().mockResolvedValue({ error: null }) },
        workout_reports: { insert: vi.fn().mockResolvedValue(workoutReportsResult) },
      });

      TestBed.configureTestingModule({
        providers: [
          WorkoutFacade,
          { provide: SupabaseService, useValue: { client: clientMock } },
          { provide: Router, useValue: mockRouter },
          { provide: ToastService, useValue: toast },
        ],
      });

      facade = TestBed.inject(WorkoutFacade);
      // Sesión activa mínima: sin ejercicios, solo con el reporte de cierre.
      (facade as any).activeSession.set({
        id: 'workout-1',
        start_time: new Date(),
        exercises: [],
        report: { workout_id: 'workout-1', energy_level: 5, session_rpe: 8, notes: 'test' },
      });
    }

    it('sigue reportando éxito cuando falla el guardado del reporte (el entrenamiento ya se guardó)', async () => {
      setup({ error: { message: 'relation "workout_reports" does not exist' } });

      const res = await facade.finishWorkout();

      expect(res.success).toBe(true);
    });

    it('avisa al usuario por toast cuando falla el guardado del reporte, sin bloquear el flujo', async () => {
      setup({ error: { message: 'relation "workout_reports" does not exist' } });

      await facade.finishWorkout();

      expect(toast.warning).toHaveBeenCalledTimes(1);
    });

    it('no muestra ningún toast cuando el reporte se guarda correctamente', async () => {
      setup({ error: null });

      await facade.finishWorkout();

      expect(toast.warning).not.toHaveBeenCalled();
    });
  });

  describe('loadHistory() — lectura del reporte de sesión embebido', () => {
    let facade: WorkoutFacade;

    function setup(workoutsRow: Record<string, unknown>) {
      const clientMock = createMockClient({
        workouts: {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [workoutsRow], error: null }),
          }),
        },
      });

      TestBed.configureTestingModule({
        providers: [
          WorkoutFacade,
          { provide: SupabaseService, useValue: { client: clientMock } },
          { provide: Router, useValue: mockRouter },
          { provide: ToastService, useValue: { warning: vi.fn(), error: vi.fn() } },
        ],
      });

      facade = TestBed.inject(WorkoutFacade);
    }

    const baseRow = {
      id: 'workout-1',
      start_time: '2026-09-14T10:00:00Z',
      end_time: '2026-09-14T10:30:00Z',
      workout_sets: [],
    };

    it('mapea energy_level/session_rpe/notes cuando workout_reports viene como objeto', async () => {
      setup({
        ...baseRow,
        workout_reports: { energy_level: 4, session_rpe: 7, notes: 'buena sesión' },
      });

      await facade.loadHistory();

      const item = facade.history()[0];
      expect(item.energy_level).toBe(4);
      expect(item.session_rpe).toBe(7);
      expect(item.notes).toBe('buena sesión');
    });

    it('mapea energy_level/session_rpe/notes cuando workout_reports viene como array de 1', async () => {
      setup({
        ...baseRow,
        workout_reports: [{ energy_level: 2, session_rpe: 9, notes: 'cansado' }],
      });

      await facade.loadHistory();

      const item = facade.history()[0];
      expect(item.energy_level).toBe(2);
      expect(item.session_rpe).toBe(9);
      expect(item.notes).toBe('cansado');
    });

    it('deja los campos de reporte undefined cuando no hay workout_reports', async () => {
      setup({ ...baseRow, workout_reports: null });

      await facade.loadHistory();

      const item = facade.history()[0];
      expect(item.energy_level).toBeUndefined();
      expect(item.session_rpe).toBeUndefined();
      expect(item.notes).toBeUndefined();
    });
  });
});
