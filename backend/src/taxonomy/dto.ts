import { IsArray, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class RegionInputDto {
  @IsOptional() @IsString() @Length(2, 80) name?: string;
  @IsOptional() @IsString() @Length(0, 160) subtitle?: string;
  @IsOptional() @IsString() image?: string;
}

export class ConceptInputDto extends RegionInputDto {
  @IsOptional() @IsString() @Length(0, 600) description?: string;
}

export class ReorderDto {
  @IsArray() @IsString({ each: true }) ids!: string[];
}
