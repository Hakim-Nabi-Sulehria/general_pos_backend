import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
