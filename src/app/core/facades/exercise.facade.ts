import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from '../services/infrastructure/supabase.service';

export interface ExerciseDefinition {
  id: string;
  name_es: string;
  name_en: string;
  muscle: string;
  equipment: string;
  category: string;
  instructions_es?: string;
  instructions_en?: string;
  images?: string[];
}

@Injectable({ providedIn: 'root' })
export class ExerciseFacade {
  private supabase = inject(SupabaseService);

  private allExercises = signal<ExerciseDefinition[]>([]);
  readonly exercises = signal<ExerciseDefinition[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  async loadExercises(searchQuery: string = '', muscleGroup: string = '') {
    if (!this.isLoaded) {
      if (!this.loadPromise) {
        this.loadPromise = this.fetchExercises();
      }
      await this.loadPromise;
    }
    
    this.applyFilters(searchQuery, muscleGroup);
  }

  private async fetchExercises() {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('exercises')
        .select('*')
        .order('name_es', { ascending: true });
        
      if (error) {
        this.error.set(error.message);
      } else if (data) {
        this.allExercises.set(data as ExerciseDefinition[]);
        this.isLoaded = true;
      }
    } catch (e: any) {
      this.error.set(e?.message || 'Error cargando ejercicios');
    } finally {
      this.loading.set(false);
    }
  }

  private applyFilters(searchQuery: string, muscleGroup: string) {
    const query = this.normalizeText(searchQuery);
    const muscle = muscleGroup.toLowerCase();

    const filtered = this.allExercises().filter(ex => {
      if (muscle && !(ex.muscle || '').toLowerCase().includes(muscle)) {
        return false;
      }
      
      if (query) {
        const nameEs = this.normalizeText(ex.name_es);
        const nameEn = this.normalizeText(ex.name_en);
        const equipment = this.normalizeText(ex.equipment);
        
        if (!nameEs.includes(query) && !nameEn.includes(query) && !equipment.includes(query)) {
          return false;
        }
      }
      return true;
    });

    this.exercises.set(filtered);
  }

  private normalizeText(text: string | undefined | null): string {
    if (!text) return '';
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
