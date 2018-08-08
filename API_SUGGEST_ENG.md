### Suggest

Suggest place from keyword 

> **GET** `https://api.mapmagic.co.th/v1/suggest/:place`

#### Param
| Property | Description | Allowed Values | Default Value |
|----------|-------------|-------------| ------- |
| place | Name place | string | - |

*limit 5 places*

#### Response
| Property | Description | Type |
|----------|-------------|------|
| data_id | Unique ID of result. | string |
| name | Name place | object |
| short_name | Short name place. | object |
| address | Constrain suggesting area includes of  `ตำบล`(tambon), `อำเภอ`(amphoe) and `จังหวัด`(province). | object |
| telephone | Telephone number. | string |
| coordinate | Coordinate `lat`,`lng`. | number[] |
| type | Place type reference from[type](./readme-type-category.md#type). | string |
| category | Place category reference from[category](./readme-type-category.md#category). | string |
| poi_score | Point of interest score. | number |

#### Example
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