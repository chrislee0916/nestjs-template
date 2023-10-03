import { Test, TestingModule } from '@nestjs/testing';
import { CodeConvertController } from './code-convert.controller';
import { CodeConvertService } from './code-convert.service';

describe('CodeConvertController', () => {
  let controller: CodeConvertController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CodeConvertController],
      providers: [CodeConvertService],
    }).compile();

    controller = module.get<CodeConvertController>(CodeConvertController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
