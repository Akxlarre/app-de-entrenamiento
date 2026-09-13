import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFacade } from '@core/facades/auth.facade';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';

const PASSWORD_MIN_LENGTH = 8;

/**
 * ResetPasswordPage — Página de restablecimiento de contraseña.
 *
 * Supabase redirige aquí con un fragment (#access_token=...) tras hacer clic
 * en el enlace del correo. El cliente de Supabase detecta el token
 * automáticamente via `detectSessionInUrl: true` (configurado en SupabaseService)
 * y emite el evento PASSWORD_RECOVERY en onAuthStateChange.
 *
 * Flujo:
 *  1. Usuario llega a /reset-password con token en el fragment.
 *  2. Supabase JS establece la sesión temporalmente.
 *  3. El usuario ingresa nueva contraseña → AuthFacade.updatePassword().
 *  4. Éxito → redirige a /app.
 *  5. Token inválido/expirado → muestra error y link a login.
 */
@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  host: { style: 'display: contents;' },
  template: `
    <div
      class="flex min-h-[100dvh] flex-col items-center justify-center bg-[#09090b] px-4 py-8 relative overflow-hidden"
    >
      <!-- Ambient glow (mismo que login) -->
      <div
        class="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-[#2563eb]/15 blur-[120px] rounded-full"
      ></div>

      <!-- Brand header -->
      <div class="mb-8 text-center relative z-10 animate-fade-in-up">
        <div
          class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-[#3b82f6]/20 to-[#2563eb]/5 border border-[#3b82f6]/30 mb-3 shadow-lg shadow-[#3b82f6]/10"
        >
          <span class="text-2xl">🏋️</span>
        </div>
        <h1 class="m-0 text-3xl font-black italic tracking-tighter text-white sm:text-4xl">
          <span class="text-[#3b82f6]">FIT</span>TRACK
        </h1>
        <p class="m-0 mt-1 text-xs font-medium uppercase tracking-widest text-zinc-400">
          Tu diario de entrenamiento y fuerza
        </p>
      </div>

      <!-- Glass card -->
      <div
        class="w-full max-w-[390px] rounded-2xl border border-white/[0.08] bg-[#121217]/95 p-7 shadow-2xl backdrop-blur-xl relative z-10"
      >
        <div class="mb-6 text-center">
          <h2 class="m-0 text-xl font-bold tracking-tight text-white">
            Nueva contraseña
          </h2>
          <p class="m-0 mt-1.5 text-xs text-zinc-400">
            Elige una contraseña segura de al menos {{ minLength }} caracteres
          </p>
        </div>

        <!-- Token inválido -->
        @if (tokenError()) {
          <div
            class="mb-4 flex flex-col gap-3 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/10 px-3.5 py-3 text-xs font-medium text-[#f87171]"
            role="alert"
          >
            <span>El enlace de recuperación es inválido o ya expiró.</span>
            <button
              class="cursor-pointer border-none bg-transparent p-0 text-left font-semibold text-[#60a5fa] transition-colors hover:text-[#93c5fd]"
              (click)="goToLogin()"
            >
              Solicitar un nuevo enlace →
            </button>
          </div>
        }

        <!-- Error de formulario -->
        @if (errorMsg()) {
          <div
            class="mb-4 flex items-center gap-2 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/10 px-3.5 py-2.5 text-xs font-medium text-[#f87171]"
            role="alert"
          >
            <span class="text-sm">⚠</span>
            <span>{{ errorMsg() }}</span>
          </div>
        }

        <!-- Éxito -->
        @if (successMsg()) {
          <div
            class="mb-4 flex items-center gap-2 rounded-xl border border-[#10b981]/20 bg-[#10b981]/10 px-3.5 py-2.5 text-xs font-medium text-[#34d399]"
            role="status"
          >
            <span class="text-sm">✓</span>
            <span>{{ successMsg() }}</span>
          </div>
        }

        <!-- Formulario (oculto si token inválido o ya tuvo éxito) -->
        @if (!tokenError() && !successMsg()) {
          <form class="flex flex-col gap-4" (ngSubmit)="onSubmit()">
            <!-- Nueva contraseña -->
            <div class="flex flex-col gap-1.5">
              <label
                for="password"
                class="text-xs font-semibold uppercase tracking-wider text-zinc-400"
              >Nueva contraseña</label>
              <input
                id="password"
                type="password"
                class="h-12 w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:border-[#3b82f6] focus:bg-[#3b82f6]/[0.02] focus:ring-2 focus:ring-[#3b82f6]/20"
                placeholder="••••••••"
                [(ngModel)]="password"
                name="password"
                required
                autocomplete="new-password"
              />
            </div>

            <!-- Confirmar contraseña -->
            <div class="flex flex-col gap-1.5">
              <label
                for="confirm"
                class="text-xs font-semibold uppercase tracking-wider text-zinc-400"
              >Confirmar contraseña</label>
              <input
                id="confirm"
                type="password"
                class="h-12 w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:border-[#3b82f6] focus:bg-[#3b82f6]/[0.02] focus:ring-2 focus:ring-[#3b82f6]/20"
                placeholder="••••••••"
                [(ngModel)]="confirm"
                name="confirm"
                required
                autocomplete="new-password"
              />
            </div>

            <!-- Submit -->
            <button
              type="submit"
              class="mt-1 h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-gradient-to-r from-[#2563eb] to-[#3b82f6] font-bold text-sm tracking-wide text-white shadow-lg shadow-[#3b82f6]/25 transition-all duration-150 hover:from-[#3b82f6] hover:to-[#60a5fa] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 flex"
              [disabled]="loading()"
            >
              @if (loading()) {
                <span
                  class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                ></span>
              }
              <span>Guardar contraseña</span>
            </button>
          </form>
        }

        <!-- Footer -->
        <div
          class="mt-6 flex items-center justify-center border-t border-white/[0.06] pt-5"
        >
          <button
            class="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-[#60a5fa] transition-colors hover:text-[#93c5fd]"
            (click)="goToLogin()"
          >
            Volver a iniciar sesión
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordPage implements OnInit {
  private readonly auth = inject(AuthFacade);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMsg = signal('');
  readonly successMsg = signal('');
  readonly tokenError = signal(false);

  readonly minLength = PASSWORD_MIN_LENGTH;

  password = '';
  confirm = '';

  ngOnInit(): void {
    // Supabase emite PASSWORD_RECOVERY cuando detecta el token en la URL.
    // Si tras 3s no hubo sesión válida, asumimos token inválido/expirado.
    const timeout = setTimeout(() => {
      if (!this.auth.isAuthenticated()) {
        this.tokenError.set(true);
      }
    }, 3000);

    this.supabase.client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(timeout);
        this.tokenError.set(false);
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.errorMsg.set('');

    const validationError = this.validate();
    if (validationError) {
      this.errorMsg.set(validationError);
      return;
    }

    this.loading.set(true);
    try {
      const { error } = await this.auth.updatePassword(this.password);
      if (error) {
        this.errorMsg.set(error.message);
      } else {
        this.successMsg.set('¡Contraseña actualizada! Redirigiendo...');
        setTimeout(() => this.router.navigate(['/app']), 1500);
      }
    } catch {
      this.errorMsg.set('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private validate(): string | null {
    if (!this.password) return 'La contraseña es obligatoria.';
    if (this.password.length < PASSWORD_MIN_LENGTH)
      return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    if (this.password !== this.confirm)
      return 'Las contraseñas no coinciden.';
    return null;
  }
}
