import { TestBed } from '@angular/core/testing';
import { ExerciseFacade } from './exercise.facade';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';

const MOCK_EXERCISES = [
  {
    id: '1',
    name_es: 'Press de Banca con Barra',
    name_en: 'Barbell Bench Press',
    muscle: 'Pecho',
    equipment: 'Barra',
    category: 'Fuerza',
  },
  {
    id: '2',
    name_es: 'Sentadilla con Barra',
    name_en: 'Barbell Squat',
    muscle: 'Cuádriceps',
    equipment: 'Barra',
    category: 'Fuerza',
  },
  {
    id: '3',
    name_es: 'Curl de Bíceps con Mancuerna',
    name_en: 'Dumbbell Bicep Curl',
    muscle: 'Bíceps',
    equipment: 'Mancuerna',
    category: 'Fuerza',
  },
];

function createMockSupabase(data: unknown[] = []) {
  return {
    client: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    },
  };
}

const mockSupabase = createMockSupabase();

describe('ExerciseFacade', () => {
  let facade: ExerciseFacade;

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [ExerciseFacade, { provide: SupabaseService, useValue: mockSupabase }],
    });

    facade = TestBed.inject(ExerciseFacade);
  });

  it('should be created', () => {
    expect(facade).toBeTruthy();
  });

  it('should initialize with empty exercises list', () => {
    expect(facade.exercises()).toEqual([]);
  });

  describe('búsqueda multipalabra', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ExerciseFacade,
          { provide: SupabaseService, useValue: createMockSupabase(MOCK_EXERCISES) },
        ],
      });
      facade = TestBed.inject(ExerciseFacade);
    });

    it('matches when every word appears somewhere in the name, even non-contiguous', async () => {
      await facade.loadExercises('press banca');
      expect(facade.exercises().map((e) => e.id)).toEqual(['1']);
    });

    it('still matches a single-word query', async () => {
      await facade.loadExercises('banca');
      expect(facade.exercises().map((e) => e.id)).toEqual(['1']);
    });

    it('is accent and case insensitive across tokens', async () => {
      await facade.loadExercises('BÍCEPS mancuerna');
      expect(facade.exercises().map((e) => e.id)).toEqual(['3']);
    });

    it('returns nothing when one of the words does not match any field', async () => {
      await facade.loadExercises('press mancuerna');
      expect(facade.exercises()).toEqual([]);
    });
  });
});
