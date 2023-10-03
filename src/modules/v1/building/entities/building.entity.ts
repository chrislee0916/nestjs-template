import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema} from "mongoose";
import { DefaultSchema } from "src/database/entities/default.entity";

export type BuildingDocument = Building & Document;


export class BuildNo {
  @Prop({ required: true })
  unit: string;

  @Prop({ required: true })
  sec: string;

  @Prop({ required: true })
  no: string;
}

class Properties {
  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  area: string;

  @Prop()
  street: string;

  @Prop()
  section: number;

  @Prop()
  lane: number;

  @Prop()
  lane1: number;

  @Prop()
  alley: number;

  @Prop()
  alley1: number;

  @Prop()
  small_alley: number;

  @Prop()
  district: number;

  @Prop()
  number: number;

  @Prop()
  number1: number;

  @Prop()
  number2: number;

  @Prop()
  floor: number;

  @Prop()
  ext: number;
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
    required: true
  })
  basic: string;
}

export const BuildingSchema = SchemaFactory.createForClass(Building);
