import { Injectable, inject, signal } from '@angular/core';
import { UserMemory, UserMemoryService } from './user-memory.service';

@Injectable({
  providedIn: 'root'
})
export class UserMemoryFacade {
  private memoryService = inject(UserMemoryService);

  readonly memories = signal<UserMemory[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async loadMemories(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const data = await this.memoryService.getMemories();
      this.memories.set(data);
    } catch (err: any) {
      this.error.set(err.message || 'Error al cargar memorias');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteMemory(id: string): Promise<void> {
    try {
      await this.memoryService.deleteMemory(id);
      this.memories.update(msgs => msgs.filter(m => m.id !== id));
    } catch (err: any) {
      this.error.set(err.message || 'Error al eliminar la memoria');
    }
  }
}
