import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from '../dtos/create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
