import { Prop, Schema } from "@nestjs/mongoose";
import { DefaultSchema } from "src/database/entities/default.entity";


@Schema({
  timestamps: true,
  id: false,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
})
export class Building extends DefaultSchema{
  @Prop({
    require: true,
    trim: true
  })
  city: string;
  area: string;
  street: string;
  section: number;
  lane: number;
  lane1: number;
  alley: number;
  alley1: number;
  small_alley: number;
  district: string;
  number: number;
  number1: number;
  number2: number;
  floor: number;
  ext: number;
  address: string;
}
