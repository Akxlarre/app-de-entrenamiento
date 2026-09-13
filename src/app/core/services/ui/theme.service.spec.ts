import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { GsapAnimationsService } from './gsap-animations.service';
import { ToastService } from './toast.service';

const mockGsap = {};
const mockToast = { info: vi.fn() };

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: GsapAnimationsService, useValue: mockGsap },
        { provide: ToastService, useValue: mockToast },
      ],
    });

    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
