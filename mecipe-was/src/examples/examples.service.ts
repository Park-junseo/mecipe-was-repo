import { Injectable } from '@nestjs/common';
import { CreateExampleDto } from './dto/create-example.dto';
import { UpdateExampleDto } from './dto/update-example.dto';

@Injectable()
export class ExamplesService {
  create(createExampleDto: CreateExampleDto) {
    return 'This action adds a new example';
  }

  get_test() {
    return {text:`Test Server`};
  }
}
