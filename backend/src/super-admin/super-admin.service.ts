import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async verifyPassword(
    superAdminId: string,
    password: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: superAdminId },
    });
    if (!user) throw new NotFoundException('Super admin not found');
    if (!user.password) throw new ForbiddenException('Incorrect password');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new ForbiddenException('Incorrect password');
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async getAllUsers() {
    return this.prisma.user.findMany({
      where: { role: { in: ['STUDENT', 'ADMIN'] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { email: 'asc' },
    });
  }

  async deleteAllUsers(superAdminId: string, password: string) {
    await this.verifyPassword(superAdminId, password);

    // Delete complaint views first (FK constraint)
    await this.prisma.complaintView.deleteMany({
      where: {
        OR: [
          { admin: { role: { in: ['STUDENT', 'ADMIN'] } } },
          { complaint: { student: { role: { in: ['STUDENT', 'ADMIN'] } } } },
        ],
      },
    });

    // Delete complaints belonging to students
    await this.prisma.complaint.deleteMany({
      where: { student: { role: 'STUDENT' } },
    });

    // Delete all non-super-admin users
    const result = await this.prisma.user.deleteMany({
      where: { role: { in: ['STUDENT', 'ADMIN'] } },
    });

    return { deleted: result.count };
  }

  async deleteSelectedUsers(
    superAdminId: string,
    ids: string[],
    password: string,
  ) {
    await this.verifyPassword(superAdminId, password);

    // Filter out the super admin's own ID from deletion
    const targetIds = ids.filter((id) => id !== superAdminId);

    // 1. Delete views related to target users
    await this.prisma.complaintView.deleteMany({
      where: {
        OR: [
          { adminId: { in: targetIds } },
          { complaint: { studentId: { in: targetIds } } },
        ],
      },
    });

    // 2. Delete complaints related to target students
    await this.prisma.complaint.deleteMany({
      where: { studentId: { in: targetIds } },
    });

    // 3. Delete the users
    const result = await this.prisma.user.deleteMany({
      where: {
        id: { in: targetIds },
        role: { in: ['STUDENT', 'ADMIN'] },
      },
    });

    return { deleted: result.count };
  }

  // ── Complaints ────────────────────────────────────────────────────────────

  async getAllComplaints() {
    const complaints = await this.prisma.complaint.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return complaints.map((c) => ({
      ...c,
      student: undefined,
    }));
  }

  async deleteAllComplaints(superAdminId: string, password: string) {
    await this.verifyPassword(superAdminId, password);

    await this.prisma.complaintView.deleteMany({});
    const result = await this.prisma.complaint.deleteMany({});

    return { deleted: result.count };
  }

  async deleteSelectedComplaints(
    superAdminId: string,
    ids: string[],
    password: string,
  ) {
    await this.verifyPassword(superAdminId, password);

    // 1. Delete views for target complaints
    await this.prisma.complaintView.deleteMany({
      where: { complaintId: { in: ids } },
    });

    // 2. Delete the complaints
    const result = await this.prisma.complaint.deleteMany({
      where: { id: { in: ids } },
    });

    return { deleted: result.count };
  }

  // ── Full Reset ────────────────────────────────────────────────────────────

  async resetApplication(superAdminId: string, password: string) {
    await this.verifyPassword(superAdminId, password);

    await this.prisma.complaintView.deleteMany({});
    await this.prisma.complaint.deleteMany({});
    const result = await this.prisma.user.deleteMany({
      where: { role: { in: ['STUDENT', 'ADMIN'] } },
    });

    return { deleted: result.count };
  }
}
