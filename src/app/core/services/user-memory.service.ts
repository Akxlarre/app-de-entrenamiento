import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './infrastructure/supabase.service';

export interface UserMemory {
  id: string;
  category: 'injury' | 'preference' | 'goal' | 'limitation' | 'other';
  content: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserMemoryService {
  private supabase = inject(SupabaseService).client;

  async getMemories(): Promise<UserMemory[]> {
    const { data, error } = await this.supabase
      .from('user_memory')
      .select('id, category, content, created_at')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching user memory:', error);
      return [];
    }
    return data || [];
  }

  async deleteMemory(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_memory')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }
}
