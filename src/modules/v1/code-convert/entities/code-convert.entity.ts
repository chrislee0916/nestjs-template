import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema } from "mongoose";
import { DefaultSchema } from "src/database/entities/default.entity";

export type CodeConvertDocument = CodeConvert & Document;

@Schema({
  timestamps: true,
  id: false,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
})
export class CodeConvert extends DefaultSchema {
  @Prop({ type: MongooseSchema.Types.Mixed })
  city: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  town: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  unit: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  zone: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  zoneDetail: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  receiptNumber: Record<string, Record<string, string>>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  reason: Record<string, Record<string, string>>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  obligeeType: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  rights: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  certificate: Record<string, Record<string, string>>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  loanRightsRange: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  rightsAndTypes: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  rightsValue: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  duration: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  termination: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  rtogh: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  purpose: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  materials: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  accessoryUsage: Record<string, Record<string, string>>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  rgAllCode: Record<string, Record<string, string>>;
}

export const CodeConvertSchema = SchemaFactory.createForClass(CodeConvert)
