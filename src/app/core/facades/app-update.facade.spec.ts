import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppUpdateFacade } from './app-update.facade';
import { AppUpdateService } from '../services/app-update.service';

describe('AppUpdateFacade', () => {
  let facade: AppUpdateFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppUpdateFacade,
        {
          provide: AppUpdateService,
          useValue: {
            getCurrentBuild: vi.fn().mockResolvedValue(1),
            getLatestUpdate: vi.fn().mockResolvedValue(null)
          }
        }
      ]
    });
    facade = TestBed.inject(AppUpdateFacade);
  });

  it('should be created', () => {
    expect(facade).toBeTruthy();
  });
});
