import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { AuthShellComponent } from '../../shared/ui/auth-shell/auth-shell';
import { FeedbackBannerComponent } from '../../shared/ui/feedback-banner/feedback-banner';

@Component({
    selector: 'app-register',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        AuthShellComponent,
        FeedbackBannerComponent
    ],
    templateUrl: './register.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private passwordMatchValidator: ValidatorFn = (group): ValidationErrors | null => {
        const password = group.get('password')?.value;
        const confirmPassword = group.get('confirmPassword')?.value;
        return password === confirmPassword ? null : { mismatch: true };
    };

    registerForm = this.fb.nonNullable.group({
        name: [ '', [ Validators.required, Validators.minLength(2) ] ],
        email: [ '', [ Validators.required, Validators.email ] ],
        password: [
            '',
            [
                Validators.required,
                Validators.minLength(6),
                Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
            ]
        ],
        confirmPassword: [ '', [ Validators.required ] ]
    }, { validators: this.passwordMatchValidator });
    loading = signal(false);
    errorMessage = signal<string | null>(null);

    onSubmit(): void {
        if (this.registerForm.invalid) {
            Object.values(this.registerForm.controls).forEach(control => {
                if (control.invalid) {
                    control.markAsDirty();
                    control.updateValueAndValidity({ onlySelf: true });
                }
            });
            return;
        }

        this.loading.set(true);
        this.errorMessage.set(null);

        this.authService.register(this.registerForm.getRawValue()).subscribe({
            next: () => {
                this.router.navigate([ '/login' ], { queryParams: { registered: '1' } });
            },
            error: (err) => {
                this.errorMessage.set(err.error?.message || 'Registration failed');
                this.loading.set(false);
            }
        });
    }

    hasError(controlName: 'name' | 'email' | 'password' | 'confirmPassword', error: string): boolean {
        const control = this.registerForm.controls[ controlName ];
        return control.touched && control.hasError(error);
    }

    showMismatchError(): boolean {
        const confirmPassword = this.registerForm.controls.confirmPassword;
        return confirmPassword.touched && this.registerForm.hasError('mismatch');
    }
}
