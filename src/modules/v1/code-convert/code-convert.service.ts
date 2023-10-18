import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { CodeConvert, CodeConvertDocument, CodeConvertSchema } from './entities/code-convert.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Building, BuildingDocument } from '../building/entities/building.entity';
import { Document } from 'mongoose';
import { ShowDetailBuildingDto } from '../building/dto/show-building.dto';

@Injectable()
export class CodeConvertService implements OnModuleInit{
  constructor(
    @InjectModel(CodeConvert.name) private readonly codeConvertModel: Model<CodeConvertDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly httpService: HttpService
  ){}

  onModuleInit(){

  }

  @Cron(CronExpression.EVERY_WEEK)
  async create() {
    let codeConvert = await this.findOne() || new this.codeConvertModel({
      city: {},
      town: {},
      unit: {},
      zone: {},
      zoneDetail: {},
      receiptNumber: {},
      reason: {},
      obligeeType: {},
      rights: {},
      certificate: {},
      loanRightsRange: {},
      rightsAndTypes: {},
      rightsValue: {},
      duration: {},
      termination: {},
      rtogh: {},
      purpose: {},
      materials: {},
      accessoryUsage: {},
      rgAllCode: {}
    })
    let keys = [];

    // 查詢縣市代碼
    const cityCodes = await this.getCityCode();
    cityCodes.forEach( item => {
      codeConvert.city[item.CODE] = item.NAME
    })
    keys.push('city');

    // 查詢鄉鎮市區代碼
    const townCodes = await this.getTownCode();
    townCodes.forEach( city => {
      city.TOWN.forEach( town => {
        const { UNIT, CODE, NAME } = town;
        codeConvert.town[UNIT] = { code: CODE, name: NAME };
      });
    });
    keys.push('town');

    // 查詢地政事務所代碼
    const unitCodes = await this.getUnitCode();
    unitCodes.forEach( city => {
      city.UNIT.forEach( unit => {
        const { CODE, NAME } = unit;
        codeConvert.unit[CODE] = NAME;
      });
    });
    keys.push('unit');

    // 查詢非都市土地使用分區代碼
    const zoneCodes = await this.getZoneCode();
    zoneCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.zone[CODE] = NAME;
    });
    keys.push('zone');

    // 查詢非都市土地使用地類別代碼
    const zoneDetailCodes = await this.getZoneDetailCode();
    zoneDetailCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.zoneDetail[CODE] = NAME;
    });
    keys.push('zoneDetail');


    // 查詢收件字代碼
    let units = Object.keys(codeConvert.unit);
    const receiptNumberPromises = units.map( async (unit) => {
      const receiptNumberCodes = await this.getReceiptNumberCode(unit);
      const { UNIT, DATA } = receiptNumberCodes[0];
      codeConvert.receiptNumber[UNIT] = {};
      DATA?.forEach( item => {
        const { CODE, NAME } = item;
        codeConvert.receiptNumber[UNIT][CODE] = NAME;
      })
      return Promise.resolve()
    })
    await Promise.all(receiptNumberPromises)
    keys.push('receiptNumber');

    await new Promise(resolve => { setTimeout(() => { resolve('') }, 10000) })

    // 查詢登記原因代碼
    const reasonPromises = units.map( async (unit) => {
      const reasonCodes = await this.getReasonCode(unit);
      const { UNIT, DATA } = reasonCodes[0];
      codeConvert.reason[UNIT] = {};
      DATA?.forEach( item => {
        const { CODE, NAME } = item;
        codeConvert.reason[UNIT][CODE] = NAME;
      })
      return Promise.resolve()
    })
    await Promise.all(reasonPromises)
    keys.push('reason');
    await new Promise(resolve => { setTimeout(() => { resolve('') }, 10000) })

    // 權利人類別
    const obligeeTypeCodes = await this.getObligeeTypeCode();
    obligeeTypeCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.obligeeType[CODE] = NAME;
    });
    keys.push('obligeeType');

    // 權利範圍類別
    const rightsCodes = await this.getRightsCode();
    rightsCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.rights[CODE] = NAME;
    });
    keys.push('rights');


    // 權狀年字號
    const certificatePromises = units.map( async (unit) => {
      const certificateCodes = await this.getCertificateCode(unit);
      const { UNIT, DATA } = certificateCodes[0];
      codeConvert.certificate[UNIT] = {};
      DATA?.forEach( item => {
        const { CODE, NAME } = item;
        codeConvert.certificate[UNIT][CODE] = NAME;
      })
      return Promise.resolve()
    })
    await Promise.all(certificatePromises);
    keys.push('certificate');

    await new Promise(resolve => { setTimeout(() => { resolve('') }, 10000) })



    // 債權權利範圍類別
    const loanRightsRangeCodes = await this.getLoanRightsRangeCode();
    loanRightsRangeCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.loanRightsRange[CODE] = NAME;
    });
    keys.push('loanRightsRange');


    // 權利種類&標的種類
    const rightsAndTypesCodes = await this.getRightsAndTypesCode();
    rightsAndTypesCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.rightsAndTypes[CODE] = NAME;
    });
    keys.push('rightsAndTypes');


    // 他項權利檔權利價值類別
    const rightsValueCodes = await this.getRightsValueCode();
    rightsValueCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.rightsValue[CODE] = NAME;
    });
    keys.push('rightsValue');


    // 他項權利檔存續期間類別
    const durationCodes = await this.getDuration();
    durationCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.duration[CODE] = NAME;
    });
    keys.push('duration');


    // 他項權利檔清償日期類別
    const terminationCodes = await this.getTermination();
    terminationCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.termination[CODE] = NAME;
    });
    keys.push('termination');


    // 他項權利檔利息(率)或地租類別&遲延利息(率)類別&違約金類別
    const rtoghCodes = await this.getRTOGH();
    rtoghCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.rtogh[CODE] = NAME;
    });
    keys.push('rtogh');


    // 建物主要用途
    const purposeCodes = await this.getPurpose();
    purposeCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.purpose[CODE] = NAME;
    });
    keys.push('purpose');


    // 建物主要建材
    const materialsCodes = await this.getMaterials();
    materialsCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.materials[CODE] = NAME;
    });
    keys.push('materials');


    // 建物分層或附屬建物用途
    const accessoryUsagePromises = units.map( async (unit) => {
      const accessoryUsageCodes = await this.getAccessoryUsage(unit);
      const { UNIT, DATA } = accessoryUsageCodes[0];
      codeConvert.accessoryUsage[UNIT] = {};
      DATA?.forEach( item => {
        const { CODE, NAME } = item;
        codeConvert.accessoryUsage[UNIT][CODE] = NAME;
      })
      return Promise.resolve()
    })
    await Promise.all(accessoryUsagePromises);
    keys.push('accessoryUsage');

    await new Promise(resolve => { setTimeout(() => { resolve('') }, 10000) })


    // 其他登記事項代碼
    const rgAllCodePromises = units.map( async (unit) => {
      const rgAllCodeCodes = await this.getRGALLCode(unit);
      const { UNIT, DATA } = rgAllCodeCodes[0];
      codeConvert.rgAllCode[UNIT] = {};
      DATA?.forEach( item => {
        const { CODE, NAME } = item;
        codeConvert.rgAllCode[UNIT][CODE] = NAME;
      })
      return Promise.resolve();
    })
    await Promise.all(rgAllCodePromises)
    keys.push('rgAllCode');
    Logger.log('fetch all code success');

    let res = await codeConvert.save();
    Logger.log('save code-convert success')

    const cachePromises = keys.map(key => this.cacheManager.set(key, res[key] || ''));
    await Promise.all(cachePromises);
    Logger.log('update code-convert success')

    return 'update code-convert success'
  }

  async findOne(){
    return this.codeConvertModel.findOne().exec();
  }

  async convert(item: any){
    const { unit } = item.buildNo;
    // 非都市土地使用分區
    const zoneCode = await this.cacheManager.get('zone');
    // 非都市土地使用地類別
    const zoneDetailCode = await this.cacheManager.get('zoneDetail');
    // 用途 & 建材
    const purposeCode = await this.cacheManager.get('purpose');
    const materialCode = await this.cacheManager.get('materials');
    // 建物分層或附屬建物用途
    let accessoryCode = await this.cacheManager.get('accessoryUsage');
    accessoryCode = accessoryCode[unit];
    // 權利範圍類別
    const rightsCode = await this.cacheManager.get('rights');
    // 登記原因代碼
    let reasonCode = await this.cacheManager.get('reason');
    reasonCode = reasonCode[unit]
    // 權利種類&標的種類
    const rightsAndTypesCode = await this.cacheManager.get('rightsAndTypes');
    // 其他登記事項
    let rgAllCode = await this.cacheManager.get('rgAllCode');
    rgAllCode = rgAllCode[unit];
    if(item.basic) {
      /***** 標示部 *****/
      let { landLabels, buildingLabel } = item.basic.label;
      // 土地
      landLabels.zone = landLabels.zone && zoneCode[landLabels.zone];
      landLabels.zoneDetail = landLabels.zoneDetail && zoneDetailCode[landLabels.zoneDetail];
      landLabels.otherReg = landLabels.otherReg.map(val => ({ ...val, CATEGORY: rgAllCode[val.CATEGORY] }));
      // 建物
      buildingLabel.buildingTotalFloor = accessoryCode[buildingLabel.buildingTotalFloor];
      buildingLabel.floor = accessoryCode[buildingLabel.floor];
      buildingLabel.purpose = purposeCode[buildingLabel.purpose];
      buildingLabel.material = materialCode[buildingLabel.material];
      buildingLabel.otherReg = buildingLabel.otherReg.map(val => ({ ...val, CATEGORY: rgAllCode[val.CATEGORY] }));
      buildingLabel.accessoryBuilding = buildingLabel.accessoryBuilding.map(val => ({ ...val, FPUR_ABPUR: accessoryCode[val.FPUR_ABPUR]}))
      /*****  所有權部 *****/
      let { landOwns, buildingOwns } = item.basic.own;
      // 土地
      landOwns.forEach(val => {
        val.rights = val.rights && rightsCode[val.rights];
        val.reason = val.reason && reasonCode[val.reason];
        val.otherreg = val.otherreg.map(val => ({ ...val, CATEGORY: rgAllCode[val.CATEGORY]}));
      })
      // 建物
      buildingOwns.forEach(val => {
        val.rights = val.rights && rightsCode[val.rights];
        val.reason = val.reason && reasonCode[val.reason];
        val.otherreg = val.otherreg.map(val => ({ ...val, CATEGORY: rgAllCode[val.CATEGORY]}));
      })
      /***** 其他項權利部 *****/
      let { landOthers, buildingOthers } = item.basic.other;
      // 土地
      landOthers.forEach(val => {
        val.rightType = val.rightType && rightsAndTypesCode[val.rightType];
      })
      // 建物
      buildingOthers.forEach(val => {
        val.rightType = val.rightType && rightsAndTypesCode[val.rightType];
      })
    }
    return item
  }


  private async getCityCode(): Promise<Array<any>>{
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryCity'));
    return data.RESPONSE
  }

  private async getTownCode(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryTown', [{}]));
    return data.RESPONSE
  }

  private async getUnitCode(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryUnit', [{}]));
    return data.RESPONSE
  }

  private async getZoneCode(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryZone', [{}]));
    return data.RESPONSE
  }

  private async getZoneDetailCode(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryZoneDetail', [{}]));
    return data.RESPONSE
  }

  private async getReceiptNumberCode(area: string): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryReceiptNumber', [{ UNIT: area }]));
    return data.RESPONSE
  }

  private async getReasonCode(area: string): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryReason', [{ UNIT: area }]));
    return data.RESPONSE
  }

  private async getObligeeTypeCode(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryObligeeType', [{}]));
    return data.RESPONSE
  }

  private async getRightsCode(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryRights', [{}]));
    return data.RESPONSE
  }

  private async getCertificateCode(area: string): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryCertificate', [{ UNIT: area }]));
    return data.RESPONSE
  }

  private async getLoanRightsRangeCode(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryLoanRightsRange', [{}]));
    return data.RESPONSE
  }

  private async getRightsAndTypesCode(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryRightsAndTypes', [{}]));
    return data.RESPONSE
  }

  private async getRightsValueCode(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryRightsValue', [{}]));
    return data.RESPONSE
  }

  private async getDuration(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryDuration', [{}]));
    return data.RESPONSE
  }

  private async getTermination(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryTermination', [{}]));
    return data.RESPONSE
  }

  private async getRTOGH(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryRTOGH', [{}]));
    return data.RESPONSE
  }

  private async getPurpose(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryMainUsage', [{}]));
    return data.RESPONSE
  }

  private async getMaterials(): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryMaterials', [{}]));
    return data.RESPONSE
  }

  private async getAccessoryUsage(area: string): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryAccessoryUsage', [{ UNIT: area }]));
    return data.RESPONSE
  }

  private async getRGALLCode(area: string): Promise<Array<any>> {
    const { data } = await lastValueFrom(this.httpService.post('https://openapi.land.moi.gov.tw/WEBAPI/LandQuery/QueryRGALLCode', [{ UNIT: area }]));
    return data.RESPONSE
  }
}
