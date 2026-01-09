import { Module } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { InventoryController } from "src/controllers/inventory.controller";
import { InventoryRepository } from "src/repository/inventory.repository";
import { InventoryService } from "src/services/inventory.service";
import { StockTransferService } from "src/services/stock-transfer.service";

@Module({
    controllers:[InventoryController],
    providers:[PrismaService,
        InventoryRepository,
        InventoryService,
        StockTransferService
    ],
    exports:[InventoryService]
})

export class InventoryModule{}