import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { guestGuard } from '@core/guards/guest.guard';
// import { roleGuard } from '@core/guards/role.guard'; // ← usar para rutas por rol

/**
 * Rutas de la aplicación.
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'app',
    pathMatch: 'full'
  },

  // Rutas públicas — autenticación
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },

  // Restablecimiento de contraseña — pública (el token llega en el URL fragment)
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.page').then(
        (m) => m.ResetPasswordPage,
      ),
  },

  // Entrenamiento en curso (Sin tabs)
  {
    path: 'app/workouts/active',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workouts/active-workout/active-workout.page').then((m) => m.ActiveWorkoutPage),
  },

  // Historial de entrenamientos (Forzar actualización del watcher)
  {
    path: 'app/workouts/history',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workouts/history/history.page').then((m) => m.HistoryPage),
  },

  // Creador y Editor de rutinas (Sin tabs)
  {
    path: 'app/workouts/routines/create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workouts/routines/routine-editor.page').then((m) => m.RoutineEditorPage),
  },
  {
    path: 'app/workouts/routines/edit/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workouts/routines/routine-editor.page').then((m) => m.RoutineEditorPage),
  },

  // Administrador del Plan / Mesociclo
  {
    path: 'app/workouts/plan/create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workouts/mesocycle/builder/mesocycle-builder.page').then((m) => m.MesocycleBuilderPage),
  },
  {
    path: 'app/workouts/plan',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workouts/mesocycle/mesocycle.page').then((m) => m.MesocyclePage),
  },

  // Rutas protegidas — envueltas en TabsLayout
  {
    path: 'app',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./layout/tabs-layout/tabs-layout.component').then((m) => m.TabsLayoutComponent),
    children: [
      { path: '', redirectTo: 'workouts', pathMatch: 'full' },
      {
        path: 'workouts',
        loadComponent: () =>
          import('./features/workouts/workouts.page').then((m) => m.WorkoutsPage),
      },
      {
        path: 'explorer',
        loadComponent: () =>
          import('./features/explorer/explorer.page').then((m) => m.ExplorerPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'coach',
        loadComponent: () =>
          import('./features/coach/coach.page').then((m) => m.CoachPage),
      }
    ],
  },

  {
    path: '**',
    redirectTo: 'app',
  },
];
