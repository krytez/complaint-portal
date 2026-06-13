import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

/**
 * Runs once on every application start.
 *
 * Guarantees that a SUPER_ADMIN account always exists and that its stored
 * password hash matches the plaintext value in SUPER_ADMIN_PASSWORD.
 * If the account is missing it is created; if the password drifted it is
 * re-hashed and updated automatically.
 */
@Injectable()
export class SuperAdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.bootstrapSuperAdmin();
    await this.bootstrapAdmin();
  }

  private async bootstrapSuperAdmin(): Promise<void> {
    const email = this.config.get<string>('SUPER_ADMIN_EMAIL');
    const password = this.config.get<string>('SUPER_ADMIN_PASSWORD');
    const name = this.config.get<string>('SUPER_ADMIN_NAME') ?? 'Super Admin';

    if (!email || !password) {
      this.logger.warn(
        'SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD is not set in .env — skipping super admin bootstrap.',
      );
      return;
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (!existing) {
      const hashed = await bcrypt.hash(password, 10);
      await this.prisma.user.create({
        data: { email, name, password: hashed, role: 'SUPER_ADMIN' },
      });
      this.logger.log(`Super admin created → ${email}`);
      return;
    }

    // Ensure the stored role is correct regardless of how the account was created
    const roleOk = existing.role === 'SUPER_ADMIN';
    const passwordOk = await bcrypt.compare(password, existing.password);

    if (roleOk && passwordOk) {
      this.logger.log(`Super admin verified → ${email}`);
      return;
    }

    // Something drifted — fix it
    const hashed = passwordOk
      ? existing.password
      : await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN', password: hashed },
    });
    this.logger.log(
      `Super admin updated (role=${roleOk ? 'ok' : 'fixed'}, password=${passwordOk ? 'ok' : 'resynced'}) → ${email}`,
    );
  }

  private async bootstrapAdmin(): Promise<void> {
    // Check if there are admins already registered
    const existingAdmin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      this.logger.log(
        'At least one admin is already registered — skipping admin bootstrap.',
      );
      return;
    }

    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    const name = this.config.get<string>('ADMIN_NAME') ?? 'Default Admin';

    if (!email || !password) {
      this.logger.warn(
        'No admin is registered, and ADMIN_EMAIL or ADMIN_PASSWORD is not set in .env — skipping admin bootstrap.',
      );
      return;
    }

    // Check if a user with this email already exists (e.g. as student)
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      const hashed = await bcrypt.hash(password, 10);
      await this.prisma.user.update({
        where: { email },
        data: { role: 'ADMIN', password: hashed, name },
      });
      this.logger.log(`Existing user role updated to admin → ${email}`);
    } else {
      const hashed = await bcrypt.hash(password, 10);
      await this.prisma.user.create({
        data: { email, name, password: hashed, role: 'ADMIN' },
      });
      this.logger.log(`Admin created → ${email}`);
    }
  }
}
