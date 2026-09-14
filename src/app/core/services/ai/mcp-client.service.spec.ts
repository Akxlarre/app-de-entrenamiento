import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { McpClientService } from './mcp-client.service';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';

const mockSupabase = {
  client: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
};

describe('McpClientService', () => {
  let service: McpClientService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        McpClientService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    service = TestBed.inject(McpClientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
