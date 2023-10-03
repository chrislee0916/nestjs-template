import { Controller, Get, Post } from '@nestjs/common';
import { CodeConvertService } from './code-convert.service';

@Controller('code-convert')
export class CodeConvertController {
  constructor(private readonly codeConvertService: CodeConvertService) {}

  @Post()
  create() {
    return this.codeConvertService.create();

  }

  @Get()
  findOne() {
    return this.codeConvertService.findOne();
  }

}
