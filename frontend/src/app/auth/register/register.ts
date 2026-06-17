import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroEye, heroEyeSlash } from '@ng-icons/heroicons/outline';
import { AuthService, RegisterPayload } from '../auth.service';
import { AuthShellComponent } from '../../shared/ui/auth-shell/auth-shell';
import { FeedbackBannerComponent } from '../../shared/ui/feedback-banner/feedback-banner';

@Component({
    selector: 'app-register',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        AuthShellComponent,
        FeedbackBannerComponent,
        NgIcon
    ],
    providers: [
        provideIcons({ heroEye, heroEyeSlash })
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

    selectedRole = signal<'STUDENT' | 'ADMIN'>('STUDENT');

    registerForm = this.fb.nonNullable.group({
        role: [ 'STUDENT' as 'STUDENT' | 'ADMIN' ],
        matricNumber: [ '' ],
        email: [ '' ],
        name: [ '' ],
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
    showPassword = signal(false);
    showConfirmPassword = signal(false);
    errorMessage = signal<string | null>(null);

    constructor() {
        this.setRole('STUDENT');
    }

    setRole(role: 'STUDENT' | 'ADMIN'): void {
        this.selectedRole.set(role);
        this.registerForm.controls.role.setValue(role);
        this.errorMessage.set(null);
        
        const { matricNumber, email, name } = this.registerForm.controls;
        
        matricNumber.clearValidators();
        email.clearValidators();
        name.clearValidators();
        
        if (role === 'STUDENT') {
            matricNumber.setValidators([ Validators.required ]);
            matricNumber.setValue('');
        } else {
            email.setValidators([ Validators.required, Validators.email ]);
            email.setValue('');
            name.setValidators([ Validators.required, Validators.minLength(2) ]);
            name.setValue('');
        }
        
        matricNumber.updateValueAndValidity();
        email.updateValueAndValidity();
        name.updateValueAndValidity();
    }

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

        const rawValues = this.registerForm.getRawValue();
        const payload: RegisterPayload = {
            role: rawValues.role,
            password: rawValues.password,
            confirmPassword: rawValues.confirmPassword,
        };
        
        if (rawValues.role === 'STUDENT') {
            payload.matricNumber = rawValues.matricNumber;
        } else {
            payload.email = rawValues.email;
            payload.name = rawValues.name;
        }

        this.authService.register(payload).subscribe({
            next: () => {
                this.router.navigate([ '/login' ], { queryParams: { registered: '1' } });
            },
            error: (err) => {
                this.errorMessage.set(err.error?.message || 'Registration failed');
                this.loading.set(false);
            }
        });
    }

    hasError(controlName: 'matricNumber' | 'email' | 'name' | 'password' | 'confirmPassword', error: string): boolean {
        const control = this.registerForm.controls[ controlName ];
        return control.touched && control.hasError(error);
    }

    showMismatchError(): boolean {
        const confirmPassword = this.registerForm.controls.confirmPassword;
        return confirmPassword.touched && this.registerForm.hasError('mismatch');
    }
}
