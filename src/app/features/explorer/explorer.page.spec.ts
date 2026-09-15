import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import {
  LucideAngularModule,
  Zap,
  ShieldCheck,
  Layers,
  Activity,
  Dumbbell,
  Target,
  Circle,
  ChevronRight,
  Search,
  ClipboardList,
  X,
} from 'lucide-angular';
import { ExplorerPage } from './explorer.page';
import { ExerciseFacade, ExerciseDefinition } from '@core/facades/exercise.facade';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';

describe('ExplorerPage — buscador y filtros', () => {
  let fixture: ComponentFixture<ExplorerPage>;
  let page: ExplorerPage;
  let loadExercises: ReturnType<typeof vi.fn>;

  const searchbar = () =>
    fixture.nativeElement.querySelector('ion-searchbar') as HTMLElement & { value?: string };

  beforeEach(async () => {
    loadExercises = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [
        ExplorerPage,
        LucideAngularModule.pick({
          Zap,
          ShieldCheck,
          Layers,
          Activity,
          Dumbbell,
          Target,
          Circle,
          ChevronRight,
          Search,
          ClipboardList,
          X,
        }),
      ],
      providers: [
        {
          provide: ExerciseFacade,
          useValue: {
            exercises: signal<ExerciseDefinition[]>([]),
            loading: signal(false),
            error: signal(null),
            loadExercises,
          },
        },
        {
          provide: GsapAnimationsService,
          // PressFeedbackDirective espera una función de limpieza y la
          // llama al destruirse la vista.
          useValue: {
            animateTierEnter: vi.fn(),
            addPressFeedback: vi.fn(() => () => {}),
            addInteractiveFeedback: vi.fn(() => () => {}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExplorerPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Bug medido en navegador: tras "Limpiar filtros" la lista volvía completa
  // pero el buscador seguía mostrando lo escrito.
  it('Limpiar filtros también vacía el texto visible del buscador', () => {
    page.onSearch({ detail: { value: 'zzqx' } });
    fixture.detectChanges();
    expect(searchbar().value).toBe('zzqx');

    page.limpiarFiltros();
    fixture.detectChanges();

    expect(searchbar().value).toBe('');
    expect(loadExercises).toHaveBeenLastCalledWith('', '');
  });

  // El buscador muestra este valor: si se guardara normalizado, el enlace le
  // borraría al usuario el espacio mientras escribe "press banca".
  it('guarda el texto tal como se escribe, sin recortar el espacio final', () => {
    page.onSearch({ detail: { value: 'Press ' } });

    expect(page.searchQuery()).toBe('Press ');
  });

  it('un buscador con solo espacios no cuenta como filtro activo', () => {
    page.onSearch({ detail: { value: '   ' } });

    expect(page.hayFiltroActivo()).toBe(false);
  });
});
