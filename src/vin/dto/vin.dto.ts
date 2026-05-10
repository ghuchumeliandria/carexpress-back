import { IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class VinParamDto {
  @IsString()
  @Length(17, 17)
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, { message: 'Invalid VIN format' })
  @Transform(({ value }) => String(value).trim().toUpperCase())
  vin!: string;
}
