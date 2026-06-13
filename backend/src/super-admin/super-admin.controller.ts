import {
  Controller,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { SuperAdminService } from './super-admin.service';
import { PasswordConfirmDto } from './dto/password-confirm.dto';
import { BatchDeleteDto } from './dto/batch-delete.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  // ── Users ─────────────────────────────────────────────────────────────────

  @Get('users')
  getUsers() {
    return this.superAdminService.getAllUsers();
  }

  @HttpCode(HttpStatus.OK)
  @Delete('users')
  deleteAllUsers(
    @Request() req: AuthenticatedRequest,
    @Body() dto: PasswordConfirmDto,
  ) {
    return this.superAdminService.deleteAllUsers(req.user.id, dto.password);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('users/batch')
  deleteSelectedUsers(
    @Request() req: AuthenticatedRequest,
    @Body() dto: BatchDeleteDto,
  ) {
    return this.superAdminService.deleteSelectedUsers(
      req.user.id,
      dto.ids,
      dto.password,
    );
  }

  // ── Complaints ────────────────────────────────────────────────────────────

  @Get('complaints')
  getComplaints() {
    return this.superAdminService.getAllComplaints();
  }

  @HttpCode(HttpStatus.OK)
  @Delete('complaints')
  deleteAllComplaints(
    @Request() req: AuthenticatedRequest,
    @Body() dto: PasswordConfirmDto,
  ) {
    return this.superAdminService.deleteAllComplaints(
      req.user.id,
      dto.password,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Delete('complaints/batch')
  deleteSelectedComplaints(
    @Request() req: AuthenticatedRequest,
    @Body() dto: BatchDeleteDto,
  ) {
    return this.superAdminService.deleteSelectedComplaints(
      req.user.id,
      dto.ids,
      dto.password,
    );
  }

  // ── Full Reset ────────────────────────────────────────────────────────────

  @HttpCode(HttpStatus.OK)
  @Delete('reset')
  resetApplication(
    @Request() req: AuthenticatedRequest,
    @Body() dto: PasswordConfirmDto,
  ) {
    return this.superAdminService.resetApplication(req.user.id, dto.password);
  }
}
