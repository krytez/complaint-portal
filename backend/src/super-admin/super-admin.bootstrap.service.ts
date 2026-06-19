import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

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
    await this.bootstrapAdmins();
    await this.bootstrapPreRegisteredStudents();
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
    const passwordOk = existing.password
      ? await bcrypt.compare(password, existing.password)
      : false;

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

  private async bootstrapAdmins(): Promise<void> {
    try {
      const seedFilePath = path.join(process.cwd(), 'admins-seed.json');
      if (!fs.existsSync(seedFilePath)) {
        this.logger.warn(
          `Seed file not found at ${seedFilePath} — skipping admin seeding.`,
        );
        return;
      }

      const fileContent = fs.readFileSync(seedFilePath, 'utf8');
      const admins = JSON.parse(fileContent) as unknown;

      if (!Array.isArray(admins)) {
        this.logger.error(
          'Invalid format in admins-seed.json — expected an array.',
        );
        return;
      }

      for (const admin of admins as Array<{ email?: string }>) {
        const email = admin?.email;
        if (!email) {
          this.logger.warn(
            `Skipping invalid admin seed record: ${JSON.stringify(admin)}`,
          );
          continue;
        }

        const existing = await this.prisma.user.findUnique({
          where: { email },
        });

        if (!existing) {
          await this.prisma.user.create({
            data: {
              email,
              name: '',
              password: null,
              role: 'ADMIN',
            },
          });
          this.logger.log(`Pre-registered admin seeded → ${email}`);
        } else {
          if (existing.role !== 'ADMIN') {
            await this.prisma.user.update({
              where: { id: existing.id },
              data: { role: 'ADMIN' },
            });
            this.logger.log(
              `Updated pre-registered admin role to ADMIN → ${email}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to bootstrap pre-registered admins', error);
    }
  }

  private async bootstrapPreRegisteredStudents(): Promise<void> {
    try {
      const seedFilePath = path.join(process.cwd(), 'students-seed.json');
      if (!fs.existsSync(seedFilePath)) {
        this.logger.warn(
          `Seed file not found at ${seedFilePath} — skipping student seeding.`,
        );
        return;
      }

      const fileContent = fs.readFileSync(seedFilePath, 'utf8');
      const students = JSON.parse(fileContent) as unknown;

      if (!Array.isArray(students)) {
        this.logger.error(
          'Invalid format in students-seed.json — expected an array.',
        );
        return;
      }

      for (const student of students as Array<{ matricNumber?: string }>) {
        const matricNumber = student?.matricNumber;
        if (!matricNumber) {
          this.logger.warn(
            `Skipping invalid student seed record: ${JSON.stringify(student)}`,
          );
          continue;
        }

        const existing = await this.prisma.user.findUnique({
          where: { matricNumber },
        });

        if (!existing) {
          await this.prisma.user.create({
            data: {
              matricNumber,
              password: null,
              role: 'STUDENT',
            },
          });
          this.logger.log(`Pre-registered student seeded → (${matricNumber})`);
        } else {
          this.logger.debug(
            `Student (${matricNumber}) already exists/verified.`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to bootstrap pre-registered students', error);
    }
  }
}
