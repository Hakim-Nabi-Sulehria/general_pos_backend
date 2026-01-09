import { Module } from '@nestjs/common';
import { BranchService } from '../services/branch.service';
import { BranchController } from '../controllers/branch.controller';
import { PrismaModule } from 'prisma/prisma.module';


@Module({
  imports:[PrismaModule],
  controllers: [BranchController],
  providers: [BranchService],
})
export class BranchModule {}
