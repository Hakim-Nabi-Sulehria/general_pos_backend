import { Injectable } from '@nestjs/common';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import { UpdateOrganizationDto } from '../dtos/update-organization.dto';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService){}
  create(data: CreateOrganizationDto) {
    return this.prisma.organization.create({data});
  }

  findAll() {
    return this.prisma.organization.findMany({
      include: {branches:true}
    })
  }

  findOne(id: string) {
    return this.prisma.organization.findUnique({
      where: {id},
      include:{branches:true}
    })
  }

  update(id: string, data: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: {id},
      data
    })
  }

 async remove(id: string) {
  return this.prisma.organization.delete({ where: { id } });
}
}
