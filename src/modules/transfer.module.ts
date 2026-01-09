import { Module } from '@nestjs/common';
import { TransferController } from 'src/controllers/transfer.controller';
import { StockTransferService } from 'src/services/stock-transfer.service';

@Module({
  controllers: [TransferController],
  providers: [StockTransferService],
})
export class TransferModule {}
