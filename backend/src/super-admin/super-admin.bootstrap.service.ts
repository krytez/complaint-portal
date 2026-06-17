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
    const passwordOk = existing.password ? await bcrypt.compare(password, existing.password) : false;

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
    const adminsConfig = [
      {
        emailKey: 'ADMIN_1_EMAIL',
        passwordKey: 'ADMIN_1_PASSWORD',
        nameKey: 'ADMIN_1_NAME',
        defaultName: 'Admin One',
      },
      {
        emailKey: 'ADMIN_2_EMAIL',
        passwordKey: 'ADMIN_2_PASSWORD',
        nameKey: 'ADMIN_2_NAME',
        defaultName: 'Admin Two',
      },
      {
        emailKey: 'ADMIN_3_EMAIL',
        passwordKey: 'ADMIN_3_PASSWORD',
        nameKey: 'ADMIN_3_NAME',
        defaultName: 'Admin Three',
      },
    ];

    for (const adminCfg of adminsConfig) {
      const email = this.config.get<string>(adminCfg.emailKey);
      const password = this.config.get<string>(adminCfg.passwordKey);
      const name = this.config.get<string>(adminCfg.nameKey) ?? adminCfg.defaultName;

      if (!email || !password) {
        this.logger.warn(
          `${adminCfg.emailKey} or ${adminCfg.passwordKey} is not set in .env — skipping this admin bootstrap.`,
        );
        continue;
      }

      const existing = await this.prisma.user.findUnique({ where: { email } });

      if (!existing) {
        const hashed = await bcrypt.hash(password, 10);
        await this.prisma.user.create({
          data: { email, name, password: hashed, role: 'ADMIN' },
        });
        this.logger.log(`Admin created → ${email}`);
        continue;
      }

      const roleOk = existing.role === 'ADMIN';
      const passwordOk = existing.password ? await bcrypt.compare(password, existing.password) : false;
      const nameOk = existing.name === name;

      if (roleOk && passwordOk && nameOk) {
        this.logger.log(`Admin verified → ${email}`);
        continue;
      }

      const hashed = passwordOk
        ? existing.password
        : await bcrypt.hash(password, 10);
      await this.prisma.user.update({
        where: { email },
        data: { role: 'ADMIN', password: hashed, name },
      });
      this.logger.log(
        `Admin updated (role=${roleOk ? 'ok' : 'fixed'}, password=${passwordOk ? 'ok' : 'resynced'}, name=${nameOk ? 'ok' : 'fixed'}) → ${email}`,
      );
    }
  }

  private async bootstrapPreRegisteredStudents(): Promise<void> {
    try {
      const seedFilePath = path.join(process.cwd(), 'students-seed.json');
      if (!fs.existsSync(seedFilePath)) {
        this.logger.warn(`Seed file not found at ${seedFilePath} — skipping student seeding.`);
        return;
      }

      const fileContent = fs.readFileSync(seedFilePath, 'utf8');
      const students = JSON.parse(fileContent);

      if (!Array.isArray(students)) {
        this.logger.error('Invalid format in students-seed.json — expected an array.');
        return;
      }

      for (const student of students) {
        const { matricNumber, email, name } = student;
        if (!matricNumber || !email || !name) {
          this.logger.warn(`Skipping invalid student seed record: ${JSON.stringify(student)}`);
          continue;
        }

        const existing = await this.prisma.user.findFirst({
          where: {
            OR: [
              { matricNumber },
              { email },
            ],
          },
        });

        if (!existing) {
          await this.prisma.user.create({
            data: {
              matricNumber,
              email,
              name,
              password: null,
              role: 'STUDENT',
            },
          });
          this.logger.log(`Pre-registered student seeded → ${name} (${matricNumber})`);
        } else {
          const isStudent = existing.role === 'STUDENT';
          const nameMatch = existing.name === name;
          const emailMatch = existing.email === email;
          const matricMatch = existing.matricNumber === matricNumber;

          if (isStudent && (!nameMatch || !emailMatch || !matricMatch) && !existing.password) {
            await this.prisma.user.update({
              where: { id: existing.id },
              data: {
                name,
                email,
                matricNumber,
              },
            });
            this.logger.log(`Updated pre-registered student record → ${name} (${matricNumber})`);
          } else {
            this.logger.debug(`Student ${name} (${matricNumber}) already exists/verified.`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to bootstrap pre-registered students', error);
    }
  }
}
