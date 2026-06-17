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
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const student = await this.prisma.user.findUnique({
      where: { matricNumber: dto.matricNumber },
    });

    if (!student) {
      throw new BadRequestException('You are not pre-registered/authorized to register');
    }

    if (student.password) {
      throw new ConflictException('Student with this matric number is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.update({
      where: { id: student.id },
      data: {
        password: hashedPassword,
      },
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async validateUser(
    identifier: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { matricNumber: identifier },
        ],
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
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
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
