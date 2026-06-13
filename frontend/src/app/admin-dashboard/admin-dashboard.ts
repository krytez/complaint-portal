import { ChangeDetectionStrategy, Component, OnInit, signal, inject, AfterViewInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplaintService, Complaint } from '../complaint.service';
import { PlatformService } from '../core/services/platform.service';
import { AuthService } from '../auth/auth.service';
import { FeedbackBannerComponent } from '../shared/ui/feedback-banner/feedback-banner';
import { StatusBadgeComponent } from '../shared/ui/status-badge/status-badge';
import { DialogShellComponent } from '../shared/ui/dialog-shell/dialog-shell';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule,
    FeedbackBannerComponent,
    StatusBadgeComponent,
    DialogShellComponent
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private observer: IntersectionObserver | null = null;
  private viewedIds = new Set<string>();

  private complaintService = inject(ComplaintService);
  private platform = inject(PlatformService);
  private authService = inject(AuthService);
  currentUser = this.authService.currentUser();
  complaints = signal<Complaint[]>([]);
  sortDirection = signal<'asc' | 'desc'>('asc');
  loading = signal(false);
  feedback = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  selectedComplaint = signal<Complaint | null>(null);
  statusDialog = signal<{ complaint: Complaint; status: 'Seen' | 'Resolved' } | null>(null);
  commentDraft = signal('');
  displayedComplaints = computed(() => {
    const complaints = [ ...this.complaints() ];
    const direction = this.sortDirection();
    return complaints.sort((a, b) =>
      direction === 'asc' ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status)
    );
  });

  ngOnInit(): void {
    if (this.platform.isBrowser()) {
      this.loadAllComplaints();
    }
  }

  loadAllComplaints(): void {
    this.loading.set(true);
    this.complaintService.getComplaints().subscribe({
      next: (data: Complaint[]) => {
        this.complaints.set(data);
        this.loading.set(false);
        // Re-setup observer after data load
        setTimeout(() => this.setupObserver(), 500);
      },
      error: (err) => {
        this.feedback.set({ type: 'error', text: err.error?.message || 'Failed to load complaints.' });
        this.loading.set(false);
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.platform.isBrowser()) {
      this.setupObserver();
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupObserver(): void {
    if (!this.platform.isBrowser()) return;

    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('data-id');
          if (id && !this.viewedIds.has(id)) {
            const complaint = this.complaints().find((c) => c.id === id);
            // Only mark as viewed if it's pending or not already viewed by current user
            const alreadySeen = complaint?.views?.some((v) => v.admin.email === this.currentUser?.email);

            if (complaint && !alreadySeen) {
              this.markAsViewed(id);
            } else if (id) {
              this.viewedIds.add(id);
            }
          }
        }
      });
    }, { threshold: 0.1 });

    const rows = document.querySelectorAll('tr[data-id]');
    rows.forEach((row) => this.observer?.observe(row));
  }

  private markAsViewed(id: string): void {
    if (this.viewedIds.has(id)) return;
    this.viewedIds.add(id);

    this.complaintService.markAsViewed(id).subscribe({
      next: (updated) => {
        // Update the signal with the new status/views if needed
        this.complaints.update((current) =>
          current.map((c) => (c.id === id ? updated : c))
        );
      },
      error: (err) => {
        console.error('Failed to mark as viewed', err);
        this.viewedIds.delete(id); // Retry later if needed
      }
    });
  }

  openStatusDialog(complaint: Complaint, status: 'Seen' | 'Resolved'): void {
    this.commentDraft.set(complaint.adminComment ?? '');
    this.statusDialog.set({ complaint, status });
  }

  confirmStatusUpdate(): void {
    const dialog = this.statusDialog();
    if (!dialog) {
      return;
    }

    this.loading.set(true);
    this.complaintService.updateComplaintStatus(
      dialog.complaint.id,
      dialog.status,
      this.commentDraft().trim()
    ).subscribe({
      next: () => {
        this.feedback.set({ type: 'success', text: `Status updated to ${dialog.status}.` });
        this.statusDialog.set(null);
        this.loadAllComplaints();
      },
      error: (err) => {
        this.feedback.set({ type: 'error', text: err.error?.message || 'Failed to update status.' });
        this.loading.set(false);
      }
    });
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

  closeStatusDialog(): void {
    this.statusDialog.set(null);
  }

  updateCommentDraft(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement) {
      this.commentDraft.set(target.value);
    }
  }

  dismissFeedback(): void {
    this.feedback.set(null);
  }

  getViewedByNames(complaint: Complaint): string {
    return complaint.views?.map((view) => view.admin.name).join(', ') ?? '';
  }

  toggleStatusSort(): void {
    this.sortDirection.update((current) => current === 'asc' ? 'desc' : 'asc');
  }
}
