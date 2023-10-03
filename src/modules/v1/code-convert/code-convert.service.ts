import { Injectable, OnModuleInit } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { CodeConvert, CodeConvertDocument, CodeConvertSchema } from './entities/code-convert.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CodeConvertService implements OnModuleInit{
  constructor(
    @InjectModel(CodeConvert.name) private readonly codeConvertModel: Model<CodeConvertDocument>,
    private readonly httpService: HttpService
  ){}

  onModuleInit(){
    // this.create()
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
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
      mainUsage: {},
      materials: {},
      accessoryUsage: {},
      rgAllCode: {}
    })

    // 查詢縣市代碼
    const cityCodes = await this.getCityCode();
    cityCodes.forEach( item => {
      codeConvert.city[item.CODE] = item.NAME
    })

    // 查詢鄉鎮市區代碼
    const townCodes = await this.getTownCode();
    townCodes.forEach( city => {
      city.TOWN.forEach( town => {
        const { UNIT, CODE, NAME } = town;
        codeConvert.town[UNIT] = { code: CODE, name: NAME };
      });
    });

    // 查詢地政事務所代碼
    const unitCodes = await this.getUnitCode();
    unitCodes.forEach( city => {
      city.UNIT.forEach( unit => {
        const { CODE, NAME } = unit;
        codeConvert.unit[CODE] = NAME;
      });
    });

    // 查詢非都市土地使用分區代碼
    const zoneCodes = await this.getZoneCode();
    zoneCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.zone[CODE] = NAME;
    });

    // 查詢非都市土地使用地類別代碼
    const zoneDetailCodes = await this.getZoneDetailCode();
    zoneDetailCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.zoneDetail[CODE] = NAME;
    });


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

    // 權利人類別
    const obligeeTypeCodes = await this.getObligeeTypeCode();
    obligeeTypeCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.obligeeType[CODE] = NAME;
    });

    // 權利範圍類別
    const rightsCodes = await this.getRightsCode();
    rightsCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.rights[CODE] = NAME;
    });

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
    await Promise.all(certificatePromises)

    // 債權權利範圍類別
    const loanRightsRangeCodes = await this.getLoanRightsRangeCode();
    loanRightsRangeCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.loanRightsRange[CODE] = NAME;
    });

    // 權利種類&標的種類
    const rightsAndTypesCodes = await this.getRightsAndTypesCode();
    rightsAndTypesCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.rightsAndTypes[CODE] = NAME;
    });

    // 他項權利檔權利價值類別
    const rightsValueCodes = await this.getRightsValueCode();
    rightsValueCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.rightsValue[CODE] = NAME;
    });

    // 他項權利檔存續期間類別
    const durationCodes = await this.getDuration();
    durationCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.duration[CODE] = NAME;
    });

    // 他項權利檔清償日期類別
    const terminationCodes = await this.getTermination();
    terminationCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.termination[CODE] = NAME;
    });

    // 他項權利檔利息(率)或地租類別&遲延利息(率)類別&違約金類別
    const rtoghCodes = await this.getRTOGH();
    rtoghCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.rtogh[CODE] = NAME;
    });

    // 建物主要用途
    const mainUsageCodes = await this.getMainUsage();
    mainUsageCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.mainUsage[CODE] = NAME;
    });

    // 建物主要建材
    const materialsCodes = await this.getMaterials();
    materialsCodes.forEach( item => {
      const { CODE, NAME } = item;
      codeConvert.materials[CODE] = NAME;
    });

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
    await Promise.all(accessoryUsagePromises)

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


    return codeConvert.save()

  }

  findOne()  {
    return this.codeConvertModel.findOne().exec();
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

  private async getMainUsage(): Promise<Array<any>> {
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
