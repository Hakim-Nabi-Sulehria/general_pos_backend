import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplierDto } from '../dtos/create-supplier.dto';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
