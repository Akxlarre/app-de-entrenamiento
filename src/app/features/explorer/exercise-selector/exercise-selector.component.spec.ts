import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExerciseSelectorComponent } from './exercise-selector.component';
import { ExerciseFacade, ExerciseDefinition } from '@core/facades/exercise.facade';
import { signal } from '@angular/core';

describe('ExerciseSelectorComponent', () => {
  let component: ExerciseSelectorComponent;
  let fixture: ComponentFixture<ExerciseSelectorComponent>;
  let mockFacade: jasmine.SpyObj<ExerciseFacade>;

  beforeEach(async () => {
    // Usamos vi.fn() porque el proyecto usa vitest (según AGENTS.md y vite config)
    mockFacade = {
      exercises: signal<ExerciseDefinition[]>([{
        id: '1', name_es: 'Press de Banca', name_en: 'Bench Press', 
        muscle: 'Pecho', equipment: 'Barra', category: 'Fuerza'
      }]),
      loading: signal(false),
      error: signal(null),
      loadExercises: vi.fn().mockResolvedValue(undefined)
    } as unknown as jasmine.SpyObj<ExerciseFacade>;

    await TestBed.configureTestingModule({
      imports: [ExerciseSelectorComponent],
      providers: [
        { provide: ExerciseFacade, useValue: mockFacade }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExerciseSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse y cargar ejercicios al inicializar', () => {
    expect(component).toBeTruthy();
    expect(mockFacade.loadExercises).toHaveBeenCalledWith('');
  });

  it('debería emitir el ejercicio cuando se selecciona uno', () => {
    const emitSpy = vi.spyOn(component.exerciseSelected, 'emit');
    
    // Forzamos la selección del primer ejercicio simulado
    const dummyExercise = mockFacade.exercises()[0];
    component.selectExercise(dummyExercise);
    
    expect(emitSpy).toHaveBeenCalledWith(dummyExercise);
  });
  
  it('debería buscar ejercicios al escribir en el searchbar', () => {
    component.onSearch({ detail: { value: 'Sentadilla' } });
    expect(mockFacade.loadExercises).toHaveBeenCalledWith('Sentadilla');
  });
});
