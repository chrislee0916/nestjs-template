import { ApiProperty } from '@nestjs/swagger';

export class DefaultResponsesDto {
  @ApiProperty({
    required: true,
    description: '執行狀態',
    example: true,
  })
  readonly success: boolean;
}

// show
export class DefaultDataDto {
  @ApiProperty({
    description: '資料庫唯一 ID',
    example: '62791f7a9704f94c81211b51',
  })
  _id?: string;

  @ApiProperty({
    description: '刪除時間',
    example: null,
  })
  deletedAt?: number;

  @ApiProperty({
    description: '建立時間',
    example: 1652105082190,
  })
  createdAt?: number;

  @ApiProperty({
    description: '更新時間',
    example: 1652105082190,
  })
  updatedAt?: number;
}

export class DefaultDeleteDto {
  @ApiProperty({
    required: true,
    description: '刪除 id',
    example: ['62a98c08dae4339fc6e5c2e5', '62a98c08dae4339fc6e5c2e5'],
  })
  readonly ids: string[];
}

// list
export class DefaultListResponsesDto {
  @ApiProperty({
    description: '總數',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: '數量',
    example: 25,
  })
  limit: number;

  @ApiProperty({
    description: '跳過數量',
    example: 0,
  })
  skip: number;

  @ApiProperty({
    description: '排序',
    example: { createdAt: -1 },
  })
  sort: string;
}

// query
export class DefaultListQueryDto {
  @ApiProperty({
    description: '數量',
    example: 25,
  })
  limit: number;

  @ApiProperty({
    description: '跳過數量',
    example: 0,
  })
  skip: number;

  @ApiProperty({
    description: '排序',
    example: { createdAt: -1 },
  })
  sort: string;
}

export class DefaultDBList {
  @ApiProperty({
    description: '數量',
    example: 10,
  })
  limit?: number;

  @ApiProperty({
    description: '跳過數量',
    example: 20,
  })
  skip?: number;

  @ApiProperty({
    description: '排序',
    example: { field: 'asc', test: -1 },
  })
  sort?: any;
}
