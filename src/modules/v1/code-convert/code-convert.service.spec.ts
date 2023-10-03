import { Test, TestingModule } from '@nestjs/testing';
import { CodeConvertService } from './code-convert.service';

describe('CodeConvertService', () => {
  let service: CodeConvertService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodeConvertService],
    }).compile();

    service = module.get<CodeConvertService>(CodeConvertService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
