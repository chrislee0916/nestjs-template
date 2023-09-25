import { Prop, Schema } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class DefaultSchema extends Document {
  @Prop({
    type: Boolean,
    default: false,
  })
  trashed: boolean;

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
