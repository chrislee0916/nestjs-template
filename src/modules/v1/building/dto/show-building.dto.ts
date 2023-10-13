import { ApiProperty } from "@nestjs/swagger";
import { DefaultDataDto } from "src/common/dto/default.dto";
import { BuildNo } from "../entities/building.entity";
import { ShowBuildingBasicDto } from "../../building-basic/dto/show-building-basic.dto";
import { Types } from "mongoose";


export class ShowBuildingDto extends DefaultDataDto{
  @ApiProperty({
    required: true,
    description: '轉換後的地址',
    example: '台北市中正區北平東路１６號十一樓之２'
  })
  readonly address: string;

  @ApiProperty({
    required: true,
    description: '建號',
    example: { unit: "QD", sec: '0863', no: '00173000' }
  })
  readonly buildNo: BuildNo;

  // @ApiProperty({
  //   required: true,
  //   description: '基本資訊(標記部、所有權部、其他項權利部)',
  //   example: {
  //     label: {
  //       "landLabels": {
  //           "no": "03160000",
  //           "zone": null,
  //           "zoneDetail": null,
  //           "alValue": 1510743.8,
  //           "alPrice": 383471.07,
  //           "otherReg": [
  //               {
  //                   "NUMBER": "010",
  //                   "CATEGORY": "重測前：",
  //                   "CONTENT": "朱厝崙段９２—３８地號"
  //               },
  //               {
  //                   "NUMBER": "020",
  //                   "CATEGORY": "合併自：",
  //                   "CONTENT": "０３１７－００１２、０３１７－００２０地號"
  //               },
  //               {
  //                   "NUMBER": "030",
  //                   "CATEGORY": "（權狀註記事項）",
  //                   "CONTENT": "長春段二小段４１７５建號等之建築基地地號：長春段二小段３１６地號  "
  //               }
  //           ],
  //           "totalArea": 74.72
  //       },
  //       "buildingLabel": {
  //           "no": "04195000",
  //           "landNos": [
  //               {
  //                   "SUBSECTION": "0424",
  //                   "LANDNO": "03160000"
  //               }
  //           ],
  //           "completeDate": "1070514",
  //           "buildingTotalFloor": "十一層",
  //           "floor": "十層",
  //           "purpose": "住家用",
  //           "material": "鋼筋混凝土造",
  //           "otherReg": [
  //               {
  //                   "NUMBER": "010",
  //                   "CATEGORY": "使用執照字號：",
  //                   "CONTENT": "１０７使字第０１００號"
  //               },
  //               {
  //                   "NUMBER": "020",
  //                   "CATEGORY": "（權狀註記事項）",
  //                   "CONTENT": "建築基地地號：長春段二小段３１６地號"
  //               },
  //               {
  //                   "NUMBER": "030",
  //                   "CATEGORY": "建築基地權利（種類）範圍：",
  //                   "CONTENT": "長春段二小段３１６地號（所有權）１０００００分之４２６３"
  //               },
  //               {
  //                   "NUMBER": "050",
  //                   "CATEGORY": "（一般註記事項）",
  //                   "CONTENT": "嗣後建築物所有權人於因買賣、交換、贈與、信託辦理所有權移轉登記時，得檢附開業建築師出具三個月內有效之建築物無違章建築證明。"
  //               },
  //               {
  //                   "NUMBER": "060",
  //                   "CATEGORY": "本建物不得加設夾層，違者無條件拆除，並負擔拆除費用 ",
  //                   "CONTENT": null
  //               }
  //           ],
  //           "area": 6.27,
  //           "accessoryTotalArea": 4.95,
  //           "accessoryBuilding": [
  //               {
  //                   "FPUR_ABPUR": "陽台",
  //                   "FAREA_ABAREA": 0.8
  //               },
  //               {
  //                   "FPUR_ABPUR": "雨遮",
  //                   "FAREA_ABAREA": 4.16
  //               }
  //           ],
  //           "sharedArea": 9.17,
  //           "shareParkArea": 6.52,
  //           "totalArea": 26.91
  //       }
  //     },
  //     own: {
  //       landOwns: [
  //         {
  //           "rights": null,
  //           "numerator": "4901",
  //           "denominator": "100000",
  //           "rDate": "1101124",
  //           "reason": "買賣",
  //           "dlPrice": 306776.86,
  //           "ltPrice": [
  //               {
  //                   "LTDATE": "11011",
  //                   "LTVALUE": 1381818.18,
  //                   "PORIGHT": null,
  //                   "PODENOMINATOR": "100000",
  //                   "PONUMERATOR": "4901"
  //               }
  //           ],
  //           "otherrights": [
  //               {
  //                   "ORNO": "0052000"
  //               },
  //               {
  //                   "ORNO": "0059000"
  //               }
  //           ],
  //           "otherreg": [
  //               {
  //                   "NUMBER": "020",
  //                   "CATEGORY": "（限制登記事項）",
  //                   "CONTENT": "１１１年４月２２日中山字第０５５３１０號，依財政部北區國稅局北區國稅三重服字第１１１３４０４７８７Ａ號函辦理禁止處分登記，納稅義務人：李鴻智即兆星裝潢工程行，限制範圍：１０００００分之４９０１，１１１年４月２２日登記。"
  //               },
  //               {
  //                   "NUMBER": "040",
  //                   "CATEGORY": "（限制登記事項）",
  //                   "CONTENT": "１１１年９月２７日中山字第１３０６５０號，依臺灣臺北地方法院民事執行處１１１年９月２７日北院忠１１１司執甲字第１０１００６號函辦理查封登記，債權人：苗芳瑛，債務人：李泳志（原名：李鴻智），限制範圍：１０００００分之４９０１，１１１年９月２７日登記。"
  //               }
  //           ]
  //         }
  //       ],
  //       buildingOwns: [
  //         {
  //           "rights": "全部",
  //           "numerator": "1",
  //           "denominator": "1",
  //           "rDate": "1110317",
  //           "reason": "買賣",
  //           "otherrights": [
  //               {
  //                   "ORNO": "0005000"
  //               },
  //               {
  //                   "ORNO": "0007000"
  //               },
  //               {
  //                   "ORNO": "0006000"
  //               }
  //           ],
  //           "otherreg": []
  //         }
  //       ]
  //     },
  //     other: {
  //       landOthers: [
  //         {
  //           "ownName": null,
  //           "rightType": "最高限額抵押權",
  //           "rNo": "0059000",
  //           "rDate": "1101230",
  //           "ccpRv": "960000"
  //         },
  //         {
  //             "ownName": null,
  //             "rightType": "最高限額抵押權",
  //             "rNo": "0052000",
  //             "rDate": "1101124",
  //             "ccpRv": "23960000"
  //         }
  //       ],
  //       buildingOthers: [
  //         {
  //           "ownName": null,
  //           "rightType": "最高限額抵押權",
  //           "rNo": "0005000",
  //           "rDate": "1120214",
  //           "ccpRv": "21000000"
  //         },
  //         {
  //             "ownName": null,
  //             "rightType": "最高限額抵押權",
  //             "rNo": "0006000",
  //             "rDate": "1120214",
  //             "ccpRv": "680000"
  //         },
  //         {
  //             "ownName": null,
  //             "rightType": "最高限額抵押權",
  //             "rNo": "0007000",
  //             "rDate": "1120901",
  //             "ccpRv": "21570000"
  //         }
  //       ]
  //     }
  //   }
  // })
  // readonly basic: ShowBuildingBasicDto;

  @ApiProperty({
    required: false,
    description: '基本資訊(標記部、所有權部、其他項權利部)',
    example: '62791f7a9704f94c81211b51'
  })
  readonly basic: Types.ObjectId
}


export class ShowDetailBuildingDto extends DefaultDataDto {
  @ApiProperty({
    required: true,
    description: '轉換後的地址',
    example: '台北市中正區北平東路１６號十一樓之２'
  })
  readonly address: string;

  @ApiProperty({
    required: true,
    description: '建號',
    example: { unit: "QD", sec: '0863', no: '00173000' }
  })
  readonly buildNo: BuildNo;

  @ApiProperty({
    required: true,
    description: '基本資訊(標記部、所有權部、其他項權利部)',
    example: {
      label: {
        "landLabels": {
            "no": "03160000",
            "zone": null,
            "zoneDetail": null,
            "alValue": 1510743.8,
            "alPrice": 383471.07,
            "otherReg": [
                {
                    "NUMBER": "010",
                    "CATEGORY": "重測前：",
                    "CONTENT": "朱厝崙段９２—３８地號"
                },
                {
                    "NUMBER": "020",
                    "CATEGORY": "合併自：",
                    "CONTENT": "０３１７－００１２、０３１７－００２０地號"
                },
                {
                    "NUMBER": "030",
                    "CATEGORY": "（權狀註記事項）",
                    "CONTENT": "長春段二小段４１７５建號等之建築基地地號：長春段二小段３１６地號  "
                }
            ],
            "totalArea": 74.72
        },
        "buildingLabel": {
            "no": "04195000",
            "landNos": [
                {
                    "SUBSECTION": "0424",
                    "LANDNO": "03160000"
                }
            ],
            "completeDate": "1070514",
            "buildingTotalFloor": "十一層",
            "floor": "十層",
            "purpose": "住家用",
            "material": "鋼筋混凝土造",
            "otherReg": [
                {
                    "NUMBER": "010",
                    "CATEGORY": "使用執照字號：",
                    "CONTENT": "１０７使字第０１００號"
                },
                {
                    "NUMBER": "020",
                    "CATEGORY": "（權狀註記事項）",
                    "CONTENT": "建築基地地號：長春段二小段３１６地號"
                },
                {
                    "NUMBER": "030",
                    "CATEGORY": "建築基地權利（種類）範圍：",
                    "CONTENT": "長春段二小段３１６地號（所有權）１０００００分之４２６３"
                },
                {
                    "NUMBER": "050",
                    "CATEGORY": "（一般註記事項）",
                    "CONTENT": "嗣後建築物所有權人於因買賣、交換、贈與、信託辦理所有權移轉登記時，得檢附開業建築師出具三個月內有效之建築物無違章建築證明。"
                },
                {
                    "NUMBER": "060",
                    "CATEGORY": "本建物不得加設夾層，違者無條件拆除，並負擔拆除費用 ",
                    "CONTENT": null
                }
            ],
            "area": 6.27,
            "accessoryTotalArea": 4.95,
            "accessoryBuilding": [
                {
                    "FPUR_ABPUR": "陽台",
                    "FAREA_ABAREA": 0.8
                },
                {
                    "FPUR_ABPUR": "雨遮",
                    "FAREA_ABAREA": 4.16
                }
            ],
            "sharedArea": 9.17,
            "shareParkArea": 6.52,
            "totalArea": 26.91
        }
      },
      own: {
        landOwns: [
          {
            "rights": null,
            "numerator": "4901",
            "denominator": "100000",
            "rDate": "1101124",
            "reason": "買賣",
            "dlPrice": 306776.86,
            "ltPrice": [
                {
                    "LTDATE": "11011",
                    "LTVALUE": 1381818.18,
                    "PORIGHT": null,
                    "PODENOMINATOR": "100000",
                    "PONUMERATOR": "4901"
                }
            ],
            "otherrights": [
                {
                    "ORNO": "0052000"
                },
                {
                    "ORNO": "0059000"
                }
            ],
            "otherreg": [
                {
                    "NUMBER": "020",
                    "CATEGORY": "（限制登記事項）",
                    "CONTENT": "１１１年４月２２日中山字第０５５３１０號，依財政部北區國稅局北區國稅三重服字第１１１３４０４７８７Ａ號函辦理禁止處分登記，納稅義務人：李鴻智即兆星裝潢工程行，限制範圍：１０００００分之４９０１，１１１年４月２２日登記。"
                },
                {
                    "NUMBER": "040",
                    "CATEGORY": "（限制登記事項）",
                    "CONTENT": "１１１年９月２７日中山字第１３０６５０號，依臺灣臺北地方法院民事執行處１１１年９月２７日北院忠１１１司執甲字第１０１００６號函辦理查封登記，債權人：苗芳瑛，債務人：李泳志（原名：李鴻智），限制範圍：１０００００分之４９０１，１１１年９月２７日登記。"
                }
            ]
          }
        ],
        buildingOwns: [
          {
            "rights": "全部",
            "numerator": "1",
            "denominator": "1",
            "rDate": "1110317",
            "reason": "買賣",
            "otherrights": [
                {
                    "ORNO": "0005000"
                },
                {
                    "ORNO": "0007000"
                },
                {
                    "ORNO": "0006000"
                }
            ],
            "otherreg": []
          }
        ]
      },
      other: {
        landOthers: [
          {
            "ownName": null,
            "rightType": "最高限額抵押權",
            "rNo": "0059000",
            "rDate": "1101230",
            "ccpRv": "960000"
          },
          {
              "ownName": null,
              "rightType": "最高限額抵押權",
              "rNo": "0052000",
              "rDate": "1101124",
              "ccpRv": "23960000"
          }
        ],
        buildingOthers: [
          {
            "ownName": null,
            "rightType": "最高限額抵押權",
            "rNo": "0005000",
            "rDate": "1120214",
            "ccpRv": "21000000"
          },
          {
              "ownName": null,
              "rightType": "最高限額抵押權",
              "rNo": "0006000",
              "rDate": "1120214",
              "ccpRv": "680000"
          },
          {
              "ownName": null,
              "rightType": "最高限額抵押權",
              "rNo": "0007000",
              "rDate": "1120901",
              "ccpRv": "21570000"
          }
        ]
      }
    }
  })
  readonly basic: ShowBuildingBasicDto;

}