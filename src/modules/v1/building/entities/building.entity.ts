import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema, Types} from "mongoose";
import { DefaultSchema } from "src/database/entities/default.entity";
import { BuildingBasicDocument } from "../../building-basic/entities/building-basic.entity";

export type BuildingDocument = Building & Document;


export class BuildNo {
  @Prop({ required: true })
  unit: string;

  @Prop({ required: true })
  sec: string;

  @Prop({ required: true })
  no: string;
}

@Schema({
  timestamps: true,
  id: false,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
})
export class Building extends DefaultSchema {
  // @Prop()
  // properties: Properties;

  @Prop({
    index: true,
    // unique: true
  })
  address: string;

  @Prop({
    index: true,
    unique: true
  })
  buildNo: BuildNo

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'BuildingBasic',
    required: false
  })
  basic: Types.ObjectId;
}

export const BuildingSchema = SchemaFactory.createForClass(Building);
