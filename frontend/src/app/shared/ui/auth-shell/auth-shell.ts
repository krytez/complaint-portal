import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-shell',
  imports: [ RouterLink ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="auth-shell">
      <section
        class="auth-shell__card"
        [class.auth-shell__card--wide]="wide()"
        [attr.aria-labelledby]="headingId()"
      >
        <header class="auth-shell__header">
          <h1 class="auth-shell__title" [id]="headingId()">{{ shellTitle() }}</h1>
          <p class="auth-shell__subtitle">{{ subtitle() }}</p>
        </header>

        <ng-content />

        <footer class="auth-shell__footer">
          <span class="auth-shell__footer-text">{{ footerText() }}</span>
          <a [routerLink]="footerLink()" class="auth-shell__link">{{ footerLinkLabel() }}</a>
        </footer>
      </section>
    </div>
  `,
  styles: `
    .auth-shell {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 1rem;
      background: linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%);
    }

    .auth-shell__card {
      width: 100%;
      max-width: 400px;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.7);
      border-radius: 20px;
      box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: auth-shell-slide-up 0.6s ease-out;
    }

    .auth-shell__card--wide {
      max-width: 420px;
    }

    .auth-shell__header {
      margin-bottom: 2rem;
      text-align: center;
    }

    .auth-shell__title {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.2;
      color: #1f2937;
    }

    .auth-shell__subtitle {
      margin: 0;
      color: #6b7280;
    }

    .auth-shell__form {
      margin-top: 1.5rem;
    }

    .auth-shell__role-toggle {
      display: flex;
      background: #f1f5f9;
      padding: 0.25rem;
      border-radius: 0.75rem;
      margin-bottom: 1.5rem;
      border: 1px solid #cbd5e1;
    }

    .auth-shell__role-btn {
      flex: 1;
      border: none;
      background: transparent;
      padding: 0.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    .auth-shell__role-btn--active {
      background: #fff;
      color: #1e293b;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }

    .auth-shell__field {
      margin-bottom: 1rem;
    }

    .auth-shell__label {
      display: block;
      margin-bottom: 0.4rem;
      font-weight: 600;
      color: #374151;
    }

    .auth-shell__input {
      width: 100%;
      min-height: 44px;
      padding: 0.75rem 0.9rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.85rem;
      background: #fff;
      color: #111827;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .auth-shell__input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
    }

    .auth-shell__password-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .auth-shell__password-wrapper .auth-shell__input {
      padding-right: 2.75rem;
    }

    .auth-shell__password-toggle {
      position: absolute;
      right: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      border: none;
      border-radius: 0.5rem;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      transition: color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
    }

    .auth-shell__password-toggle:hover {
      background-color: #f1f5f9;
      color: #1e293b;
    }

    .auth-shell__password-toggle:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: -2px;
    }

    .auth-shell__password-toggle ng-icon {
      display: inline-flex;
      font-size: 1.25rem;
    }

    .auth-shell__select {
      appearance: none;
      background-image:
        linear-gradient(45deg, transparent 50%, #64748b 50%),
        linear-gradient(135deg, #64748b 50%, transparent 50%);
      background-position: calc(100% - 22px) 1.15rem, calc(100% - 16px) 1.15rem;
      background-size: 6px 6px, 6px 6px;
      background-repeat: no-repeat;
    }

    .auth-shell__error {
      margin: 0.45rem 0 0;
      font-size: 0.875rem;
      color: #b91c1c;
    }

    .auth-shell__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 44px;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 10px;
      background: linear-gradient(to right, #2563eb, #3b82f6);
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
    }

    .auth-shell__button:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 12px -1px rgba(37, 99, 235, 0.3);
    }

    .auth-shell__button:disabled {
      opacity: 0.7;
      cursor: wait;
    }

    .auth-shell__button--spaced {
      margin-top: 0.5rem;
    }

    .auth-shell__footer {
      margin-top: 1rem;
      text-align: center;
    }

    .auth-shell__footer-text {
      color: #6b7280;
    }

    .auth-shell__link {
      color: #3b82f6;
      font-weight: 600;
      text-decoration: none;
    }

    .auth-shell__link:hover {
      text-decoration: underline;
    }

    @media (max-width: 480px) {
      .auth-shell {
        padding: 0.5rem;
      }

      .auth-shell__card {
        padding: 1.5rem;
        border-radius: 12px;
      }
    }

    @keyframes auth-shell-slide-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `
})
export class AuthShellComponent {
  shellTitle = input.required<string>();
  subtitle = input.required<string>();
  footerText = input.required<string>();
  footerLink = input.required<string>();
  footerLinkLabel = input.required<string>();
  headingId = input('auth-shell-title');
  wide = input(false);
}
