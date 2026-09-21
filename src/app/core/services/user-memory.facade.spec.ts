import { TestBed } from '@angular/core/testing';
import { UserMemoryFacade } from './user-memory.facade';
import { UserMemoryService } from './user-memory.service';

describe('UserMemoryFacade', () => {
  let facade: UserMemoryFacade;
  let serviceMock: any;

  beforeEach(() => {
    serviceMock = {
      getMemories: vi.fn().mockResolvedValue([]),
      deleteMemory: vi.fn().mockResolvedValue({ error: null })
    };

    TestBed.configureTestingModule({
      providers: [
        UserMemoryFacade,
        { provide: UserMemoryService, useValue: serviceMock }
      ]
    });

    facade = TestBed.inject(UserMemoryFacade);
  });

  it('should be created', () => {
    expect(facade).toBeTruthy();
  });

  it('should load memories', async () => {
    await facade.loadMemories();
    expect(serviceMock.getMemories).toHaveBeenCalled();
    expect(facade.memories().length).toBe(0);
  });

  it('should delete memory', async () => {
    await facade.deleteMemory('123');
    expect(serviceMock.deleteMemory).toHaveBeenCalledWith('123');
  });
});
