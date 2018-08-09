### Suggest

แนะนำสถานที่จากคำที่ได้

> **GET** `https://api.mapmagic.co.th/v1/suggest/:place`

#### Param
| Property | Description | Allowed Values | Default Value |
|----------|-------------|-------------| ------- |
| place | ชื่อของสถานที่ที่ต้องการค้นหา | string | - |

*จำกัดผลลัพธ์มากที่สุด 5 สถานที่*

#### Response
| Property | Description | Type |
|----------|-------------|------|
| data_id | id เฉพาะของผลลัพธ์ | string |
| name | ชื่อ | object |
| short_name | ชื่อแบบสั้น | object |
| address | พื้นที่หรือเขตที่ตั้งที่ประกอบด้วย `ตำบล`, `อำเภอ` และ `จังหวัด` | object |
| telephone | เบอร์โทรศัพท์ติดต่อ | string |
| coordinate | ตำแหน่งรูปแบบ `lat`,`lng` | number[] |
| type | ชนิดของผลลัพธ์ ดูเพิ่มเติมได้ที่ [type](./readme-type-category.md#type) | string |
| category | หมวดหมู่ของผลลัพธ์ ดูเพิ่มเติมได้ที่ [category](./readme-type-category.md#category) | string |
| poi_score | คะแนนความน่าสนใจ | number |

#### ตัวอย่าง
##### Request

> URL : `https://api.mapmagic.co.th/v1/suggest/สะ`

##### Response

```
[
  {
    "data_id": "5b0513c8d1135ec5095046da",
    "name": {
      "th": "สะกอม คาบานา",
      "en": "Sakom Cabana"
    },
    "short_name": {
      "th": "สะกอม คาบานา",
      "en": "Sakom Cabana"
    },
    address: {
      "tambon": {
        "th": "ตำบลเกาะสะบ้า"
      }
      "amphoe": {
        "th": "อำเภอเทพา"
      },
      "province": {
        "th": "จังหวัดสงขลา"
      },
    },
    "telephone": "0 1213 0560",
    "coordinate": {
      "lon": 100.889105,
      "lat": 6.92524699999999
    },
    "type": "landmark",
    "type": "hotel",
    "poi_score": 8,
  },
   ...
]
```