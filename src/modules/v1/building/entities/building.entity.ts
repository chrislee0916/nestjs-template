import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { DefaultSchema } from "src/database/entities/default.entity";


@Schema({
  timestamps: true,
  id: false,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
})
export class Building extends DefaultSchema {
  @Prop({
    type: mongoose.SchemaTypes.Mixed,
    validate: { validator: val => val && val.city && val.area }
  })
  properties: Record<string, string|number>;

  @Prop({ index: true })
  address: string;

  @Prop({
    type: mongoose.SchemaTypes.Mixed,
    index: true,
    validate: { validator: val => val && val.unit && val.sec && val.no },
  })
  buildNo: Record<string, string|number>;

}

export const BuildingSchema = SchemaFactory.createForClass(Building);
