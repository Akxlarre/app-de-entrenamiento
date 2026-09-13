import { TestBed } from '@angular/core/testing';
import { ExerciseFacade } from './exercise.facade';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';

const mockSupabase = {
  client: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
};

describe('ExerciseFacade', () => {
  let facade: ExerciseFacade;

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        ExerciseFacade,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    facade = TestBed.inject(ExerciseFacade);
  });

  it('should be created', () => {
    expect(facade).toBeTruthy();
  });

  it('should initialize with empty exercises list', () => {
    expect(facade.exercises()).toEqual([]);
  });
});
