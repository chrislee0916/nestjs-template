import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { DatabaseResponse } from './dto/database.response';
const configService = new ConfigService();

export interface IDatabase {
  ensureExist(Id: string): Promise<DatabaseResponse>;

  delete(Id: string): Promise<DatabaseResponse>;

  isObjectId(Id: string): boolean;

  verifyId(Id: string, dataId: string): boolean;
}

@Injectable()
export class DatabaseService implements IDatabase {
  DBModel = null;

  constructor(DB: Model<any>) {
    this.DBModel = DB;
  }

  async ensureExist(id: string) {
    if (this.isObjectId(id + '') === false)
      throw new HttpException(
        configService.get('ERR_BAD_REQUEST'),
        HttpStatus.BAD_REQUEST,
      );

    const doc = await this.DBModel.findOne()
      .where('_id')
      .equals(id)
      .where('trashed')
      .equals(false)
      .exec();

    Logger.debug(`結果 : ${!!doc} `, `驗證ＩＤ : ${id}`);

    if (!doc || doc._id.equals(id) === false)
      throw new HttpException(
        configService.get('ERR_RESOURCE_NOT_FOUND'),
        HttpStatus.BAD_REQUEST,
      );

    return doc;
  }

  async delete(id: string) {
    const ret = await this.ensureExist(id);
    let { data } = ret;

    if (data == null) return ret;

    data = data.set('trashed', true);
    return await data.save();
  }

  isObjectId(Id: string) {
    return Types.ObjectId.isValid(Id);
  }

  verifyId(Id: string, dataId: string) {
    return new Types.ObjectId(Id).equals(new Types.ObjectId(dataId));
  }
}
