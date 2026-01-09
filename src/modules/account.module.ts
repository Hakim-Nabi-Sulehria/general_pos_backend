import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { AccountController } from 'src/controllers/account.controller';
import { AccountService } from 'src/services/account.service';


@Module({
  imports:[PrismaModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
