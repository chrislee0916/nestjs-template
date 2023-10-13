import { HttpException, HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { DatabaseService } from 'src/database/database.service';
import { InjectModel } from '@nestjs/mongoose';
import { Building, BuildingDocument, BuildingSchema } from './entities/building.entity';
import { Document, Model, Types } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { catchError, lastValueFrom, map, tap } from 'rxjs';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { BuildingBasic } from '../building-basic/entities/building-basic.entity';
import { BuildingBasicService } from '../building-basic/building-basic.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CreateBuildingBasicDto } from '../building-basic/dto/create-building-basic.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CodeConvertService } from '../code-convert/code-convert.service';
import { ShowBuildingDto, ShowDetailBuildingDto } from './dto/show-building.dto';
import { ListBuildingDto } from './dto/list-building.dto';

@Injectable()
export class BuildingService extends DatabaseService implements OnModuleInit {
  private landAccessToken = '';

  constructor(
    @InjectModel(Building.name) private readonly buildingModel: Model<BuildingDocument>,
    private readonly codeConvertService: CodeConvertService,
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
        const { response, message, code } = axiosErr;
        console.log(
          '錯誤 error :',
          {
            code: code,
            message: message,
            response: response?.data ? response?.data : response,
          }
        );
        throw new HttpException(message || code || this.configService.get('ERR_BAD_REQUEST'), response.status || 400)
      }
    );
  }

  // onModuleInit(){}
  @Cron(CronExpression.EVERY_5_MINUTES)
  async onModuleInit() {
    const username = this.configService.get('LAND_BASIC_USERNAME');
    const password = this.configService.get('LAND_BASIC_PASSWORD');

    let res = await lastValueFrom(this.httpService.get('https://api.land.moi.gov.tw/cp/gettoken', { auth: { username, password }}));
    const { access_token } = res.data;
    this.landAccessToken = access_token;
  }

  async create(createBuildingDto: CreateBuildingDto): Promise<ShowBuildingDto[]>  {

    // 取得地址
    const address = this.genAddress(createBuildingDto);
    // return address;
    // 查詢現有 db 有無資料
    const existItems = await this.softFind({ address });
    if(existItems.length) {
      return existItems
    }

    // 打 api 取得大範圍建號資料
    const { code, city, area } = createBuildingDto;
    const noExplicitAddress = this.genAddress(createBuildingDto, false);
    console.log('noExplicitAddress: ',noExplicitAddress);
    Logger.log('執行 門牌查建號服務... ');
    const buildNos = await this.getBuildNo(code, noExplicitAddress);
    Logger.log('完成 門牌查建號服務');
    if(!buildNos?.length) {
      throw new HttpException(this.configService.get('ERR_RESOURCE_NOT_FOUND'), HttpStatus.NOT_FOUND);
    }

    // 取到的大範圍資料存到資料庫
    let buildings = [] // bulkWrite 需要的條件
    let buildNoArr = [] // find 需要的條件
    let isFound = false // 如果有與需求地址符合直接回傳
    for(let i=0; i<buildNos.length; i++) {
      const { UNIT, SEC, NO, BNUMBER } = buildNos[i];
      const idx = this.getStartIndex(BNUMBER);
      const item = {
        address: city + area + BNUMBER.slice(idx), // 沒有村里, 鄰
        buildNo: {
          unit: UNIT,
          sec: SEC,
          no: NO,
        }
      };
      if(item.address === address) isFound = true;
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
    if(isFound) {
      // 可能會有相同地址但是建號不同 所以返回 array
      return this.softFind({ address });
    }
    // 找不到完全相符的就返回剛剛抓取的大範圍資料
    return this.softFind({ buildNo: { $in: buildNoArr }});
  }

  async findOne(id: string): Promise<ShowDetailBuildingDto> {
    let existItem = await this.genConvertItem(id);
    // 如果都有資料的話 直接返回
    if(existItem && existItem.basic) {
      return existItem
    }

    const { buildNo:{unit, sec, no} } = existItem;

    if(!existItem.basic) {
      const basicData = await this.createBasic({UNIT: unit, SEC: sec, NO: no});
      const basic = await this.buildingBasicService.create(basicData);
      existItem.basic = basic._id;
    }

    await this.buildingModel.create(existItem);
    return this.genConvertItem(id);
  }

  private async genConvertItem(id: string){
    let item: any = await this.buildingModel.findById(id).populate('basic').exec();
    return this.codeConvertService.convert(item);
  }


  private async createBasic(buildNo: { UNIT: string, SEC: string, NO: string })/*: Promise<CreateBuildingBasicDto> */{
    // 標示部
    // API04 需先打API04取得地號
    const buildingLabel = await this.getBuildingLabel(buildNo);
    // 可能有多個地號
    const landNos = buildingLabel.landNos.map( item => ({ ...buildNo, NO: item.LANDNO }));
    // API01 土地標示部
    const landLabelPromises = landNos.map(landNo => this.getLandLabel(landNo));
    const [landLabels] = await Promise.all(landLabelPromises);

    // 所有權部
    // API02
    const landOwnPromises = landNos.map(landNo => this.getLandOwn(landNo));
    const [landOwns] = await Promise.all(landOwnPromises);

    // API05
    const buildingOwns = await this.getBuildingOwn(buildNo);

    // 他項權利部
    // API03
    const landOtherPromise = landNos.map(landNo => this.getLandOther(landNo));
    const [landOthers] = await Promise.all(landOtherPromise);
    // API06
    const buildingOthers = await this.getBuildingOther(buildNo);

    return {
      label: {
        landLabels,
        buildingLabel
      },
      own: {
        landOwns,
        buildingOwns
      },
      other: {
        landOthers,
        buildingOthers
      }
    }
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

    const { NO, LANDREG } = data;
    const { ZONING, LCLASS, ALVALUE, ALPRICE, OTHERREG, AREA } = LANDREG;

    // 公告地現值 換成 每坪
    let alValue = Math.round(+ALVALUE / 0.3025 * 100) / 100;
    // 公告地價 換成 每坪
    let alPrice = Math.round(+ALPRICE / 0.3025 * 100) / 100;


    // 土地總面積
    let totalArea = this.convertSqft(+AREA)

    // 土地資訊
    return {
      no: NO,
      zone: ZONING,
      zoneDetail: LCLASS,
      alValue: alValue,
      alPrice: alPrice,
      otherReg: OTHERREG,
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
    const { NO, BLDGREG, FLOORACC, SHAREDAREA } = data;

    // 主建物樓層
    const floor = FLOORACC.find(val => val.FID_ABID === '建物分層')?.FPUR_ABPUR;


    /* ============ 建物面積資訊 ============ */
    // 建物總面積
    let totalArea = 0;
    // 主建物面積
    const area = this.convertSqft(+BLDGREG.AREA);
    totalArea += +BLDGREG.AREA;

    // 附屬建物總面積 & 各面積
    const accessoryBuilding = [];
    let accessoryTotalArea = 0;
    for(let i=0; i< FLOORACC.length; i++) {
      if(FLOORACC[i].FID_ABID === '附屬建物') {
        let { FAREA_ABAREA, FPUR_ABPUR } = FLOORACC[i];
        totalArea += +FAREA_ABAREA;
        accessoryTotalArea += +FAREA_ABAREA;
        accessoryBuilding.push({
          FPUR_ABPUR: FPUR_ABPUR,
          FAREA_ABAREA: this.convertSqft(+FAREA_ABAREA)
        })
      }
    }
    accessoryTotalArea = this.convertSqft(accessoryTotalArea);

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
      purpose: BLDGREG.PURPOSE, // 建物用途: 代碼
      material: BLDGREG.MATERIAL, // 建物結構: 代碼
      otherReg: BLDGREG.OTHERREG, // 其他登記事項內容, 代碼
      // 建物面積資訊
      area: area,
      accessoryTotalArea: accessoryTotalArea,// 附屬建物合計面積
      accessoryBuilding: accessoryBuilding, // 各附屬建物面積
      sharedArea: sharedArea, //公設合計面積
      shareParkArea: shareParkArea, // 車位合計面積
      totalArea: totalArea, // 建物總面積
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
    const landOwn = data[0].LANDOWNERSHIP;

    const res = landOwn.map(val => {

      const dlPrice = Math.round(+val.DLPRICE / 0.3025 * 100) / 100;
      const ltPrice = val.LTPRICE.map(item => {
        return {
          ...item,
          LTVALUE: Math.round(+item.LTVALUE / 0.3025 * 100) / 100
        }
      })


      // OTHERREG
      return {
        // 土地持分資訊
        rights: val.RIGHT,
        numerator: val.NUMERATOR,
        denominator: val.DENOMINATOR,
        // 土地所有權登記資訊
        rDate: val.RDATE,
        reason: val.REASON,
        dlPrice: dlPrice,
        ltPrice: ltPrice,
        otherrights: val.OTHERRIGHTS,
        otherreg: val.OTHERREG
      }
    })
    return res
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

    const buildingOwn = data[0].BLDGOWNERSHIP;

    const res = buildingOwn.map(val => {
      return {
        // 建物持分資訊
        rights: val.RIGHT,
        numerator: val.NUMERATOR,
        denominator: val.DENOMINATOR,
        // 建物所有權登記資訊
        rDate: val.RDATE,
        reason: val.REASON,
        otherrights: val.OTHERRIGHTS,
        otherreg: val.OTHERREG
      }
    })
    return res
  }
  // ========== 土地＆建物 他項權利部 ==========
  private async getLandOther(landNo: { UNIT: string, SEC: string, NO: string}) {
    let data = [
      {
          "UNIT": "AC",
          "SEC": "0424",
          "NO": "03160000",
          "OFFSET": "1",
          "LIMIT": "10",
          "RNO": "0030", //所有權登記次序，字元長度為4
          "OTHERRIGHTS": [ //相關他項權利部
              {
                  "ORNO": "0059000", //他項權利登記次序
                  "RECEIVEYEAR": "110", //收件年期
                  "RECEIVENO1": "ACAF", //收件字
                  "RECEIVENO2": "040220", //收件號
                  "RDATE": "1101230", //登記日期
                  "REASON": "83", //登記原因(※代碼06)
                  "SETRIGHT": null, //設定權利範圍類別(※代碼15)
                  "SRDENOMINATOR": "100000", //設定權利範圍持分分母
                  "SRNUMERATOR": "4901", //設定權利範圍持分分子
                  "AREA": null, //設定權利範圍面積
                  "CERTIFICATENO": "1107014977", //證明書字號
                  "CLAIMRIGHT": "A", //債權權利範圍類別(※代碼18)
                  "CRDENOMINATOR": "1", //債權權利範圍持分分母
                  "CRNUMERATOR": "1", //債權權利範圍持分分子
                  "RIGHTTYPE": "N", //權利種類(※代碼27)
                  "SUBJECTTYPE": "A", //標的種類(※代碼27)
                  "LANDOWNERSHIP": [ //標的登記次序
                      {
                          "OWRNO": "0030" //所有權登記次序
                      }
                  ],
                  "OWNER": { //權利人
                      "LTYPE": null, //類別(※代碼09)
                      "LID": null, //統一編號
                      "LNAME": null, //姓名
                      "LADDR": null //地址
                  },
                  "JOINTGUARANTY": { //共同擔保地／建號
                      "LAND": [ //土地
                          {
                              "SEC": "0424", //共同擔保地號-段
                              "NO": "03160000" //共同擔保地號
                          }
                      ],
                      "BUILDING": [ //建物
                          {
                              "SEC": "0424", //共同擔保建號-段
                              "NO": "04182000" //共同擔保建號
                          }
                      ]
                  },
                  "OTHERRIGHTFILE": { //他項權利檔
                      "OTFNO": "110ACAF040220", //他項權利檔號
                      "CCPT_RVT": "N", //擔保債權總金額/權利價值類別(※代碼17)
                      "CCP_RV": "960000", //擔保債權總金額/權利價值
                      "DURATIONTYPE": null, //存續期間類別(※代碼19)
                      "STARTDATE": null, //起始日期
                      "ENDDATE": null, //終止日期
                      "PODT": "A", //清償日期類別(※代碼20)
                      "PODD": null, //清償日期說明
                      "ITYPE_LRTYPE": "A", //利息(率)或地租類別(※代碼21)
                      "ID_LRD": null, //利息(率)或地租說明
                      "DITYPE": "A", //遲延利息(率)類別(※代碼21)
                      "DID": null, //遲延利息(率)說明
                      "PTYPE": "A", //違約金類別(※代碼21)
                      "PD": null, //違約金說明
                      "CCTYPE": "Q", //擔保債權種類及範圍類別(※代碼33)
                      "CCCONTENT": "擔保債務人對抵押權人現在（包括過去所負現在尚未清償）及將來在本抵押權設定契約書所定最高限額內所負之債務，包括１‧票據、２‧借款、３‧透支、４‧保證、５‧信用卡契約、６‧貼現、７‧承兌、８‧墊款、９‧買入光票、１０‧委任保證、１１‧開發信用狀、１２‧進出口押匯、１３‧應收帳款承購契約、１４‧衍生性金融商品交易契約及１５‧特約商店契約、１６‧信託關係所生之地價稅、房屋稅、營業稅及公法上金錢給付義務等１６項。", //擔保債權種類及範圍內容
                      "CCSDT": "Q", //擔保債權確定期日類別(※代碼34)
                      "CCSDD": "民國１４０年１２月２８日。", //擔保債權確定期日日期
                      "OGSAT": "Q", //其他擔保範圍約定類別(※代碼35)
                      "OGSAC": "１．取得執行名義之費用。２．保全抵押物之費用。３．因債務不履行而發生之損害賠償。４．因辦理債務人與抵押權人約定之擔保債權種類及範圍所生之手續費用。５．抵押權人墊付抵押物之保險費及按墊付日抵押權人基準利率加碼年利率５％之利息。" //其他擔保範圍約定內容
                  },
                  "OTHERREG": [] //其他登記事項
              },
              {
                  "ORNO": "0052000",
                  "RECEIVEYEAR": "110",
                  "RECEIVENO1": "ACAA",
                  "RECEIVENO2": "038710",
                  "RDATE": "1101124",
                  "REASON": "83",
                  "SETRIGHT": null,
                  "SRDENOMINATOR": "100000",
                  "SRNUMERATOR": "4901",
                  "AREA": null,
                  "CERTIFICATENO": "1107013453",
                  "CLAIMRIGHT": "A",
                  "CRDENOMINATOR": "1",
                  "CRNUMERATOR": "1",
                  "RIGHTTYPE": "N",
                  "SUBJECTTYPE": "A",
                  "LANDOWNERSHIP": [
                      {
                          "OWRNO": "0030"
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
                              "NO": "04182000"
                          }
                      ]
                  },
                  "OTHERRIGHTFILE": {
                      "OTFNO": "110ACAA038710",
                      "CCPT_RVT": "N",
                      "CCP_RV": "23960000",
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
                      "CCCONTENT": "擔保債務人對抵押權人現在（包含過去所負現在尚未清償）及將來在本抵押權設定契約書所定最高限額內所負之債務，包括借款、信用卡契約、保證、透支、票據、衍生性金融商品交易契約。",
                      "CCSDT": "Q",
                      "CCSDD": "民國１４０年１１月２１日。",
                      "OGSAT": "Q",
                      "OGSAC": "１．取得執行名義之費用。２．保全抵押物之費用。３．因債務不履行而發生之損害賠償。４．因債務人與抵押權人約定之擔保債權種類及範圍所生之手續費用。５．抵押權人墊付抵押物之保險費及自墊付日起依民法規定之延遲利息。"
                  },
                  "OTHERREG": []
              }
          ]
      },

  ]
    const landOther = data[0].OTHERRIGHTS;
    let res = landOther.map(val => {
      return {
        ownName: val.OWNER.LNAME,
        rightType: val.RIGHTTYPE,
        rNo: val.ORNO,
        rDate: val.RDATE,
        ccpRv: val.OTHERRIGHTFILE.CCP_RV
      }
    })
    return res
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

    const buildingOther = data[0].OTHERRIGHTS;

    let res = buildingOther.map(val => {
      return {
        ownName: val.OWNER.LNAME,
        rightType: val.RIGHTTYPE,
        rNo: val.ORNO,
        rDate: val.RDATE,
        ccpRv: val.OTHERRIGHTFILE.CCP_RV
      }
    })
    return res
  }
  // ==================================================

  // 平方公尺轉坪 四捨五入小數點後 2位
  private convertSqft(sqft: number): number {
    return Math.round((sqft + Number.EPSILON) * 0.3025 * 100) / 100
  }

  // 處理 BNUMBER 地址, 因為沒有村里鄰所以需要拿掉
  getStartIndex(bnumber: string): number {
    let index = -1
    for(let i=0; i<bnumber.length; i++) {
      const item = bnumber[i];
      if(item === '村' || item === '里' || item === '鄰') {
        i > index ? index = i : index
      }
    }
    return index+1
  }

  // 取得建號
  private async getBuildNo(code: string, address: string): Promise<Array<any>> {
    const res = await lastValueFrom(this.httpService.post('https://api.land.moi.gov.tw/cp/api/AddressQueryBuilding/1.0/QueryByAddress', [{
      CITY: code,
      ADDRESS: address
    }], {
      headers: {
        Authorization: `Bearer ${this.landAccessToken}`,
      },
    }));

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
