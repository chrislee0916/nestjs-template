import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { DefaultSchema } from "src/database/entities/default.entity";
import { BuildNo } from "../../building/entities/building.entity";

export type BuildingBasicDocument = BuildingBasic & Document;

@Schema({
  timestamps: true,
  id: false,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
})
export class BuildingBasic extends DefaultSchema {

  @Prop({
    index: true
  })
  buildNo: BuildNo;

  @Prop({
    required: true
  })
  name: string;
}

export const BuildingBasicSchema = SchemaFactory.createForClass(BuildingBasic)