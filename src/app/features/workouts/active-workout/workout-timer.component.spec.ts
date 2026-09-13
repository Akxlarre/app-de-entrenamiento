import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { WorkoutTimerComponent } from './workout-timer.component';

describe('WorkoutTimerComponent', () => {
  let component: WorkoutTimerComponent;
  let fixture: ComponentFixture<WorkoutTimerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutTimerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkoutTimerComponent);
    component = fixture.componentInstance;
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería formatear correctamente el tiempo transcurrido (00:00)', fakeAsync(() => {
    const pastTime = new Date();
    // Forzamos el input
    fixture.componentRef.setInput('startTime', pastTime);
    fixture.detectChanges();
    
    // Al instante 0
    expect(component.formattedTime()).toBe('00:00');
  }));

  it('debería actualizar el tiempo después de 65 segundos (01:05)', fakeAsync(() => {
    const pastTime = new Date();
    fixture.componentRef.setInput('startTime', pastTime);
    fixture.detectChanges();

    // Avanzamos 65 segundos en el tiempo virtual
    tick(65000);
    fixture.detectChanges();

    expect(component.formattedTime()).toBe('01:05');
    
    // Importante: destruir el componente para limpiar el interval() de RxJS
    fixture.destroy();
  }));
});
