import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "prisma/prisma.service";
import { CreateCategoryDto } from "src/dtos/create-category.dto";
import { UpdateCategoryDto } from "src/dtos/update-category.dto";

@Injectable()
export class CategoryService{
  constructor(private prisma: PrismaService){}
  
  create(data: CreateCategoryDto){
    return this.prisma.category.create({data,
      include:{
        children: true, parent:true,products:true
      }
    })
  }

  findAll(){
    return this.prisma.category.findMany({
      include:{children:true,parent:true, products:true}
    })
  }

  findOne(id: string){
    return this.prisma.category.findUnique({
      where:{id},
      include:{children:true,parent:true,products:true}
    })
  }

  update(id:string, data: UpdateCategoryDto){
    return this.prisma
    .category.update({
      where:{id},
      data,
      include:{children:true, parent:true,products:true}
    })
  } 

  remove(id:string){
    return this.prisma.category.delete({where:{id}})
  }
  
}