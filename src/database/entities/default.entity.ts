import { Prop, Schema } from '@nestjs/mongoose';

@Schema()
export class DefaultSchema {
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
