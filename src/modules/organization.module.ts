import { Module } from '@nestjs/common';
import { OrganizationService } from '../services/organization.service';
import { OrganizationController } from '../controllers/organization.controller';
import { PrismaModule } from 'prisma/prisma.module';


@Module({
  imports:[PrismaModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
})
export class OrganizationModule {}
