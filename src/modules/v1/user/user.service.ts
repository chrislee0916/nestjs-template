import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DatabaseService } from 'src/database/database.service';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './entities/user.entity';
import { Model } from 'mongoose';

@Injectable()
export class UserService extends DatabaseService {
  constructor(@InjectModel(User.name) private DB: Model<User>) {
    super(DB);
  }

  async create({ username }: any): Promise<User> {
    return this.DB.create({
      username,
    });
  }

  async list(options): Promise<User[]> {
    let doc = this.DB.find()
      .where('trashed')
      .equals(false)
      .limit(options.limit)
      .skip(options.skip)
      .sort(options.sort);

    if (options.username) doc = doc.where('username').equals(options.username);

    const data = await doc.exec();
    return data;
  }

  async count(options): Promise<number> {
    let doc = this.DB.count().where('trashed').equals(false);

    if (options.username) doc = doc.where('username').equals(options.username);

    const data = await doc.exec();
    return data;
  }
}
