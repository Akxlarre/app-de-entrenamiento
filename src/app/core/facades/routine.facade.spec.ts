import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RoutineFacade } from './routine.facade';
import { SupabaseService } from '../services/infrastructure/supabase.service';
import { ToastService } from '../services/ui/toast.service';

/** Simula el `from('routines').delete().eq('id', …)` que usa deleteRoutine. */
function supabaseQueDevuelve(resultado: { error: unknown }) {
  const eq = vi.fn().mockResolvedValue(resultado);
  const del = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ delete: del }));
  return { client: { from } };
}

function montar(supabase: ReturnType<typeof supabaseQueDevuelve>) {
  const toast = { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      RoutineFacade,
      { provide: SupabaseService, useValue: supabase },
      { provide: ToastService, useValue: toast },
    ],
  });
  const facade = TestBed.inject(RoutineFacade);
  facade.routines.set([{ id: 'r1' }, { id: 'r2' }] as never);
  return { facade, toast };
}

const idsEnLista = (facade: RoutineFacade) => facade.routines().map((r) => r.id);

describe('RoutineFacade.deleteRoutine', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('quita la rutina de la lista cuando el borrado se completa', async () => {
    const { facade, toast } = montar(supabaseQueDevuelve({ error: null }));

    const ok = await facade.deleteRoutine('r1');

    expect(ok).toBe(true);
    expect(idsEnLista(facade)).toEqual(['r2']);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('no borra ni oculta la rutina cuando un plan la está usando', async () => {
    // 23503 = foreign_key_violation. Lo dispara el RESTRICT de
    // mesocycle_sessions.routine_id cuando la rutina está en un plan.
    const { facade, toast } = montar(
      supabaseQueDevuelve({
        error: {
          code: '23503',
          message: 'update or delete on table "routines" violates foreign key constraint',
        },
      }),
    );

    const ok = await facade.deleteRoutine('r1');

    expect(ok).toBe(false);
    expect(idsEnLista(facade)).toEqual(['r1', 'r2']);
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it('explica el bloqueo en español en vez de mostrar el error crudo de Postgres', async () => {
    const { facade, toast } = montar(
      supabaseQueDevuelve({
        error: {
          code: '23503',
          message: 'violates foreign key constraint "mesocycle_sessions_routine_id_fkey"',
        },
      }),
    );

    await facade.deleteRoutine('r1');

    const [titulo, detalle] = toast.error.mock.calls[0];
    const textoVisible = `${titulo} ${detalle ?? ''}`;
    expect(textoVisible).not.toMatch(/foreign key|constraint|violates/i);
    expect(textoVisible).toMatch(/plan/i);
    expect(facade.error() ?? '').not.toMatch(/foreign key|constraint|violates/i);
  });

  it('avisa con un toast si el borrado falla por cualquier otra causa', async () => {
    const { facade, toast } = montar(
      supabaseQueDevuelve({ error: { code: '42501', message: 'permission denied' } }),
    );

    const ok = await facade.deleteRoutine('r1');

    expect(ok).toBe(false);
    expect(idsEnLista(facade)).toEqual(['r1', 'r2']);
    expect(toast.error).toHaveBeenCalledOnce();
  });
});
