import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema } from "mongoose";
import { DefaultSchema } from "src/database/entities/default.entity";

export type BuildingBasicDocument = BuildingBasic & Document;

@Schema({
  timestamps: true,
  id: false,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
})
export class BuildingBasic extends DefaultSchema {
  @Prop({ type: MongooseSchema.Types.Mixed })
  label: Record<string, any>

  @Prop({ type: MongooseSchema.Types.Mixed })
  own: Record<string, any>

  @Prop({ type: MongooseSchema.Types.Mixed })
  other: Record<string, any>

}

export const BuildingBasicSchema = SchemaFactory.createForClass(BuildingBasic)