import { Test, TestingModule } from '@nestjs/testing';
import { BuildingBasicService } from './building-basic.service';

describe('BuildingBasicService', () => {
  let service: BuildingBasicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BuildingBasicService],
    }).compile();

    service = module.get<BuildingBasicService>(BuildingBasicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
