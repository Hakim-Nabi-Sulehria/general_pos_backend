import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";

@Injectable()
export class InventoryRepository{
    constructor(private readonly prisma: PrismaService){}

    async findProduct(productId: string){
        return this.prisma.product.findUnique({where:{id:productId}})
    }

    async updateStock(productId: string, quantityChange: number){
        return this.prisma.product.update({
            where:{id:productId},
            data:{stockQuantity:{increment:quantityChange}}
        })
    }

    async recordAdjustment(data: any){
        return this.prisma.inventoryAdjustment.create({data})
    }

    async recordTransfer(data:any){
        return this.prisma.stockTransfer.create({data})
    }
}