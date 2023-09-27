import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { DatabaseService } from 'src/database/database.service';
import { InjectModel } from '@nestjs/mongoose';
import { Building } from './entities/building.entity';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BuildingService extends DatabaseService {
  constructor(
    @InjectModel(Building.name)private readonly buildingModel: Model<Building>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ){
    super(buildingModel);
    this.httpService.axiosRef.interceptors.response.use(
      (response) => {
        console.log('成功 :', response.data ? response.data : response);
        return response;
      },
      async (error) => {
        const axiosErr = error as AxiosError;
        const { message, code, response } = axiosErr
        console.log(
          '錯誤 error :',
          response?.data ? response?.data : response,
        );
        return { message, code, response }
      },
    );
  }

  async create(createBuildingDto: CreateBuildingDto): Promise<unknown> {
      // 取得地址
      const address = this.genAddress(createBuildingDto);

      // 打 api 取得 建號
      // const buildNo = await this.getBuildNo(address);

      const buildNo = {
        unit: 'asd',
        sec: 'asd',
        no: 'asdasd'
      }
      // 打其他api 取得資料
      // 實作....

      return this.buildingModel.create({
        properties: createBuildingDto,
        address,
        buildNo: {
          unit: buildNo.unit,
          sec: buildNo.sec,
          no: buildNo.no
        }
      })


  }

  findAll() {
    return `This action returns all building`;
  }

  findOne(id: number) {
    return `This action returns a #${id} building`;
  }

  update(id: number, updateBuildingDto: UpdateBuildingDto) {
    return `This action updates a #${id} building`;
  }

  remove(id: number) {
    return `This action removes a #${id} building`;
  }

  // 取得建號
  private async getBuildNo(address: string): Promise<{ unit: string, sec: string, no: string}> {
    const res = await lastValueFrom(this.httpService.post('https://api.land.moi.gov.tw/cp/api/AddressQueryBuilding/1.0/QueryByAddress', [{
      CITY: 'F',
      ADDRESS: address
    }], {
      headers: {
        Authorization: `Bearer ${this.configService.get('')}`,
      }
    }))
    if(!res.data?.STATUS) {
      throw new HttpException(this.configService.get('ERR_BAD_REQUEST'), HttpStatus.BAD_REQUEST)
    }

    const data = res.data.RESPONSE[0].BLDGREG
    if(!data) throw new HttpException(this.configService.get('ERR_RESOURCE_NOT_FOUND'), HttpStatus.NOT_FOUND)
    const { UNIT, SEC, NO } = data[0];
    return {
      unit: UNIT,
      sec: SEC,
      no: NO
    }
  }

  // 處理地址
  private genAddress(createBuildingDto: CreateBuildingDto): string {
    let {
      city,  // 縣市
      area, // 鄉(市鎮區)
      street , // 街 路
      section , // 段
      lane, // 巷
      lane1, // 之
      alley, // 弄
      alley1 , // 之
      small_alley, // 衖
      district, // 區域
      number , // 號
      number1 , // 之
      number2 , // 之
      floor , // 樓
      ext  // 之
    } = createBuildingDto;

    let res = '';
    // 縣市與區域
    if(city === '嘉義市' || city === '新竹市') {
      area = city
    }
    res += city + area;
    // 只有街(路) 段才有用
    if(street) {
      res += street + (section ? this.convertNum2Chinese(section)+'段' : '');
    }
    // 巷
    res += this.combine('巷', lane, lane1);
    // 弄
    res += this.combine('弄', alley, alley1);
    // 衖
    res += small_alley ? this.convertNum2Full(small_alley) + '衖' : '';
    // 號
    res += district || '' + this.combine('號', number, number1, number2);

    // 樓
    res += floor ? this.convertNum2Chinese(floor) + '樓' : '';
    // 之
    res += ext ? '之' + this.convertNum2Full(ext) : '';

    return res
  }


  private convertNum2Full(n: number|undefined): string{
    if(!n) return ''
    let res = '', str = n.toString();
    for(let i=0; i<str.length; i++) {
      res += String.fromCharCode(str.charCodeAt(i) + 65248);
    }
    return res
  }

  // 0 - 999
  private convertNum2Chinese(n: number|undefined): string {
    if(!n) return ''
    let units = ['', '十', '百'];
    let nums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    let arr: number[] = [];
    let res = '';

    while(Math.floor(n%10)) {
      arr.push(Math.floor(n%10));
      n = Math.floor(n/10);
    }
    for (let i=0; i<arr.length; i++) {
      res = nums[arr[i]] + units[i] + res;
    }
    if(res.slice(0,2) === '一十') return res.slice(1)
    return res
  }


  private combine(unit: string, ...nums: number[]): string {
  let arr: string[] = [];
  for(let i=0; i<nums.length; i++) {
    if(nums[i]) {
      arr.push(this.convertNum2Full(nums[i]))
    }
  }
  return arr.join('之') ? arr.join('之') + unit : ''
  }
}
