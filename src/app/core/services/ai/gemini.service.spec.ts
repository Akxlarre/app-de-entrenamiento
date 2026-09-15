import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { GeminiService } from './gemini.service';
import { McpClientService } from './mcp-client.service';

const mockHttpClient = {
  post: vi.fn(),
};

const mockMcpClientService = {
  callTool: vi.fn(),
};

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(() => {
    vi.resetAllMocks();

    TestBed.configureTestingModule({
      providers: [
        GeminiService,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: McpClientService, useValue: mockMcpClientService },
      ],
    });

    service = TestBed.inject(GeminiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateResponse() — cuando una herramienta falla', () => {
    it('empuja un mensaje role:tool con el error limpio y deja que el modelo responda', async () => {
      mockHttpClient.post
        .mockReturnValueOnce(
          of({
            choices: [
              {
                message: {
                  tool_calls: [
                    {
                      id: 'call_1',
                      function: { name: 'eliminar_rutina', arguments: '{"routine_id":"abc"}' },
                    },
                  ],
                },
              },
            ],
          }),
        )
        .mockReturnValueOnce(
          of({
            choices: [
              {
                message: {
                  content:
                    'No pude borrarla porque un plan la está usando. Elimina el plan primero.',
                },
              },
            ],
          }),
        );

      mockMcpClientService.callTool.mockRejectedValue({
        status: 500,
        error: {
          error:
            'Error: No se puede eliminar esta rutina porque forma parte de un plan de entrenamiento. Para eliminarla, primero elimina el plan que la usa.',
        },
      });

      const result = await service.generateResponse([], 'Borra la rutina X');

      expect(result).toBe(
        'No pude borrarla porque un plan la está usando. Elimina el plan primero.',
      );

      const secondCallBody = mockHttpClient.post.mock.calls[1][1];
      const toolMessage = (secondCallBody.messages as any[]).find((m) => m.role === 'tool');
      expect(toolMessage).toBeTruthy();
      expect(toolMessage.tool_call_id).toBe('call_1');
      expect(toolMessage.content).toBe(
        'No se puede eliminar esta rutina porque forma parte de un plan de entrenamiento. Para eliminarla, primero elimina el plan que la usa.',
      );
    });

    it('no usa el mensaje genérico de "Verifica tu API Key"', async () => {
      mockHttpClient.post
        .mockReturnValueOnce(
          of({
            choices: [
              {
                message: {
                  tool_calls: [
                    { id: 'call_1', function: { name: 'eliminar_rutina', arguments: '{}' } },
                  ],
                },
              },
            ],
          }),
        )
        .mockReturnValueOnce(
          of({ choices: [{ message: { content: 'Necesito el id de la rutina a borrar.' } }] }),
        );

      mockMcpClientService.callTool.mockRejectedValue({
        status: 500,
        error: { error: 'Error: routine_id es requerido' },
      });

      const result = await service.generateResponse([], 'Borra una rutina');

      expect(result).not.toContain('Verifica tu API Key');
    });

    it('usa un mensaje de fallback si el error no trae texto utilizable', async () => {
      mockHttpClient.post
        .mockReturnValueOnce(
          of({
            choices: [
              {
                message: {
                  tool_calls: [
                    { id: 'call_1', function: { name: 'eliminar_rutina', arguments: '{}' } },
                  ],
                },
              },
            ],
          }),
        )
        .mockReturnValueOnce(of({ choices: [{ message: { content: 'ok' } }] }));

      mockMcpClientService.callTool.mockRejectedValue({ status: 0 });

      const result = await service.generateResponse([], 'Borra la rutina X');

      const secondCallBody = mockHttpClient.post.mock.calls[1][1];
      const toolMessage = (secondCallBody.messages as any[]).find((m) => m.role === 'tool');
      expect(toolMessage.content).toBeTruthy();
      expect(typeof toolMessage.content).toBe('string');
      expect(result).toBe('ok');
    });
  });

  describe('generateResponse() — la llamada a Groq falla directamente', () => {
    it('el manejo de 429 sigue intacto', async () => {
      mockHttpClient.post.mockReturnValueOnce(
        throwError(() => ({
          status: 429,
          headers: { get: () => null },
          error: { error: { message: 'Rate limit reached' } },
        })),
      );

      const result = await service.generateResponse([], 'hola');

      expect(result).toContain('429');
      expect(mockMcpClientService.callTool).not.toHaveBeenCalled();
    });

    it('otras fallas de Groq siguen mostrando el mensaje de API Key/conexión', async () => {
      mockHttpClient.post.mockReturnValueOnce(throwError(() => ({ status: 500, error: 'boom' })));

      const result = await service.generateResponse([], 'hola');

      expect(result).toContain('Verifica tu API Key');
    });
  });
});
