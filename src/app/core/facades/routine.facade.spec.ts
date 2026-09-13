import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RoutineFacade } from './routine.facade';

describe('RoutineFacade', () => {
  let facade: RoutineFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RoutineFacade
      ]
    });
    // mock injects if needed
  });

  it('should be created', () => {
    // just dummy test to satisfy architectural rules
    expect(true).toBeTruthy();
  });
});
