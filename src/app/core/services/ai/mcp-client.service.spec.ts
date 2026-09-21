import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { McpClientService } from './mcp-client.service';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';

const mockSupabase = {
  client: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'jwt-de-prueba' } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
};

describe('McpClientService', () => {
  let service: McpClientService;
  let mockHttp: any;

  beforeEach(() => {
    mockHttp = { post: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        McpClientService,
        { provide: HttpClient, useValue: mockHttp },
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    service = TestBed.inject(McpClientService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listTools()', () => {
    it('pide tools/list por JSON-RPC con el JWT del usuario', async () => {
      mockHttp.post.mockReturnValue(of({ tools: [{ name: 'crear_mesociclo_completo' }] }));

      const tools = await service.listTools();

      expect(tools).toEqual([{ name: 'crear_mesociclo_completo' }]);

      const [, body, options] = mockHttp.post.mock.calls[0];
      expect(body.method).toBe('tools/list');
      expect(body.jsonrpc).toBe('2.0');
      expect(options.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
    });

    it('acepta la respuesta envuelta en result', async () => {
      mockHttp.post.mockReturnValue(of({ result: { tools: [{ name: 'obtener_mis_rutinas' }] } }));

      const tools = await service.listTools();

      expect(tools).toEqual([{ name: 'obtener_mis_rutinas' }]);
    });

    it('devuelve lista vacía si el servidor no manda tools', async () => {
      mockHttp.post.mockReturnValue(of({}));

      expect(await service.listTools()).toEqual([]);
    });

    it('propaga el error si la llamada falla', async () => {
      mockHttp.post.mockReturnValue(throwError(() => ({ status: 500 })));

      await expect(service.listTools()).rejects.toBeDefined();
    });
  });
});
