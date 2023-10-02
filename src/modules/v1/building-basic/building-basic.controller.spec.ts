import { Test, TestingModule } from '@nestjs/testing';
import { BuildingBasicController } from './building-basic.controller';
import { BuildingBasicService } from './building-basic.service';

describe('BuildingBasicController', () => {
  let controller: BuildingBasicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuildingBasicController],
      providers: [BuildingBasicService],
    }).compile();

    controller = module.get<BuildingBasicController>(BuildingBasicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
