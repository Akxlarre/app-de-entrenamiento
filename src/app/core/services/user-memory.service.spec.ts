import { TestBed } from '@angular/core/testing';
import { UserMemoryService } from './user-memory.service';
import { SupabaseService } from './infrastructure/supabase.service';

describe('UserMemoryService', () => {
  let service: UserMemoryService;
  let supabaseServiceMock: any;

  beforeEach(() => {
    supabaseServiceMock = {
      client: {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
    };

    TestBed.configureTestingModule({
      providers: [
        UserMemoryService,
        { provide: SupabaseService, useValue: supabaseServiceMock }
      ]
    });

    service = TestBed.inject(UserMemoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load memories', async () => {
    supabaseServiceMock.client.order.mockResolvedValueOnce({
      data: [{ id: '1', content: 'test', category: 'goal' }],
      error: null
    });
    const result = await service.getMemories();
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(supabaseServiceMock.client.from).toHaveBeenCalledWith('user_memory');
  });
});
