import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { DatabaseService } from 'src/database/database.service';
import { InjectModel } from '@nestjs/mongoose';
import { Building, BuildingDocument, BuildingSchema } from './entities/building.entity';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { catchError, lastValueFrom, map, tap } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { BuildingBasic } from '../building-basic/entities/building-basic.entity';
import { BuildingBasicService } from '../building-basic/building-basic.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CreateBuildingBasicDto } from '../building-basic/dto/create-building-basic.dto';

@Injectable()
export class BuildingService extends DatabaseService {
  constructor(
    @InjectModel(Building.name) private readonly buildingModel: Model<BuildingDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly buildingBasicService: BuildingBasicService,
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
        console.log(
          '錯誤 error :',
          axiosErr.response?.data ? axiosErr.response?.data : axiosErr.response,
        );
        throw new HttpException(axiosErr.message || axiosErr.code || this.configService.get('ERR_BAD_REQUEST'), axiosErr.response.status || 400)
      }
    );
  }

  async create(createBuildingDto: CreateBuildingDto): Promise<unknown> {
    // 取得地址
    const address = this.genAddress(createBuildingDto);
    // 查詢現有 db 有無資料
    const existItem = await this.softFindOne({ address });
    if(existItem) {
      return existItem
    }

    // 打 api 取得大範圍建號資料
    const { code, city, area } = createBuildingDto;
    const noExplicitAddress = this.genAddress(createBuildingDto, false);
    const buildNos = await this.getBuildNo(code, noExplicitAddress);

    if(!buildNos) {
      throw new HttpException(this.configService.get('ERR_RESOURCE_NOT_FOUND'), HttpStatus.NOT_FOUND);
    }

    // 取到的大範圍資料存到資料庫
    let buildings = [] // bulkWrite 需要的條件
    let buildNoArr = [] // find 需要的條件
    let desiredOneBuildingNo = null // 如果有與需求地址符合直接回傳
    for(let i=0; i<buildNos.length; i++) {
      const { UNIT, SEC, NO, BNUMBER } = buildNos[i];
      const item = {
        address: city + area + BNUMBER.slice(BNUMBER.indexOf('鄰')+1), // 沒有村里, 鄰
        buildNo: {
          unit: UNIT,
          sec: SEC,
          no: NO,
        }
      };
      if(item.address === address) desiredOneBuildingNo = item.buildNo;
      buildNoArr.push(item.buildNo);
      buildings.push(item);
    }
    const operations = buildings.map( val => {
      const { address, buildNo } = val;
      return {
        updateOne: {
          filter: { buildNo },
          update: { $set: { buildNo, address }},
          upsert: true,
        }
      }
    })
    await this.buildingModel.bulkWrite(operations);
    if(desiredOneBuildingNo) {
      return this.softFindOne({ buildNo: desiredOneBuildingNo });
    }
    return this.softFind({ buildNo: { $in: buildNoArr }});
  }

  async findOne(id: string): Promise<unknown> {
    const existItem: BuildingDocument = await this.ensureExist(id);
    const { buildNo:{unit, sec, no} } = existItem;

    const basic = await this.createBasic({UNIT: unit, SEC: sec, NO: no});


    // this.buildingBasicService.create(basic)
    return basic
  }


  private async createBasic(buildNo: { UNIT: string, SEC: string, NO: string })/*: Promise<CreateBuildingBasicDto> */{
    // 標示部
    // API04 需先打API04取得地號
    const buildingLabel = await this.getBuildingLabel(buildNo);

    // 可能有多個地號
    const landNos = buildingLabel.landNos.map( item => ({ ...buildNo, NO: item.LANDNO }));
    // API01 土地標示部
    let landLabelPromises = landNos.map(landNo => this.getLandLabel(landNo));
    let landLabel = await Promise.all(landLabelPromises);


    // return {
    //   label: {
    //     landLabel,
    //     buildingLabel
    //   }
    // }

    // // 所有權部
    // // API02
    // const landOwn = await this.getLandOwn(landNo)
    // // API05
    const buildingOwn = await this.getBuildingOwn(buildNo)

    return buildingOwn;

    // // 其他權利部
    // // API03
    // const landOther = await this.getLandOther(landNo);
    // // API06
    // const buildingOther = await this.getBuildingOther(buildNo);
    // return {
    //   label: {
    //     land: {
    //       // 土地資訊
    //       no: landNo.NO, // 多筆資料，怎麼處理？
    //       zoning: landLabel.LANDREG.ZONING,
    //       lClass: landLabel.LANDREG.LCLASS,
    //       alValue: landLabel.LANDREG.ALVALUE,
    //       alPrice: landLabel.LANDREG.ALPRICE,
    //       otherReg: landLabel.LANDREG.OTHERREG,//.CONTENT => code:CATEGORY 多筆資料，只需要 CONTENT？
    //       area: landLabel.LANDREG.AREA, // 0.3025
    //     },
    //     building: {
    //       // 建物資料
    //       no: buildNo.NO,
    //       completeDate: buildingLabel.BLDGREG.COMPLETEDATE,
    //       buildingFloor: buildingLabel.BLDGREG.BUILDINGFLOOR,
    //       floorAcc: buildingLabel.FLOORACC, //.FPUR_ABPUR => code:FPUR_ABPUR 只需抓建物分層？
    //       purpose: buildingLabel.BLDGREG.PURPOSE, // code
    //       material: buildingLabel.BLDGREG.MATERIAL, // code
    //       otherReg: buildingLabel.BLDGREG.OTHERREG, //.CONTENT => code: CATEGORY 多筆資料，只需要 CONTENT？
    //       //建物面積資訊
    //       area: buildingLabel.BLDGREG.AREA, // 0.3025
    //       // 附屬建物合計面積: floorAcc: buildingLabel.FLOORACC[0].FAREA_ABAREA 加總附屬面積就好 還是需要個別顯示

    //       sharedArea: buildingLabel.SHAREDAREA, // 沒有SHAREDPARK  面積 AREA * NUMERATOR / DENOMINATOR

    //       sharePark: buildingLabel.SHAREDAREA[0].SHAREDPARK[0]// 有SHAREDPARK AREA * PSNUMERATOR / PSDENOMINATOR 就好？ 會是 array 要怎麼呈現？加總？
    //       // 建物合計總面積 ？
    //       //area+sharedArea+sharePark
    //     }
    //   },
    /*   own: {
    //     land: {
    //       // 土地持分資訊 ? 還沒確定？

    //       // 土地所有權登記資訊
    //       rDate: landOwn[0].LANDOWNERSHIP[0].RDATE, // 呈現格式？
    //       reason: landOwn[0].LANDOWNERSHIP[0].REASON, // 呈現格式？ code
    //       dlPrice: landOwn[0].LANDOWNERSHIP[0].DLPRICE, // 呈現格式？
    //       ltValue: landOwn[0].LANDOWNERSHIP[0].LTPRICE[0].LTVALUE, // 呈現格式？
    //       // 他項權利登記次序: 可以跟下面合併？
    //       otherReg: landOwn[0].LANDOWNERSHIP[0].OTHERREG,
    //     },
    //     building: {
    //       // 建物持分資訊: 格式要怎麼呈現？
    //       // 全部 : buildingOwn[0].BLDGOWNERSHIP[0] 的 NUMERATOR / DENOMINATOR
    //       // 共有 : buildingLabel.SHAREDAREA[0] 的 NUMERATOR / DENOMINATOR
    //       // 其他 : buildingLabel.BLDGREG.OTHERREG
    //       // 建物持分比例？

    //       // 建物所有權登記資訊
    //       rDate: buildingOwn[0].BLDGOWNERSHIP[0].RDATE, // 呈現格式？
    //       reason: buildingOwn[0].BLDGOWNERSHIP[0].REASON, // 呈現格式？ code
    //       // 他項權利登記次序: 可以跟下面合併？
    //       otherReg: buildingOwn[0].BLDGOWNERSHIP[0].OTHERREG, // 呈現格式？

    //     }
    //   },
    //   other: {
    //     land: {
    //       //設定權利人 在哪？
    //       owner: '',
    //       rightType: landOther[0].LANDOWNERSHIP
    //     },
    //     building: {
    //       //設定權利人 在哪？
    //       owner: '',
    //       rightType: buildingOther[0].OTHERRIGHTS[0].RIGHTTYPE, // code
    //       rNo: buildingOther[0].RNO,
    //       rDate: buildingOther[0].OTHERRIGHTS[0].RDATE,
    //       ccpRv: buildingOther[0].OTHERRIGHTS[0].OTHERRIGHTFILE.CCP_RV

    //     }
    //   }
    // }

    // buildingOther[0].OTHERRIGHTS[0].OWNER
    // API02

     return landLabel*/
  }
  // ========== 土地＆建物 標示部 ==========
  private async getLandLabel(landNo: { UNIT: string, SEC: string, NO: string}) {
    let data = {
      "UNIT": "AC",
      "SEC": "0424",
      "NO": "03160000",
      "LANDREG": {
          "RDATE": "1051128",
          "REASON": "11",
          "AREA": "247.00",
          "ZONING": null,
          "LCLASS": null,
          "ALVALUE": "457000",
          "ALPRICE": "116000",
          "COUNTY": "A",
          "DISTRICT": "10",
          "Y_COORDINATE": "2772053.031",
          "X_COORDINATE": "304407.034",
          "MAPSHEET": "15",
          "BUILDINGCOUNT": "25",
          "OTHERREG": [
              {
                  "NUMBER": "010",
                  "CATEGORY": "GK",
                  "CONTENT": "朱厝崙段９２—３８地號"
              },
              {
                  "NUMBER": "020",
                  "CATEGORY": "G2",
                  "CONTENT": "０３１７－００１２、０３１７－００２０地號"
              },
              {
                  "NUMBER": "030",
                  "CATEGORY": "88",
                  "CONTENT": "長春段二小段４１７５建號等之建築基地地號：長春段二小段３１６地號  "
              }
          ]
      }
    }

    const { NO, UNIT, LANDREG } = data;
    const { ZONING, LCLASS, ALVALUE, ALPRICE, OTHERREG, AREA } = LANDREG;

    // 非都市土地使用分區
    let zoneCode = await this.cacheManager.get('zone');
    let zone = ZONING && zoneCode[ZONING];

    // 非都市土地使用地類別
    let zoneDetailCode = await this.cacheManager.get('zoneDetail');
    let zoneDetail = LCLASS && zoneDetailCode[LCLASS]

    // 公告地現值 換成 每坪
    let alValue = Math.round(+ALVALUE / 0.3025 * 100) / 100;
    // 公告地價 換成 每坪
    let alPrice = Math.round(+ALPRICE / 0.3025 * 100) / 100;

    // 其他登記事項
    let rgAllCode = await this.cacheManager.get('rgAllCode');
    rgAllCode = rgAllCode[UNIT];
    const otherReg = OTHERREG.map( val => ({ ...val, CATEGORY: rgAllCode[val.CATEGORY] }));

    // 土地總面積
    let totalArea = this.convertSqft(+AREA)

    // 土地資訊
    return {
      no: NO,
      zone: zone,
      zoneDetail: zoneDetail,
      alValue: alValue,
      alPrice: alPrice,
      otherReg: otherReg,
      totalArea: totalArea
    }
  }
  private async getBuildingLabel(buildNo: { UNIT: string, SEC: string, NO: string }) {
    // const labelRes = await lastValueFrom(this.httpService.post('https://api.land.moi.gov.tw/cp/api/LandDescription/1.0/QueryByLandNo', buildNo))
    // if(!labelRes.data?.STATUS) {
    //   throw new HttpException(this.configService.get('ERR_BAD_REQUEST'), HttpStatus.BAD_REQUEST);
    // }
    // const data = labelRes.data.RESPONSE[0];
    let data = {
      "UNIT": "AC",
      "SEC": "0424",
      "NO": "04195000",
      "BLDGREG": {
          "TOWN": "10",
          "RECEIVEYEAR": "107", //收件年期
          "RECEIVENO1": "AC10", //收件字
          "RECEIVENO2": "123760", //收件號
          "RDATE": "1070710", //登記日期
          "REASON": "02", //登記原因(※代碼06)
          "AREA": "20.72", //建物總面積
          "BNUMBER": "合江街３９號十樓", //建物門牌
          "PURPOSE": "A", //主要用途
          "MATERIAL": "04", //主要建材
          "BUILDINGFLOOR": "011", //建物層數
          "COMPLETEDATE": "1070514", //建築完成日期
          "LANDNO": [ //建築坐落地號
              {
                  "SUBSECTION": "0424", //基地段小段
                  "LANDNO": "03160000" //基地地號
              }
          ],
          "OTHERREG": [ //主建物其他登記事項
              {
                  "NUMBER": "010", //其他登記事項序號
                  "CATEGORY": "D4", //其他登記事項代碼(※代碼30)
                  "CONTENT": "１０７使字第０１００號" //其他登記事項內容
              },
              {
                  "NUMBER": "020",
                  "CATEGORY": "88",
                  "CONTENT": "建築基地地號：長春段二小段３１６地號"
              },
              {
                  "NUMBER": "030",
                  "CATEGORY": "DC",
                  "CONTENT": "長春段二小段３１６地號（所有權）１０００００分之４２６３"
              },
              {
                  "NUMBER": "050",
                  "CATEGORY": "00",
                  "CONTENT": "嗣後建築物所有權人於因買賣、交換、贈與、信託辦理所有權移轉登記時，得檢附開業建築師出具三個月內有效之建築物無違章建築證明。"
              },
              {
                  "NUMBER": "060",
                  "CATEGORY": "01",
                  "CONTENT": null
              }
          ]
      },
      "FLOORACC": [ //建物分層或附屬建物
          {
              "FID_ABID": "建物分層", //分層或附屬建物識別
              "FPUR_ABPUR": "010", //層次或附屬建物用途
              "FAREA_ABAREA": "20.72" //層次或附屬建物面積
          },
          {
              "FID_ABID": "附屬建物",
              "FPUR_ABPUR": "A01",
              "FAREA_ABAREA": "2.63"
          },
          {
              "FID_ABID": "附屬建物",
              "FPUR_ABPUR": "A15",
              "FAREA_ABAREA": "13.75"
          }
      ],
      "SHAREDAREA": [ //共有部分
          {
              "SSUBSECTION": "0424", //共有部分段小段
              "SBNO": "04199000", //共有部分建號
              "DENOMINATOR": "18", //權利範圍分母
              "NUMERATOR": "1", //權利範圍分子
              "AREA": "388.00", //共有部分面積
              "SHAREDPARK": [ //共有部分停車位
                  {
                      "PSNO": "地下二層１３號", //車位編號
                      "PSDENOMINATOR": "18", //車位權利範圍分母
                      "PSNUMERATOR": "1" //車位權利範圍分子
                  }
              ],
              "OTHERREG": [ //共有部分其他登記事項
                  {
                      "NUMBER": "010", //其他登記事項序號
                      "CATEGORY": "D4", //其他登記事項代碼(※代碼30)
                      "CONTENT": "１０７使字第０１００號" //其他登記事項內容
                  },
                  {
                      "NUMBER": "020",
                      "CATEGORY": "88",
                      "CONTENT": "建築基地地號：長春段二小段３１６地號"
                  },
                  {
                      "NUMBER": "030",
                      "CATEGORY": "11",
                      "CONTENT": "本共有部分之項目有全自動棋盤式汽車昇降設備、全自動停車設備空間等２項。"
                  },
                  {
                      "NUMBER": "040",
                      "CATEGORY": "DA",
                      "CONTENT": "１８位"
                  },
                  {
                      "NUMBER": "050",
                      "CATEGORY": "DC",
                      "CONTENT": "車位編號地下三層１至１２號、地下二層１３至１８號，長春段二小段３１６地號（所有權）每一車位持分各１０００００之１０"
                  },
                  {
                      "NUMBER": "060",
                      "CATEGORY": "01",
                      "CONTENT": null
                  }
              ]
          },
          {
              "SSUBSECTION": "0424",
              "SBNO": "04197000",
              "DENOMINATOR": "100000",
              "NUMERATOR": "4271",
              "AREA": "709.69",
              "SHAREDPARK": null,
              "OTHERREG": [
                  {
                      "NUMBER": "010",
                      "CATEGORY": "D4",
                      "CONTENT": "１０７使字第０１００號"
                  },
                  {
                      "NUMBER": "020",
                      "CATEGORY": "88",
                      "CONTENT": "建築基地地號：長春段二小段３１６地號"
                  },
                  {
                      "NUMBER": "030",
                      "CATEGORY": "11",
                      "CONTENT": "本共有部分之項目有梯廳、安全梯、行動不便電梯、公共服務空間入口大廳、雨遮、機房、電梯機房、水箱、消防水箱、台電配電場所、防空避難室、消防泵浦室、電信機房、進風管道間、排風管道間、廁所、昇降機道、緊急發電機室等１８項。"
                  },
                  {
                      "NUMBER": "040",
                      "CATEGORY": "01",
                      "CONTENT": null
                  }
              ]
          }
      ]
    }
    const { NO, UNIT, BLDGREG, FLOORACC, SHAREDAREA } = data;

    // 主建物樓層
    const floor = FLOORACC.find(val => val.FID_ABID === '建物分層')?.FPUR_ABPUR;

    // 用途 & 建材
    const purposeCode = await this.cacheManager.get('purpose');
    const materialCode = await this.cacheManager.get('materials');
    const purpose = purposeCode[BLDGREG.PURPOSE];
    const material = materialCode[BLDGREG.MATERIAL];

    // 其他登記事項
    let rgAllCode = await this.cacheManager.get('rgAllCode');
    rgAllCode = rgAllCode[UNIT];
    const otherReg = BLDGREG.OTHERREG.map( val => ({ ...val, CATEGORY: rgAllCode[val.CATEGORY] }));

    /* ============ 建物面積資訊 ============ */
    // 建物總面積
    let totalArea = 0;
    // 主建物面積
    const area = this.convertSqft(+BLDGREG.AREA);
    totalArea += +BLDGREG.AREA;

    // 附屬建物總面積 & 各面積
    let accessoryCode = await this.cacheManager.get('accessoryUsage');
    accessoryCode = accessoryCode[UNIT];
    const accessoryBuilding = [];
    let accessoryTotalArea = 0;
    for(let i=0; i< FLOORACC.length; i++) {
      if(FLOORACC[i].FID_ABID === '附屬建物') {
        let { FAREA_ABAREA, FPUR_ABPUR } = FLOORACC[i];
        totalArea += +FAREA_ABAREA;
        accessoryTotalArea += this.convertSqft(+FAREA_ABAREA);
        accessoryBuilding.push({
          FPUR_ABPUR: accessoryCode[FPUR_ABPUR],
          FAREA_ABAREA: this.convertSqft(+FAREA_ABAREA)
        })
      }
    }

    // 公設面積 & 車位面積
    let sharedArea = 0, shareParkArea = 0;
    for(let i=0; i<SHAREDAREA.length; i++) {
      let item = SHAREDAREA[i];
      if(!item.SHAREDPARK && item.AREA) {
        sharedArea += (+item.AREA) * (+item.NUMERATOR / +item.DENOMINATOR);

      } else if(item.SHAREDPARK && item.AREA) {
        item.SHAREDPARK.forEach(val => {
          shareParkArea += +item.AREA * (+val.PSNUMERATOR / +val.PSDENOMINATOR);
        })
      }
    }
    totalArea += sharedArea + shareParkArea;
    sharedArea = this.convertSqft(sharedArea);
    shareParkArea = this.convertSqft(shareParkArea);

    // 建物總面積
    totalArea = this.convertSqft(totalArea)
    return {
      // 建物資料
      no: NO, // 主建物建號
      landNos: BLDGREG.LANDNO, // 地號
      completeDate: BLDGREG.COMPLETEDATE, // 建築完成日期
      buildingTotalFloor: BLDGREG.BUILDINGFLOOR, // 建築總樓層
      floor: floor, // 物件樓層
      purpose: purpose, // 建物用途: 代碼
      material: material, // 建物結構: 代碼
      otherReg: otherReg, // 其他登記事項內容, 代碼
      // 建物面積資訊
      area: area,
      accessoryTotalArea: accessoryTotalArea,// 附屬建物合計面積
      accessoryBuilding: accessoryBuilding, // 各附屬建物面積
      sharedArea: sharedArea, //公設合計面積
      shareParkArea: shareParkArea, // 車位合計面積
      totalArea: totalArea // 建物總面積
    }
  }

  // 取最新的就好
  // ========== 土地＆建物 所有權部 ==========
  private async getLandOwn(landNo: { UNIT: string, SEC: string, NO: string}) {
    let data = [
      {
          "UNIT": "AC",
          "SEC": "0424",
          "NO": "03160000",
          "OFFSET": "1",
          "LIMIT": "2",
          "RNO": "0030",
          "LANDOWNERSHIP": [
              {
                  "OWRNO": "0030",
                  "OCDATE": "110",
                  "OCNO1": "ACAA",
                  "OCNO2": "038700",
                  "RDATE": "1101124",
                  "REASON": "64",
                  "REASONDATE": "1101110",
                  "RIGHT": null,
                  "DENOMINATOR": "100000",
                  "NUMERATOR": "4901",
                  "DLPRICE": "92800.0",
                  "OWNER": {
                      "LTYPE": null,
                      "LID": null,
                      "LNAME": null,
                      "LADDR": null
                  },
                  "LTPRICE": [
                      {
                          "LTDATE": "11011",
                          "LTVALUE": "418000.0",
                          "PORIGHT": null,
                          "PODENOMINATOR": "100000",
                          "PONUMERATOR": "4901"
                      }
                  ],
                  "OTHERREG": [
                      {
                          "NUMBER": "020",
                          "CATEGORY": "99",
                          "CONTENT": "１１１年４月２２日中山字第０５５３１０號，依財政部北區國稅局北區國稅三重服字第１１１３４０４７８７Ａ號函辦理禁止處分登記，納稅義務人：李鴻智即兆星裝潢工程行，限制範圍：１０００００分之４９０１，１１１年４月２２日登記。"
                      },
                      {
                          "NUMBER": "040",
                          "CATEGORY": "99",
                          "CONTENT": "１１１年９月２７日中山字第１３０６５０號，依臺灣臺北地方法院民事執行處１１１年９月２７日北院忠１１１司執甲字第１０１００６號函辦理查封登記，債權人：苗芳瑛，債務人：李泳志（原名：李鴻智），限制範圍：１０００００分之４９０１，１１１年９月２７日登記。"
                      }
                  ],
                  "OTHERRIGHTS": [
                      {
                          "ORNO": "0052000"
                      },
                      {
                          "ORNO": "0059000"
                      }
                  ]
              }
          ]
      },
      {
          "UNIT": "AC",
          "SEC": "0424",
          "NO": "03160000",
          "OFFSET": "1",
          "LIMIT": "2",
          "RNO": "0031",
          "LANDOWNERSHIP": [
              {
                  "OWRNO": "0031",
                  "OCDATE": "110",
                  "OCNO1": "ACAA",
                  "OCNO2": "038720",
                  "RDATE": "1101124",
                  "REASON": "64",
                  "REASONDATE": "1101110",
                  "RIGHT": null,
                  "DENOMINATOR": "100000",
                  "NUMERATOR": "4635",
                  "DLPRICE": "92800.0",
                  "OWNER": {
                      "LTYPE": null,
                      "LID": null,
                      "LNAME": null,
                      "LADDR": null
                  },
                  "LTPRICE": [
                      {
                          "LTDATE": "11011",
                          "LTVALUE": "418000.0",
                          "PORIGHT": null,
                          "PODENOMINATOR": "100000",
                          "PONUMERATOR": "4635"
                      }
                  ],
                  "OTHERREG": [],
                  "OTHERRIGHTS": [
                      {
                          "ORNO": "0053000"
                      },
                      {
                          "ORNO": "0076000"
                      }
                  ]
              }
          ]
      }
    ]
    return data
  }
  private async getBuildingOwn(buildNo: { UNIT: string, SEC: string, NO: string }) {
    let data = [
      {
          "UNIT": "AC",
          "SEC": "0424",
          "NO": "04195000",
          "OFFSET": "1",
          "LIMIT": "10",
          "RNO": "0009", //所有權登記次序，字元長度為4
          "BLDGOWNERSHIP": [ //建物所有權部
              {
                  "OWRNO": "0009", //所有權登記次序
                  "RECEIVEYEAR": "111", //收件年期
                  "RECEIVENO1": "ACAA", //收件字
                  "RECEIVENO2": "007810", //收件號
                  "RDATE": "1110317", //登記日期
                  "REASON": "64", //登記原因(※代碼06)
                  "REASONDATE": "1110303", //登記原因發生日期
                  "RIGHT": "A", //權利範圍類別(※代碼15)
                  "DENOMINATOR": "1", //權利範圍分母
                  "NUMERATOR": "1", // 權利範圍分子
                  "OWNER": { //權利人(若為自然人則不顯示)
                      "LTYPE": null, //類別(※代碼09)
                      "LID": null, //統一編號
                      "LNAME": null, //姓名
                      "LADDR": null //地址
                  },
                  // OWRCERTNO
                  "OTHERREG": [], //其他登記事項
                  "OTHERRIGHTS": [ //相關他項權利部
                      {
                          "ORNO": "0005000" //他項權利登記次序
                      },
                      {
                          "ORNO": "0007000"
                      },
                      {
                          "ORNO": "0006000"
                      }
                  ]
              }
          ]
      }
    ]
    return data
  }
  // ========== 土地＆建物 他項權利部 ==========
  private async getLandOther(landNo: { UNIT: string, SEC: string, NO: string}) {
    let data = [
      {
          "UNIT": "AC",
          "SEC": "0424",
          "NO": "03160000",
          "OFFSET": "1",
          "LIMIT": "2",
          "RNO": "0030",
          "LANDOWNERSHIP": [
              {
                  "OWRNO": "0030",
                  "OCDATE": "110",
                  "OCNO1": "ACAA",
                  "OCNO2": "038700",
                  "RDATE": "1101124",
                  "REASON": "64",
                  "REASONDATE": "1101110",
                  "RIGHT": null,
                  "DENOMINATOR": "100000",
                  "NUMERATOR": "4901",
                  "DLPRICE": "92800.0",
                  "OWNER": {
                      "LTYPE": null,
                      "LID": null,
                      "LNAME": null,
                      "LADDR": null
                  },
                  "LTPRICE": [
                      {
                          "LTDATE": "11011",
                          "LTVALUE": "418000.0",
                          "PORIGHT": null,
                          "PODENOMINATOR": "100000",
                          "PONUMERATOR": "4901"
                      }
                  ],
                  "OTHERREG": [
                      {
                          "NUMBER": "020",
                          "CATEGORY": "99",
                          "CONTENT": "１１１年４月２２日中山字第０５５３１０號，依財政部北區國稅局北區國稅三重服字第１１１３４０４７８７Ａ號函辦理禁止處分登記，納稅義務人：李鴻智即兆星裝潢工程行，限制範圍：１０００００分之４９０１，１１１年４月２２日登記。"
                      },
                      {
                          "NUMBER": "040",
                          "CATEGORY": "99",
                          "CONTENT": "１１１年９月２７日中山字第１３０６５０號，依臺灣臺北地方法院民事執行處１１１年９月２７日北院忠１１１司執甲字第１０１００６號函辦理查封登記，債權人：苗芳瑛，債務人：李泳志（原名：李鴻智），限制範圍：１０００００分之４９０１，１１１年９月２７日登記。"
                      }
                  ],
                  "OTHERRIGHTS": [
                      {
                          "ORNO": "0052000"
                      },
                      {
                          "ORNO": "0059000"
                      }
                  ]
              }
          ]
      },
      {
          "UNIT": "AC",
          "SEC": "0424",
          "NO": "03160000",
          "OFFSET": "1",
          "LIMIT": "2",
          "RNO": "0031",
          "LANDOWNERSHIP": [
              {
                  "OWRNO": "0031",
                  "OCDATE": "110",
                  "OCNO1": "ACAA",
                  "OCNO2": "038720",
                  "RDATE": "1101124",
                  "REASON": "64",
                  "REASONDATE": "1101110",
                  "RIGHT": null,
                  "DENOMINATOR": "100000",
                  "NUMERATOR": "4635",
                  "DLPRICE": "92800.0",
                  "OWNER": {
                      "LTYPE": null,
                      "LID": null,
                      "LNAME": null,
                      "LADDR": null
                  },
                  "LTPRICE": [
                      {
                          "LTDATE": "11011",
                          "LTVALUE": "418000.0",
                          "PORIGHT": null,
                          "PODENOMINATOR": "100000",
                          "PONUMERATOR": "4635"
                      }
                  ],
                  "OTHERREG": [],
                  "OTHERRIGHTS": [
                      {
                          "ORNO": "0053000"
                      },
                      {
                          "ORNO": "0076000"
                      }
                  ]
              }
          ]
      }
    ]
    return data
  }
  private async getBuildingOther(buildNo: { UNIT: string, SEC: string, NO: string }) {
    let data = [
      {
          "UNIT": "AC",
          "SEC": "0424",
          "NO": "04195000",
          "OFFSET": "1",
          "LIMIT": "10",
          "RNO": "0009", // 所有權登記次序，字元長度為4
          "OTHERRIGHTS": [
              {
                  "ORNO": "0005000", //他項權利登記次序
                  "RECEIVEYEAR": "112", //收件年期
                  "RECEIVENO1": "ACAF", //收件字
                  "RECEIVENO2": "004150", //收件號
                  "RDATE": "1120214", //登記日期
                  "REASON": "83", //登記原因(※代碼06)
                  "SETRIGHT": "A", // 設定權利範圍類別(※代碼15)
                  "SRDENOMINATOR": "1", //設定權利範圍持分分母
                  "SRNUMERATOR": "1", //設定權利範圍持分分子
                  "AREA": null, //設定權利範圍面積
                  "CERTIFICATENO": "1127001283", //證明書字號
                  "CLAIMRIGHT": "A", //債權權利範圍類別(※代碼18)
                  "CRDENOMINATOR": "1", //債權權利範圍持分分母
                  "CRNUMERATOR": "1", //債權權利範圍持分分子
                  "RIGHTTYPE": "N", //權利種類(※代碼27)
                  "SUBJECTTYPE": "A", //標的種類(※代碼18)
                  "OTFNO": null,
                  "BLDGOWNERSHIP": [ //標的登記次序
                      {
                          "OWRNO": "0009" //所有權登記次序
                      }
                  ],
                  "OWNER": {
                      "LTYPE": null, //類別(※代碼09)
                      "LID": null, //統一編號
                      "LNAME": null, //姓名
                      "LADDR": null //地址
                  },
                  "JOINTGUARANTY": { // ...文件沒這欄位, 會是 共同擔保?
                      "LAND": [ //共同擔保地號
                          {
                              "SEC": "0424", //共同擔保地號-段
                              "NO": "03160000" //共同擔保地號
                          }
                      ],
                      "BUILDING": [ //共同擔保建號
                          {
                              "SEC": "0424", //共同擔保建號-段
                              "NO": "04195000" //共同擔保建號
                          }
                      ]
                  },
                  "OTHERRIGHTFILE": { //他項權利檔
                      "OTFNO": "112ACAF004150", //他項權利檔號
                      "CCPT_RVT": "N", //擔保債權總金額/權利價值類別(※代碼17)
                      "CCP_RV": "21000000", //擔保債權總金額/權利價值
                      "DURATIONTYPE": null, //存續期間類別(※代碼19)
                      "STARTDATE": null, //起始日期
                      "ENDDATE": null, //終止日期
                      "PODT": "Z", //清償日期類別(※代碼20)
                      "PODD": "依照各個債務契約所約定之清償日期。", //清償日期說明
                      "ITYPE_LRTYPE": "Q", //利息(率)或地租類別(※代碼21)
                      "ID_LRD": "依照各個債務契約所約定之利率計算。", //利息(率)或地租說明
                      "DITYPE": "Q", //遲延利息(率)類別(※代碼21)
                      "DID": "依照各個債務契約所約定之利率計算。", //遲延利息(率)說明
                      "PTYPE": "Q", //違約金類別
                      "PD": "依照各個債務契約所約定之違約金計收標準計算。", //違約金說明
                      "CCTYPE": "Q", //擔保債權種類及範圍類別(※代碼33)
                      "CCCONTENT": "包括債務人對抵押權人現在（包括過去所負現在尚未清償）及將來所負之借款、墊款、透支、貼現、消費借貸債務、侵權行為損害賠償、不當得利返還請求權。", //擔保債權種類及範圍內容
                      "CCSDT": "Q", //擔保債權確定期日類別(※代碼34)
                      "CCSDD": "民國１４２年２月１２日。", //擔保債權確定期日內容
                      "OGSAT": "Q", //其他擔保範圍約定類別(※代碼35)
                      "OGSAC": "行使擔保債權之訴訟及非訴訟費用、因債務不履行而生之損害賠償、抵押權人所墊付抵押物之保險費。" //其他擔保範圍約定內容
                  },
                  "OTHERREG": []
              },
              {
                  "ORNO": "0006000",
                  "RECEIVEYEAR": "112",
                  "RECEIVENO1": "ACAF",
                  "RECEIVENO2": "004160",
                  "RDATE": "1120214",
                  "REASON": "83",
                  "SETRIGHT": "A",
                  "SRDENOMINATOR": "1",
                  "SRNUMERATOR": "1",
                  "AREA": null,
                  "CERTIFICATENO": "1127001284",
                  "CLAIMRIGHT": "A",
                  "CRDENOMINATOR": "1",
                  "CRNUMERATOR": "1",
                  "RIGHTTYPE": "N",
                  "SUBJECTTYPE": "A",
                  "OTFNO": null,
                  "BLDGOWNERSHIP": [
                      {
                          "OWRNO": "0009"
                      }
                  ],
                  "OWNER": {
                      "LTYPE": null,
                      "LID": null,
                      "LNAME": null,
                      "LADDR": null
                  },
                  "JOINTGUARANTY": {
                      "LAND": [
                          {
                              "SEC": "0424",
                              "NO": "03160000"
                          }
                      ],
                      "BUILDING": [
                          {
                              "SEC": "0424",
                              "NO": "04195000"
                          }
                      ]
                  },
                  "OTHERRIGHTFILE": {
                      "OTFNO": "112ACAF004160",
                      "CCPT_RVT": "N",
                      "CCP_RV": "680000",
                      "DURATIONTYPE": null,
                      "STARTDATE": null,
                      "ENDDATE": null,
                      "PODT": "Z",
                      "PODD": "依照各個債務契約所約定之清償日期。",
                      "ITYPE_LRTYPE": "Q",
                      "ID_LRD": "依照各個債務契約所約定之利率計算。",
                      "DITYPE": "Q",
                      "DID": "依照各個債務契約所約定之利率計算。",
                      "PTYPE": "Q",
                      "PD": "依照各個債務契約所約定之違約金計收標準計算。",
                      "CCTYPE": "Q",
                      "CCCONTENT": "包括債務人對抵押權人現在（包括過去所負現在尚未清償）及將來所負之借款、墊款、透支、貼現、消費借貸債務、票據、信用卡消費款、侵權行為損害賠償、不當得利返還請求權。",
                      "CCSDT": "Q",
                      "CCSDD": "民國１４２年２月１２日。",
                      "OGSAT": "Q",
                      "OGSAC": "行使擔保債權之訴訟及非訴訟費用、因債務不履行而生之損害賠償、抵押權人所墊付抵押物之保險費。"
                  },
                  "OTHERREG": []
              },
              {
                  "ORNO": "0007000",
                  "RECEIVEYEAR": "112",
                  "RECEIVENO1": "ACAF",
                  "RECEIVENO2": "028760",
                  "RDATE": "1120901",
                  "REASON": "83",
                  "SETRIGHT": "A",
                  "SRDENOMINATOR": "1",
                  "SRNUMERATOR": "1",
                  "AREA": null,
                  "CERTIFICATENO": "1127009522",
                  "CLAIMRIGHT": "A",
                  "CRDENOMINATOR": "1",
                  "CRNUMERATOR": "1",
                  "RIGHTTYPE": "N",
                  "SUBJECTTYPE": "A",
                  "OTFNO": null,
                  "BLDGOWNERSHIP": [
                      {
                          "OWRNO": "0009"
                      }
                  ],
                  "OWNER": {
                      "LTYPE": null,
                      "LID": null,
                      "LNAME": null,
                      "LADDR": null
                  },
                  "JOINTGUARANTY": {
                      "LAND": [
                          {
                              "SEC": "0424",
                              "NO": "03160000"
                          }
                      ],
                      "BUILDING": [
                          {
                              "SEC": "0424",
                              "NO": "04195000"
                          }
                      ]
                  },
                  "OTHERRIGHTFILE": {
                      "OTFNO": "112ACAF028760",
                      "CCPT_RVT": "N",
                      "CCP_RV": "21570000",
                      "DURATIONTYPE": null,
                      "STARTDATE": null,
                      "ENDDATE": null,
                      "PODT": "Z",
                      "PODD": "依照各個債務契約所約定之清償日期。",
                      "ITYPE_LRTYPE": "Q",
                      "ID_LRD": "依照各個債務契約所約定之利率計算。",
                      "DITYPE": "Q",
                      "DID": "依照各個債務契約所約定之利率計算。",
                      "PTYPE": "Q",
                      "PD": "依照各個債務契約所約定之違約金計收標準計算。",
                      "CCTYPE": "Q",
                      "CCCONTENT": "包括債務人對抵押權人現在（包括過去所負現在尚未清償）及將來所負之借款、墊款、透支、貼現、消費借貸債務、票據、信用卡消費款、侵權行為損害賠償、不當得利返還請求權。",
                      "CCSDT": "Q",
                      "CCSDD": "民國１４２年８月３１日。",
                      "OGSAT": "Q",
                      "OGSAC": "行使擔保債權之訴訟及非訴訟費用、因債務不履行而生之損害賠償、抵押權人所墊付抵押物之保險費。"
                  },
                  "OTHERREG": []
              }
          ]
      }
    ]
    return data
  }
  // ==================================================

  private convertSqft(sqft: number): number {
    return Math.round((sqft + Number.EPSILON) * 0.3025 * 100) / 100
  }

  // 取得建號
  private async getBuildNo(code: string, address: string): Promise<Array<any>> {

    const res = await lastValueFrom(this.httpService.post('https://api.land.moi.gov.tw/cp/api/AddressQueryBuilding/1.0/QueryByAddress', [{
      CITY: code,
      ADDRESS: address
    }], {
      headers: {
        Authorization: `Bearer ${this.configService.get('LAND_ACCESS_TOKEN')}`,
      }
    }))

    if(!res.data?.STATUS) {
      throw new HttpException(this.configService.get('ERR_BAD_REQUEST'), HttpStatus.BAD_REQUEST);
    }
    const data = res.data.RESPONSE[0].BLDGREG;
    return data

  }

  // 處理地址，explict==false 的話就是取大範圍
  private genAddress(createBuildingDto: CreateBuildingDto, explicit: boolean = true): string {
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
    if(!explicit && (lane || lane1)) return res

    // 弄
    res += this.combine('弄', alley, alley1);
    if(!explicit && (alley || alley1)) return res
    // 衖
    res += small_alley ? this.convertNum2Full(small_alley) + '衖' : '';
    if(!explicit && small_alley) return res
    // 號
    res += (district || '') + this.combine('號', number, number1, number2);
    if(!explicit && (number || number1 || number2)) return res
    // 樓
    res += floor ? this.convertNum2Chinese(floor) + '樓' : '';

    // 之
    res += ext ? '之' + this.convertNum2Full(ext) : '';
    return res
  }

  // 數字轉全形數字
  private convertNum2Full(n: number|undefined): string{
    if(!n) return ''
    let res = '', str = n.toString();
    for(let i=0; i<str.length; i++) {
      res += String.fromCharCode(str.charCodeAt(i) + 65248);
    }
    return res
  }

  // 數字轉中文數字，限制：0 - 999
  private convertNum2Chinese(n: number|undefined): string {
    if(!n) return ''
    let units = ['', '十', '百'];
    let nums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    let arr: number[] = [];
    let res = '';

    while(true) {
      arr.push(n%10);
      n = Math.floor(n/10);
      if(n<=0) break
    }
    for (let i=0; i<arr.length; i++) {
      res = nums[arr[i]] + units[i] + res;
    }

    if(res.slice(1,3) === '百十') return res.slice(0,2) + (res.slice(2) === '十' ? '' : '零' + res.slice(-1))
    if(res.slice(0,2) === '一十') return res.slice(1)
    return res
  }

  // 連接幾之幾
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
