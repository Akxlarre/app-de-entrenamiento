import { TestBed } from '@angular/core/testing';
import { CoachFacade } from './coach.facade';
import { GeminiService } from './gemini.service';
import { McpClientService } from './mcp-client.service';

import { MessageService } from 'primeng/api';

const mockGeminiService = {
  chat: vi.fn().mockResolvedValue('Respuesta del coach'),
};

const mockMcpClientService = {
  queryContext: vi.fn().mockResolvedValue([]),
};

describe('CoachFacade', () => {
  let facade: CoachFacade;

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        CoachFacade,
        { provide: GeminiService, useValue: mockGeminiService },
        { provide: McpClientService, useValue: mockMcpClientService },
        { provide: MessageService, useValue: { add: vi.fn(), clear: vi.fn() } }
      ],
    });

    facade = TestBed.inject(CoachFacade);
  });

  it('should be created', () => {
    expect(facade).toBeTruthy();
  });

  it('should initialize with welcome message', () => {
    expect(facade.messages().length).toBeGreaterThan(0);
  });
});
