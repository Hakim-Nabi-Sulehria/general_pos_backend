import { IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from "class-validator";

export class CreateBranchDto {
   @IsString()
    @IsNotEmpty()
    name: string


    @IsString()
    @IsOptional()
    code?: string

    @IsString()
    @IsOptional()
    address?: string

    @IsString()
    @IsOptional()
    @IsPhoneNumber('PK',{message:"Invalid contact Number"})
    contactNumber?: string

    @IsString()
    @IsNotEmpty({message:'organizationId is Required'})
    organizationId: string

}
