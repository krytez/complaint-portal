import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ComplaintService, Complaint } from '../complaint.service';
import { PlatformService } from '../core/services/platform.service';
import { AuthService } from '../auth/auth.service';
import { FeedbackBannerComponent } from '../shared/ui/feedback-banner/feedback-banner';
import { StatusBadgeComponent } from '../shared/ui/status-badge/status-badge';
import { DialogShellComponent } from '../shared/ui/dialog-shell/dialog-shell';

@Component({
  selector: 'app-student-dashboard',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FeedbackBannerComponent,
    StatusBadgeComponent,
    DialogShellComponent
  ],
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentDashboardComponent implements OnInit {

  private fb = inject(FormBuilder);
  private complaintService = inject(ComplaintService);
  private platform = inject(PlatformService);
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser();
  complaintForm = this.fb.nonNullable.group({
    description: [ '', [ Validators.required, Validators.minLength(10) ] ]
  });
  complaints = signal<Complaint[]>([]);
  loading = signal(false);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  selectedComplaint = signal<Complaint | null>(null);

  ngOnInit(): void {
    if (this.platform.isBrowser()) {
      this.loadComplaints();
    }
  }

  loadComplaints(): void {
    this.loading.set(true);
    this.complaintService.getMyComplaints().subscribe({
      next: (data: Complaint[]) => {
        this.complaints.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.feedback.set({ type: 'error', text: err.error?.message || 'Failed to load complaints.' });
        this.loading.set(false);
      }
    });
  }

  submitComplaint(): void {
    if (this.complaintForm.valid) {
      this.loading.set(true);
      this.complaintService.createComplaint(this.complaintForm.getRawValue()).subscribe({
        next: () => {
          this.feedback.set({ type: 'success', text: 'Complaint submitted successfully.' });
          this.complaintForm.reset({ description: '' });
          this.loadComplaints();
        },
        error: () => {
          this.feedback.set({ type: 'error', text: 'Failed to submit complaint.' });
          this.loading.set(false);
        }
      });
    } else {
      Object.values(this.complaintForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }

  viewDetails(complaint: Complaint): void {
    this.selectedComplaint.set(complaint);
  }

  closeDetails(): void {
    this.selectedComplaint.set(null);
  }

  hasDescriptionError(error: 'required' | 'minlength'): boolean {
    const control = this.complaintForm.controls.description;
    return control.touched && control.hasError(error);
  }

  dismissFeedback(): void {
    this.feedback.set(null);
  }
}
