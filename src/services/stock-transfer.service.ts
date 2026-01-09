import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service"; // Ensure path is correct
import { CreateStockTransferDto } from "src/dtos/create-transfer.dto";
import { TransferStatus, InventoryAdjustmentType } from "@prisma/client";

@Injectable()
export class StockTransferService {
    constructor(private readonly prisma: PrismaService) {}

    // --- 1. CREATE TRANSFER ---
    async initiateTransfer(data: CreateStockTransferDto, userId: string) {
        const { fromBranchId, toBranchId, items } = data;

        if (fromBranchId === toBranchId) {
            throw new BadRequestException("Source and Destination branches cannot be same");
        }

        return this.prisma.$transaction(async (tx) => {
            const createdTransfers: any[] = [];

            for (const item of items) {
                // Check Stock in Source Branch
                const fromProduct = await tx.product.findFirst({
                    where: { id: item.productId, branchId: fromBranchId }
                });

                if (!fromProduct) throw new BadRequestException(`Product ID ${item.productId} not found in source branch`);
                
                if (fromProduct.stockQuantity < item.quantity) {
                    throw new BadRequestException(`Insufficient stock for product: ${fromProduct.name}`);
                }

                // Create Transfer Record (Status: PENDING)
                const transfer = await tx.stockTransfer.create({
                    data: {
                        fromBranchId: fromBranchId,
                        toBranchId: toBranchId,
                        productId: item.productId,
                        quantity: item.quantity,
                        status: TransferStatus.PENDING,
                        createdById: userId, 
                    },
                    include: { product: true, fromBranch: true, toBranch: true }
                });
                createdTransfers.push(transfer);
            }

            return createdTransfers;
        });
    }

    // --- 2. GET ALL TRANSFERS ---
    async findAll() {
        const transfers = await this.prisma.stockTransfer.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                fromBranch: true,
                toBranch: true,
                product: true,
                createdBy: { select: { name: true, email: true } } 
            }
        });

        // Mapping for Frontend Compatibility
        return transfers.map(t => ({
            ...t,
            sourceBranchId: t.fromBranchId,
            destinationBranchId: t.toBranchId,
            items: [
                {
                    productId: t.productId,
                    quantity: t.quantity,
                    ...t.product 
                }
            ]
        }));
    }

    // --- 3. UPDATE STATUS ---
    async updateStatus(id: string, status: TransferStatus, userId: string) {
        return this.prisma.$transaction(async (tx) => {
            const transfer = await tx.stockTransfer.findUnique({
                where: { id },
                include: { product: true }
            });

            if (!transfer) throw new BadRequestException("Transfer not found");

            const currentStatus = transfer.status;

            // A. PENDING -> APPROVED (Stock Deducted form Source)
            // Abhi sirf nikal jayega, destination pe tab add hoga jab "COMPLETED" hoga
            if (status === TransferStatus.APPROVED && currentStatus === TransferStatus.PENDING) {
                // 1. Deduct Stock form Source
                await tx.product.update({
                    where: { id: transfer.productId },
                    data: { stockQuantity: { decrement: transfer.quantity } }
                });

                // 2. Log History (Transfer Out)
                await tx.inventoryAdjustment.create({
                    data: {
                        productId: transfer.productId,
                        branchId: transfer.fromBranchId,
                        type: InventoryAdjustmentType.TRANSFER_OUT,
                        quantity: -transfer.quantity,
                        referenceId: transfer.id,
                        reason: `Transfer Approved to Branch ${transfer.toBranchId}`,
                        createdById: userId
                    }
                });
            }

            // B. APPROVED -> COMPLETED (Stock Added to Destination)
            if (status === TransferStatus.COMPLETED && currentStatus === TransferStatus.APPROVED) {
                const sourceProduct = transfer.product;
                let destProductId = "";

                // Check if product exists in destination
                const destProduct = await tx.product.findFirst({
                    where: { sku: sourceProduct.sku, branchId: transfer.toBranchId }
                });

                if (destProduct) {
                    // Update existing
                    await tx.product.update({
                        where: { id: destProduct.id },
                        data: { stockQuantity: { increment: transfer.quantity } }
                    });
                    destProductId = destProduct.id;
                } else {
                    // Create new product in destination
                    // Exclude IDs and timestamps
                    const { id, branchId, createdAt, updatedAt, ...productData } = sourceProduct;
                    const newProd = await tx.product.create({
                        data: {
                            ...productData,
                            branchId: transfer.toBranchId,
                            stockQuantity: transfer.quantity
                        }
                    });
                    destProductId = newProd.id;
                }

                // Log History (Transfer In)
                await tx.inventoryAdjustment.create({
                    data: {
                        productId: destProductId,
                        branchId: transfer.toBranchId,
                        type: InventoryAdjustmentType.TRANSFER_IN,
                        quantity: transfer.quantity,
                        referenceId: transfer.id,
                        reason: `Transfer Received from Branch ${transfer.fromBranchId}`,
                        createdById: userId
                    }
                });
            }
            
            // C. APPROVED -> REJECTED (Revert Stock to Source)
            // Agar "Approve" ho chuka tha (matlab source se nikal gaya tha), to wapis daalna parega
            if (status === TransferStatus.REJECTED && currentStatus === TransferStatus.APPROVED) {
                 await tx.product.update({
                    where: { id: transfer.productId },
                    data: { stockQuantity: { increment: transfer.quantity } }
                });

                // Log Reversal
                await tx.inventoryAdjustment.create({
                    data: {
                        productId: transfer.productId,
                        branchId: transfer.fromBranchId,
                        type: InventoryAdjustmentType.MANUAL_ADD, // Reverting logic
                        quantity: transfer.quantity,
                        referenceId: transfer.id,
                        reason: `Transfer Rejected (Stock Reverted)`,
                        createdById: userId
                    }
                });
            }

            return tx.stockTransfer.update({
                where: { id },
                data: { status }
            });
        });
    }

    // --- 4. DELETE TRANSFER ---
    async remove(id: string) {
        return this.prisma.$transaction(async (tx) => {
            const transfer = await tx.stockTransfer.findUnique({ where: { id } });
            if (!transfer) throw new BadRequestException("Transfer not found");

            // Safety Check: If it was "Approved/In Transit", return stock before deleting record
            if (transfer.status === TransferStatus.APPROVED) {
                await tx.product.update({
                    where: { id: transfer.productId },
                    data: { stockQuantity: { increment: transfer.quantity } }
                });

                // Log Adjustment for deletion
                await tx.inventoryAdjustment.create({
                    data: {
                        productId: transfer.productId,
                        branchId: transfer.fromBranchId,
                        type: InventoryAdjustmentType.MANUAL_ADD,
                        quantity: transfer.quantity,
                        referenceId: transfer.id,
                        reason: `Transfer Record Deleted (Stock Restored)`,
                        createdById: null 
                    }
                });
            }

            return tx.stockTransfer.delete({ where: { id } });
        });
    }
}