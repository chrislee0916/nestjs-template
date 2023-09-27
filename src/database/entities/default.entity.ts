import { Prop, Schema } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class DefaultSchema extends Document {
  @Prop({
    type: Number,
    default: null,
  })
  deletedAt: number;

  @Prop({
    type: Number,
    default: Date.now,
  })
  createdAt: number;

  @Prop({
    type: Number,
    default: Date.now,
  })
  updatedAt: number;
}
