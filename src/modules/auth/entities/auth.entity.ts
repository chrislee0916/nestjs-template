import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema } from "mongoose";
import { DefaultSchema } from "src/database/entities/default.entity";

export type AuthDocument = Auth & Document;

@Schema({
  timestamps: true,
  id: false,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
})
export class Auth extends DefaultSchema {
  @Prop({
    require: true,
  })
  email: string;

  @Prop({
    require: true,
  })
  password: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
  })
  user: string;
}


export const AuthSchema = SchemaFactory.createForClass(Auth);
