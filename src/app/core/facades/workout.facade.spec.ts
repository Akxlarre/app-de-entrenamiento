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

  // Antes: con una sesión en curso, tocar una tarjeta de rutina la
  // reemplazaba sin preguntar. Se perdía su estado local y la fila de
  // workouts quedaba abierta para siempre.
  describe('inicio con otra sesión en curso — no la reemplaza', () => {
    let facade: WorkoutFacade;
    let toast: { warning: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let workoutsUpsert: ReturnType<typeof vi.fn>;

    const enCurso = {
      id: 'en-curso',
      start_time: new Date(),
      routine_id: 'rutina-a',
      exercises: [{ exercise_id: 'ej-1', name: 'Press', sets: [] }],
    };
    const rutina = { id: 'rutina-b', name: 'Pierna', routine_exercises: [] } as any;

    function setup(sesionActiva: unknown) {
      localStorage.clear();
      toast = { warning: vi.fn(), error: vi.fn() };
      router = { navigate: vi.fn() };
      workoutsUpsert = vi.fn().mockResolvedValue({ error: null });

      TestBed.configureTestingModule({
        providers: [
          WorkoutFacade,
          {
            provide: SupabaseService,
            useValue: { client: createMockClient({ workouts: { upsert: workoutsUpsert } }) },
          },
          { provide: Router, useValue: router },
          { provide: ToastService, useValue: toast },
        ],
      });

      facade = TestBed.inject(WorkoutFacade);
      (facade as any).activeSession.set(sesionActiva);
    }

    const iniciar: Record<string, (f: WorkoutFacade) => Promise<boolean>> = {
      startAdhocWorkout: (f) => f.startAdhocWorkout(),
      startWorkoutFromRoutine: (f) => f.startWorkoutFromRoutine(rutina),
      startWorkoutFromMesocycleSession: (f) =>
        f.startWorkoutFromMesocycleSession({ id: 'meso-sesion-1', targets: [] }, rutina),
    };

    for (const [metodo, llamar] of Object.entries(iniciar)) {
      it(`${metodo} deja intacta la sesión en curso y lleva a ella`, async () => {
        setup(enCurso);

        const inicio = await llamar(facade);

        expect(inicio).toBe(false);
        expect(facade.activeSession()?.id).toBe('en-curso');
        expect(facade.activeSession()?.exercises).toHaveLength(1);
        expect(workoutsUpsert).not.toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/app/workouts/active']);
        expect(toast.warning).toHaveBeenCalledOnce();
      });
    }

    it('sin sesión en curso, iniciar crea una sesión nueva y no avisa', async () => {
      setup(null);

      const inicio = await facade.startAdhocWorkout();

      expect(inicio).toBe(true);
      expect(facade.activeSession()).not.toBeNull();
      expect(workoutsUpsert).toHaveBeenCalledOnce();
      expect(toast.warning).not.toHaveBeenCalled();
    });

    it('un doble toque no crea dos entrenamientos', async () => {
      setup(null);

      const [primero, segundo] = await Promise.all([
        facade.startWorkoutFromRoutine(rutina),
        facade.startWorkoutFromRoutine(rutina),
      ]);

      expect([primero, segundo]).toEqual([true, false]);
      expect(workoutsUpsert).toHaveBeenCalledOnce();
    });
  });

  describe('deleteHistoryWorkout() — borrar una sesión del historial', () => {
    let facade: WorkoutFacade;
    let toast: any;
    let workoutsDeleteEq: ReturnType<typeof vi.fn>;
    let mesoUpdateEq: ReturnType<typeof vi.fn>;
    let callOrder: string[];

    function setup(opts: { mesoError?: unknown; deleteError?: unknown } = {}) {
      toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
      callOrder = [];

      mesoUpdateEq = vi.fn().mockImplementation(async () => {
        callOrder.push('meso');
        return { error: opts.mesoError ?? null };
      });
      workoutsDeleteEq = vi.fn().mockImplementation(async () => {
        callOrder.push('delete');
        return { error: opts.deleteError ?? null };
      });

      const clientMock = createMockClient({
        mesocycle_sessions: { update: vi.fn(() => ({ eq: mesoUpdateEq })) },
        workouts: { delete: vi.fn(() => ({ eq: workoutsDeleteEq })) },
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
      facade.history.set([
        { id: 'w-1', total_sets: 3 } as any,
        { id: 'w-2', total_sets: 5 } as any,
      ]);
    }

    it('saca la sesión de la lista y confirma al usuario', async () => {
      setup();

      const ok = await facade.deleteHistoryWorkout('w-1');

      expect(ok).toBe(true);
      expect(facade.history().map((w) => w.id)).toEqual(['w-2']);
      expect(workoutsDeleteEq).toHaveBeenCalledWith('id', 'w-1');
      expect(toast.success).toHaveBeenCalled();
    });

    it('libera la sesión del mesociclo ANTES de borrar el workout', async () => {
      setup();

      await facade.deleteHistoryWorkout('w-1');

      // Si se borrara primero, el FK ON DELETE SET NULL ya habría cortado el
      // vínculo y la sesión del plan quedaría completada apuntando a nada.
      expect(callOrder).toEqual(['meso', 'delete']);
      expect(mesoUpdateEq).toHaveBeenCalledWith('completed_workout_id', 'w-1');
    });

    it('hace rollback y avisa si falla el borrado', async () => {
      setup({ deleteError: { message: 'boom' } });

      const ok = await facade.deleteHistoryWorkout('w-1');

      expect(ok).toBe(false);
      expect(facade.history().map((w) => w.id)).toEqual(['w-1', 'w-2']);
      expect(toast.error).toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('no borra el workout si no se pudo liberar la sesión del plan', async () => {
      setup({ mesoError: { message: 'no anda' } });

      const ok = await facade.deleteHistoryWorkout('w-1');

      expect(ok).toBe(false);
      expect(workoutsDeleteEq).not.toHaveBeenCalled();
      expect(facade.history().map((w) => w.id)).toEqual(['w-1', 'w-2']);
    });
  });
});
