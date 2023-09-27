import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { CallbackWithoutResultAndOptionalError, Model, SaveOptions } from "mongoose";
import { DefaultSchema } from "src/database/entities/default.entity";

@Schema({
  timestamps: true,
  id: false,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
})
export class User extends DefaultSchema {
  @Prop({
    required: true,
  })
  username: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
