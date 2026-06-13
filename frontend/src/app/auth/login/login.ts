import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { AuthShellComponent } from '../../shared/ui/auth-shell/auth-shell';
import { FeedbackBannerComponent } from '../../shared/ui/feedback-banner/feedback-banner';

@Component({
    selector: 'app-login',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        AuthShellComponent,
        FeedbackBannerComponent
    ],
    templateUrl: './login.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    loginForm = this.fb.nonNullable.group({
        email: [ '', [ Validators.required, Validators.email ] ],
        password: [ '', [ Validators.required, Validators.minLength(6) ] ]
    });
    loading = signal(false);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(
        this.route.snapshot.queryParamMap.get('registered') ? 'Registration successful. Please sign in.' : null
    );

    onSubmit(): void {
        if (this.loginForm.invalid) {
            Object.values(this.loginForm.controls).forEach(control => {
                if (control.invalid) {
                    control.markAsDirty();
                    control.updateValueAndValidity({ onlySelf: true });
                }
            });
            return;
        }

        this.loading.set(true);
        this.errorMessage.set(null);
        this.successMessage.set(null);

        this.authService.login(this.loginForm.getRawValue()).subscribe({
            next: (res) => {
                const role = res.user.role;
                if (role === 'ADMIN') {
                    this.router.navigate([ '/admin' ]);
                } else {
                    this.router.navigate([ '/student-dashboard' ]);
                }
            },
            error: (err) => {
                this.errorMessage.set(err.error?.message || 'Invalid email or password');
                this.loading.set(false);
            }
        });
    }

    hasError(controlName: 'email' | 'password', error: string): boolean {
        const control = this.loginForm.controls[ controlName ];
        return control.touched && control.hasError(error);
    }
}
