import { TestBed } from '@angular/core/testing';
import { DashboardFacade } from './dashboard.facade';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { AuthFacade } from './auth.facade';

describe('DashboardFacade', () => {
  let facade: DashboardFacade;
  let supabaseMock: any;
  let authMock: any;

  beforeEach(() => {
    supabaseMock = { client: { from: vi.fn() } };
    authMock = { currentUser: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        DashboardFacade,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: AuthFacade, useValue: authMock }
      ]
    });
    
    // Evitar llamada automática inicial
    authMock.currentUser.mockReturnValue(null);
    facade = TestBed.inject(DashboardFacade);
  });

  it('should be created', () => {
    expect(facade).toBeTruthy();
  });
});
