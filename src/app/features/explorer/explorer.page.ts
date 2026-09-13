import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { IonContent, IonHeader, IonList, IonItem, IonLabel, IonBadge, IonSearchbar, IonSpinner, IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/angular';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ExerciseFacade, ExerciseDefinition } from '@core/facades/exercise.facade';

const MUSCLE_GROUPS = [
  { label: 'Todos', value: '', icon: 'zap' },
  { label: 'Pecho', value: 'Pecho', icon: 'shield-check' },
  { label: 'Espalda', value: 'Espalda', icon: 'layers' },
  { label: 'Piernas', value: 'Pierna', icon: 'activity' },
  { label: 'Hombros', value: 'Hombro', icon: 'dumbbell' },
  { label: 'Bíceps', value: 'Bíceps', icon: 'activity' },
  { label: 'Tríceps', value: 'Tríceps', icon: 'activity' },
  { label: 'Abdomen', value: 'Abdom', icon: 'target' },
  { label: 'Glúteos', value: 'Glúteo', icon: 'circle' },
  { label: 'Cardio', value: 'Cardio', icon: 'activity' },
];

@Component({
  selector: 'app-explorer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonList, IonItem, IonLabel, IonBadge, IonSearchbar, IonSpinner, IonInfiniteScroll, IonInfiniteScrollContent, AppHeaderComponent, DrawerComponent, IconComponent],
  template: `
    <ion-content class="explorer-content" [fullscreen]="true">
      <app-header title="Catálogo de Ejercicios">
        <div slot="bottom" class="search-container" style="padding-top: 1rem; padding-bottom: 0.2rem; padding-left: 0; padding-right: 0;">
          <ion-searchbar 
            class="custom-searchbar"
            placeholder="Buscar ejercicio..."
            [debounce]="0"
            (ionInput)="onSearch($event)">
          </ion-searchbar>

          <!-- Muscle Group Chips -->
          <div class="chips-container mt-2">
            @for (group of muscleGroups; track group.value) {
              <button 
                class="chip-pill" 
                [class.chip-active]="selectedGroup() === group.value"
                (click)="selectGroup(group.value)">
                <app-icon class="chip-icon flex items-center justify-center" [name]="group.icon" [size]="14"></app-icon>
                <span class="chip-label">{{ group.label }}</span>
              </button>
            }
          </div>
        </div>
      </app-header>

      <ion-list class="exercise-list">
        @if (facade.loading()) {
          <div class="empty-state">
            <ion-spinner color="primary"></ion-spinner>
            <p>Cargando ejercicios...</p>
          </div>
        } @else if (facade.exercises().length === 0) {
          <div class="empty-state">
            <span>🔍</span>
            <p>No se encontraron ejercicios</p>
          </div>
        } @else {
          @for (exercise of facade.exercises().slice(0, displayLimit()); track exercise.id) {
            <ion-item button detail="false" lines="none" class="exercise-item" (click)="openDetail(exercise)">
              <div class="exercise-icon" [style]="getIconStyle(exercise.muscle)" slot="start">
                <app-icon [name]="getIconName(exercise.muscle, exercise.category)" [size]="24"></app-icon>
              </div>
              <ion-label>
                <h2 class="exercise-name">{{ exercise.name_es || exercise.name_en }}</h2>
                <p class="exercise-meta capitalize">
                  <span class="text-primary font-semibold">{{ exercise.muscle }}</span> · 
                  <span class="text-muted">{{ exercise.equipment }}</span> · 
                  <span class="text-secondary">{{ exercise.category }}</span>
                </p>
              </ion-label>
              <app-icon slot="end" name="chevron-right" [size]="20" style="color: var(--text-muted); opacity: 0.5"></app-icon>
            </ion-item>
          }
        }
      </ion-list>

      <ion-infinite-scroll (ionInfinite)="loadMore($event)">
        <ion-infinite-scroll-content loadingSpinner="bubbles" loadingText="Cargando más ejercicios..."></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>

    <!-- Drawer para Detalles del Ejercicio -->
    <app-drawer
      [isOpen]="drawerOpen()"
      [title]="selectedExercise()?.name_es || 'Detalle del ejercicio'"
      (closed)="closeDetail()"
    >
      @if (selectedExercise(); as exercise) {
        <div class="flex flex-col gap-6 pb-8">
          
          <!-- Hero Images or Placeholder -->
          @if (exercise.images && exercise.images.length > 0) {
            <div class="rounded-xl overflow-hidden flex relative min-h-[160px]" style="background: var(--bg-elevated); border: 1px solid var(--border-subtle);">
              @for (img of exercise.images; track img) {
                <div class="flex-1 w-1/2 relative bg-white flex items-center justify-center">
                  <ion-spinner color="primary" class="absolute z-0"></ion-spinner>
                  <img [src]="img" alt="Ejecución de {{ exercise.name_es }}" class="w-full h-full object-cover relative z-10 transition-opacity duration-300 opacity-0" (load)="$event.target.classList.remove('opacity-0')" loading="lazy" />
                </div>
              }
            </div>
          } @else {
            <div class="rounded-xl p-6 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden" style="background: var(--bg-elevated); border: 1px solid var(--border-subtle);">
              <app-icon [name]="getIconName(exercise.muscle, exercise.category)" [size]="64" class="z-10 filter drop-shadow-lg text-primary"></app-icon>
              <div class="absolute inset-0 opacity-10 pointer-events-none" style="background: radial-gradient(circle at center, var(--color-primary), transparent 70%);"></div>
            </div>
          }

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 flex flex-col gap-1 rounded-xl" style="background: var(--bg-elevated); border: 1px solid var(--border-subtle);">
              <span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">Músculo</span>
              <span class="text-base font-bold capitalize flex items-center gap-2" style="color: var(--color-primary)">
                <app-icon name="activity" [size]="16" /> {{ exercise.muscle }}
              </span>
            </div>
            
            <div class="p-4 flex flex-col gap-1 rounded-xl" style="background: var(--bg-elevated); border: 1px solid var(--border-subtle);">
              <span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted)">Equipo</span>
              <span class="text-base font-bold capitalize flex items-center gap-2" style="color: var(--text-primary)">
                <app-icon name="dumbbell" [size]="16" /> {{ exercise.equipment }}
              </span>
            </div>
            
            <div class="p-4 flex flex-col gap-1 col-span-2 rounded-xl" style="background: var(--color-tertiary-tint, rgba(168, 85, 247, 0.08)); border: 1px solid var(--color-tertiary-tint, rgba(168, 85, 247, 0.2));">
              <span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--color-tertiary, #c084fc)">Categoría</span>
              <span class="text-base font-bold capitalize flex items-center gap-2" style="color: var(--color-tertiary, #c084fc)">
                <app-icon name="tag" [size]="16" /> {{ exercise.category }}
              </span>
            </div>
          </div>
          
          <!-- Instructions / Step-by-Step Guide -->
          <div class="flex flex-col gap-4 mt-2">
            @let steps = getInstructions(exercise.instructions_es || exercise.instructions_en);
            
            <div class="flex items-center justify-between pb-1 border-b" style="border-color: var(--border-subtle)">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: var(--color-primary-tint); color: var(--color-primary)">
                  <app-icon name="list-checks" [size]="18"></app-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold m-0" style="color: var(--text-primary)">Guía de Ejecución</h3>
                  <span class="text-[11px]" style="color: var(--text-muted)">Instrucciones paso a paso del Coach</span>
                </div>
              </div>
              @if (steps.length > 0) {
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full" style="background: var(--bg-elevated); color: var(--color-primary); border: 1px solid var(--border-subtle)">
                  {{ steps.length }} pasos
                </span>
              }
            </div>
            
            <div class="flex flex-col gap-3">
              @if (isEnglish(exercise.instructions_es, exercise.instructions_en)) {
                <div class="p-3 rounded-xl flex items-center gap-3" style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.25); color: var(--color-warning, #eab308);">
                  <app-icon name="alert-triangle" [size]="18" />
                  <span class="text-xs font-semibold leading-snug">Instrucción en idioma original (pendiente de traducción).</span>
                </div>
              }
              
              @if (steps.length > 0) {
                <!-- Connected Stepper / Timeline -->
                <div class="relative pl-6 flex flex-col gap-3.5 my-1">
                  <!-- Vertical timeline track line -->
                  <div class="absolute left-2.5 top-3 bottom-3 w-0.5 rounded-full opacity-60" style="background: linear-gradient(to bottom, var(--color-primary), var(--border-subtle))"></div>

                  @for (step of steps; track $index) {
                    @let phase = getStepPhase($index, steps.length);
                    <div class="relative flex items-start gap-3">
                      <!-- Stepper Node Dot -->
                      <div class="absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 z-10 shadow-sm"
                           [style.background]="$first ? 'var(--color-primary)' : ($last ? 'var(--color-tertiary, #10b981)' : 'var(--bg-surface)')"
                           [style.color]="$first || $last ? '#000' : 'var(--text-primary)'"
                           [style.border]="$first || $last ? 'none' : '1.5px solid var(--color-primary)'">
                        {{ $index + 1 }}
                      </div>
                      
                      <!-- Step Card -->
                      <div class="p-3.5 rounded-xl flex-1 flex flex-col gap-1.5 transition-all shadow-sm"
                           style="background: var(--bg-elevated); border: 1px solid var(--border-subtle)">
                        <div class="flex items-center gap-1.5">
                          <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                                [style.background]="$first ? 'var(--color-primary-tint)' : ($last ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)')"
                                [style.color]="$first ? 'var(--color-primary)' : ($last ? '#10b981' : 'var(--text-muted)')">
                            {{ phase.label }}
                          </span>
                        </div>
                        <p class="text-xs sm:text-sm leading-relaxed m-0 font-normal" style="color: var(--text-primary)">
                          {{ step }}
                        </p>
                      </div>
                    </div>
                  }
                </div>

                <!-- Coach Pro-Tip Callout -->
                <div class="p-3.5 rounded-xl flex items-start gap-3 mt-1" 
                     style="background: rgba(var(--color-primary-rgb, 59, 130, 246), 0.06); border: 1px dashed var(--color-primary)">
                  <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style="background: var(--color-primary-tint); color: var(--color-primary)">
                    <app-icon name="info" [size]="16"></app-icon>
                  </div>
                  <div class="flex flex-col gap-0.5">
                    <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-primary)">Consejo de Técnica</span>
                    <span class="text-xs leading-relaxed" style="color: var(--text-secondary)">
                      Controlá el tempo en la bajada (fase excéntrica) y evitá usar el impulso o balanceo para maximizar la activación muscular.
                    </span>
                  </div>
                </div>
              } @else {
                <div class="p-6 flex flex-col items-center justify-center text-center gap-3 rounded-xl" style="background: var(--bg-elevated); border: 1px solid var(--border-subtle);">
                  <app-icon name="info" [size]="24" color="var(--text-muted)" />
                  <p class="text-sm m-0" style="color: var(--text-muted)">
                    No hay instrucciones detalladas para este ejercicio.
                  </p>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </app-drawer>
  `,
  styles: [`
    .search-container { padding: 0 0 1rem 0; }
    .explorer-content {
      --background: var(--ion-background-color, #121212);
    }

    .custom-searchbar {
      --background: rgba(255,255,255,0.08);
      --color: var(--text-primary, #fff);
      --placeholder-color: var(--text-muted, #a1a1aa);
      --icon-color: var(--text-muted, #a1a1aa);
      --border-radius: 12px;
      padding: 0 16px 8px 16px;
    }

    /* === CHIPS SCROLLBAR === */
    .chips-container {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      scrollbar-width: none;
      padding: 0.25rem 1rem 0.5rem 1rem;
    }
    .chips-container::-webkit-scrollbar {
      display: none;
    }

    .chip-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.85rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      color: var(--text-muted, #a1a1aa);
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .chip-pill:active {
      transform: scale(0.96);
    }
    .chip-pill.chip-active {
      background: var(--color-primary, #3b82f6);
      border-color: var(--color-primary, #3b82f6);
      color: #ffffff;
      box-shadow: 0 2px 10px rgba(59, 130, 246, 0.35);
    }
    .chip-icon {
      font-size: 0.95rem;
    }

    .exercise-list {
      background: transparent;
      padding: 0 8px;
      padding-bottom: calc(90px + env(safe-area-inset-bottom, 16px));
    }

    .exercise-item {
      --background: transparent;
      --color: var(--text-primary, #fff);
      --border-color: rgba(255,255,255,0.06);
      --padding-start: 12px;
      --padding-end: 12px;
      --inner-padding-end: 12px;
      margin-bottom: 4px;
      border-radius: 12px;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .exercise-item:active {
      transform: scale(0.98);
      --background: rgba(255,255,255,0.05);
    }

    .exercise-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      margin-right: 12px;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .exercise-name {
      font-weight: 600 !important;
      font-size: 1rem !important;
      color: var(--text-primary, #fff) !important;
      margin-bottom: 4px !important;
      letter-spacing: -0.01em;
      text-transform: capitalize;
    }

    .exercise-meta {
      font-size: 0.75rem !important;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      color: var(--text-muted, #a1a1aa);
      gap: 1rem;
    }
    
    .empty-state span {
      font-size: 2.5rem;
    }
  `]
})
export class ExplorerPage implements OnInit {
  facade = inject(ExerciseFacade);
  
  muscleGroups = MUSCLE_GROUPS;
  selectedGroup = signal('');
  searchQuery = signal('');

  displayLimit = signal(30);

  selectedExercise = signal<ExerciseDefinition | null>(null);
  drawerOpen = signal(false);

  ngOnInit() {
    this.facade.loadExercises('', '');
  }

  onSearch(event: any) {
    const query = (event.detail.value || '').toLowerCase().trim();
    this.searchQuery.set(query);
    this.displayLimit.set(30);
    this.facade.loadExercises(this.searchQuery(), this.selectedGroup());
  }

  selectGroup(groupValue: string) {
    this.selectedGroup.set(groupValue);
    this.displayLimit.set(30);
    this.facade.loadExercises(this.searchQuery(), this.selectedGroup());
  }
  
  loadMore(event: any) {
    this.displayLimit.update(val => val + 30);
    event.target.complete();
    
    if (this.displayLimit() >= this.facade.exercises().length) {
      event.target.disabled = true;
    }
  }

  openDetail(exercise: ExerciseDefinition) {
    this.selectedExercise.set(exercise);
    this.drawerOpen.set(true);
  }
  
  closeDetail() {
    this.drawerOpen.set(false);
    setTimeout(() => this.selectedExercise.set(null), 300); // Clear after animation
  }

  getIconName(muscle: string, category: string): string {
    const m = (muscle || '').toLowerCase();
    const c = (category || '').toLowerCase();
    if (m.includes('pecho') || m.includes('chest')) return 'shield-check';
    if (m.includes('espalda') || m.includes('back')) return 'layers';
    if (m.includes('pierna') || m.includes('quad') || m.includes('femoral') || m.includes('isquio') || m.includes('pantorrilla')) return 'activity';
    if (m.includes('hombro') || m.includes('shoulder')) return 'dumbbell';
    if (m.includes('bíceps') || m.includes('bicep')) return 'activity';
    if (m.includes('tríceps') || m.includes('tricep')) return 'activity';
    if (m.includes('abdom') || m.includes('core')) return 'circle';
    if (m.includes('glúteo') || m.includes('glute')) return 'circle';
    if (c.includes('cardio')) return 'activity';
    return 'dumbbell';
  }

  getIconStyle(muscle: string): string {
    const m = (muscle || '').toLowerCase();
    if (m.includes('pecho') || m.includes('chest')) return 'background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444;'; // Red
    if (m.includes('espalda') || m.includes('back')) return 'background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #10b981;'; // Emerald
    if (m.includes('pierna') || m.includes('quad') || m.includes('femoral') || m.includes('isquio')) return 'background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: #3b82f6;'; // Blue
    if (m.includes('hombro') || m.includes('shoulder')) return 'background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.2); color: #f97316;'; // Orange
    if (m.includes('bíceps') || m.includes('tríceps') || m.includes('bicep') || m.includes('tricep')) return 'background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); color: #8b5cf6;'; // Violet
    if (m.includes('abdom') || m.includes('core')) return 'background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.2); color: #eab308;'; // Yellow
    if (m.includes('glúteo') || m.includes('glute')) return 'background: rgba(236, 72, 153, 0.1); border: 1px solid rgba(236, 72, 153, 0.2); color: #ec4899;'; // Pink
    
    // Default (e.g. Cardio or others)
    return 'background: rgba(161, 161, 170, 0.1); border: 1px solid rgba(161, 161, 170, 0.2); color: #a1a1aa;'; // Zinc/Gray
  }

  getInstructions(text: string | undefined): string[] {
    if (!text) return [];
    // Normalize literal \n, /n, \\n, and standard newlines
    const normalized = text
      .replace(/\\n/g, '\n')
      .replace(/\/n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    return normalized
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s.replace(/^(\d+[\.\)]|\-|\*|Paso\s*\d+:?)\s*/i, ''));
  }

  getStepPhase(index: number, total: number): { label: string } {
    if (index === 0) return { label: 'Posición Inicial' };
    if (index === total - 1) return { label: 'Finalización' };
    return { label: `Paso ${index + 1}` };
  }

  isEnglish(es: string | undefined, en: string | undefined): boolean {
    if (!es) return true;
    if (es.trim() === en?.trim()) return true;
    return false;
  }
}
