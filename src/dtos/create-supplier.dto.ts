import { IsOptional, IsString } from "class-validator";

export class CreateSupplierDto {

    @IsString()
    name: string;

    @IsString()
    email: string

    @IsOptional()
    @IsString()
    phone?: string

    @IsString()
    address: string

    @IsString()
    branchId:string

}
