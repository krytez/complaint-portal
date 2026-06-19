import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/auth.dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    // eslint-disable-next-line prettier/prettier
  ) { }

  async register(dto: RegisterDto) {
    if (!dto.password) {
      throw new BadRequestException('Password is required');
    }
    if (!dto.confirmPassword) {
      throw new BadRequestException('Confirm password is required');
    }
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const role = dto.role || 'STUDENT';

    if (role === 'ADMIN') {
      if (!dto.email) {
        throw new BadRequestException(
          'Email is required for admin registration',
        );
      }
      if (!dto.name || dto.name.trim().length < 2) {
        throw new BadRequestException(
          'Full name is required for admin registration',
        );
      }

      const admin = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!admin || admin.role !== 'ADMIN') {
        throw new BadRequestException(
          'You are not pre-registered/authorized to register as an admin',
        );
      }

      if (admin.password) {
        throw new ConflictException(
          'Admin with this email is already registered',
        );
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const user = await this.prisma.user.update({
        where: { id: admin.id },
        data: {
          name: dto.name,
          password: hashedPassword,
        },
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    } else {
      if (!dto.matricNumber) {
        throw new BadRequestException(
          'Matric number is required for student registration',
        );
      }
      if (!dto.email) {
        throw new BadRequestException(
          'Email is required for student registration',
        );
      }
      if (!dto.name || dto.name.trim().length < 2) {
        throw new BadRequestException(
          'Full name is required for student registration',
        );
      }

      const student = await this.prisma.user.findUnique({
        where: { matricNumber: dto.matricNumber },
      });

      if (!student || student.role !== 'STUDENT') {
        throw new BadRequestException(
          'You are not pre-registered/authorized to register',
        );
      }

      if (student.password) {
        throw new ConflictException(
          'Student with this matric number is already registered',
        );
      }

      const existingUserWithEmail = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          NOT: { id: student.id },
        },
      });

      if (existingUserWithEmail) {
        throw new ConflictException('Email is already in use');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const user = await this.prisma.user.update({
        where: { id: student.id },
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
        },
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
  }

  async validateUser(
    identifier: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { matricNumber: identifier }],
      },
    });

    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: Omit<User, 'password'>): Promise<{
    access_token: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
    };
  }> {
    const payload = { email: user.email ?? '', sub: user.id, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email ?? '',
        name: user.name ?? null,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}
