import { TestBed } from '@angular/core/testing';
import { MesocycleFacade } from './mesocycle.facade';
import { SupabaseService } from '../services/infrastructure/supabase.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MesocycleFacade', () => {
  let facade: MesocycleFacade;
  let supabaseMock: any;

  beforeEach(() => {
    supabaseMock = {
      getUser: vi.fn().mockResolvedValue({ user: { id: 'user-123' } }),
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                  })
                })
              })
            })
          })
        })
      }
    };

    TestBed.configureTestingModule({
      providers: [
        MesocycleFacade,
        { provide: SupabaseService, useValue: supabaseMock }
      ]
    });

    facade = TestBed.inject(MesocycleFacade);
  });

  it('debería crearse correctamente', () => {
    expect(facade).toBeTruthy();
    expect(facade.activeMesocycle()).toBeNull();
  });

  it('debería retornar null en getNextSession cuando no hay mesociclo activo', () => {
    expect(facade.getNextSession()).toBeNull();
  });
});
