## API Document

* [Text Search](#text-search)
* [Nearby Search](#nearby-search)
* [ตัวอย่างตามสถานการณ์ต่างๆ](#ตัวอย่างตามสถานการณ์ต่างๆ)
* [Multi Search](#multi-search)

---

### Text Search

การค้นหาโดยอ้างอิงจากข้อความ

> **POST** `https://api.mapmagic.co.th/v1/search/textsearch`

#### Body
| Property | Description | Allowed Values | Default Value |
|----------|-------------|-------------|-------|
| keyword | ชื่อของสถานที่ที่ต้องการค้นหา | string | - |
| app_id | application ID ที่ได้จากการ register บน [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) ใช้ในการ authentication | string | - |
| api_key | api key ที่ได้จากการ register บน [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) ใช้ในการ authentication | string | - |
| page **`optional`** | ตำแหน่งของหน้าที่แสดงผลลัพธ์ | number | 1 |
| limit **`optional`** | จำกัดจำนวนผลลัพธ์ต่อหน้า | number | 10 |

#### Response
| Property | Description | Type |
|----------|-------------|------|
| result | ผลลัพธ์การค้นหา 10 อันดับแรก | object[] |
| &nbsp;&nbsp;&nbsp;&nbsp;data_id | id เฉพาะของผลลัพธ์ | string |
| &nbsp;&nbsp;&nbsp;&nbsp;name | ชื่อ | object |
| &nbsp;&nbsp;&nbsp;&nbsp;short_name | ชื่อแบบสั้น | object |
| &nbsp;&nbsp;&nbsp;&nbsp;address | พื้นที่หรือเขตที่ตั้งที่ประกอบด้วย `ตำบล`, `อำเภอ` และ `จังหวัด` | object |
| &nbsp;&nbsp;&nbsp;&nbsp;telephone | เบอร์โทรศัพท์ติดต่อ | string |
| &nbsp;&nbsp;&nbsp;&nbsp;coordinate | ตำแหน่งรูปแบบ `lat`,`lng` | number[] |
| &nbsp;&nbsp;&nbsp;&nbsp;type | ชนิดของผลลัพธ์ ดูเพิ่มเติมได้ที่ [type](./readme-type-category.md#type) | string |
| &nbsp;&nbsp;&nbsp;&nbsp;category | หมวดหมู่ของผลลัพธ์ ดูเพิ่มเติมได้ที่ [category](./readme-type-category.md#category) | string |
| &nbsp;&nbsp;&nbsp;&nbsp;poi_score | คะแนนความน่าสนใจ | number |
| total | จำนวนผลลัพธ์การค้นหาทั้งหมด | number |

#### ตัวอย่าง
##### Request

> URL : `https://api.mapmagic.co.th/v1/search/textsearch`
```
BODY :
{
    "keyword": "โรงแรม",
    "app_id": "${app_id}",
    "api_key": "${api_key}"
}
```

##### Response

```
{
  "result": [
    {
        "data_id": "5b0513d9d1135ec509513153",
        "name": {
            "th": "โรงแรม การ์เด้น อินน์",
            "en": "Garden Inn Hotel"
        },
        "short_name": {
            "th": "รร.การ์เด้น อินน์",
            "en": "Garden Inn Hotel"
        },
        "address":{
            "tambon": {
                "th": "ตำบลหางดง"
            },
            "amphoe": {
                "th": "อำเภอฮอด"
            },
            "province": {
                "th": "จังหวัดเชียงใหม่"
            }
        },
        "telephone": "08 4487 0457",
        "coordinate": {
            "lat": 18.188946,
            "lng": 98.6062910000004
        },
        "type": "landmark",
        "category": "motel",
        "poi_score": 0
    },
    {
        "data_id": "5b0513f9d1135ec50952c024",
        "name": {
            "th": "โรงแรมมาละไม",
            "en": "maa-lamaii Hotel"
        },
        "short_name": {
            "th": "รร.มาละไม",
            "en": "maa-lamaii Hotel"
        },
        "address":{
            "tambon": {
                "th": "ตำบลหางดง"
            },
            "amphoe": {
                "th": "อำเภอหางดง"
            },
            "province": {
                "th": "จังหวัดเชียงใหม่"
            }
        },
        "telephone": "",
        "coordinate": {
            "lat": 18.6913392173112,
            "lng": 98.9234063029293
        },
        "type": "landmark",
        "category": "motel",
        "poi_score": 0
    },
    ...
  ],
  "total": 9685
}
```
---
### Nearby Search

การค้นหาโดยอ้างอิงจากตำแหน่งและระยะทางซึ่งผลลัพธ์จะจัดลำดับจากสถานที่ที่ใกล้จุดมากที่สุดไปหาน้อยที่สุด


> **POST** `https://api.mapmagic.co.th/v1/search/nearbysearch`

#### Body
| Property | Description | Allowed Values | Default Value |
|----------|-------------|-------------|-------|
| keyword | ชื่อของสถานที่ที่ต้องการค้นหา | string | - |
| origin | ค่า `lat`,`lng` ที่เป็นจุดศูนย์กลางในการค้นหา | number[] | - |
| distance | ระยะทางจากจุดศูนย์กลางที่ใช้ในการจัดลำดับผลลัพธ์จากใกล้ไปไกลตาม [algorithm](./readme-nearby-algorithm.md) โดยค่าที่ใช้ต้องอยู่ในรูปแบบ string ของตัวเลขแล้วตามด้วยหน่วยระยะทางโดยเลือกจาก `km ( กิโลเมตร ) `&#124;` m ( เมตร ) `&#124;` ft ( ฟุต ) `&#124;` yd ( หลา ) `&#124;` mi ( ไมล์ ) ` | string | `"10km"` |
| app_id | application ID ที่ได้จากการ register บน [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) ใช้ในการ authentication | string | - |
| api_key | api key ที่ได้จากการ register บน [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) ใช้ในการ authentication | string | - |
| page **`optional`** | ตำแหน่งของหน้าที่แสดงผลลัพธ์ | number | 1 |
| limit **`optional`** | จำกัดจำนวนผลลัพธ์ต่อหน้า | number | 10 |

#### Response
| Property | Description | Type |
|----------|-------------|------|
| result | ผลลัพธ์การค้นหา 10 อันดับแรก | object[] |
| &nbsp;&nbsp;&nbsp;&nbsp;data_id | id เฉพาะของผลลัพธ์ | string |
| &nbsp;&nbsp;&nbsp;&nbsp;name | ชื่อ | object |
| &nbsp;&nbsp;&nbsp;&nbsp;short_name | ชื่อแบบสั้น | object |
| &nbsp;&nbsp;&nbsp;&nbsp;address | พื้นที่หรือเขตที่ตั้งที่ประกอบด้วย `ตำบล`, `อำเภอ` และ `จังหวัด` | object |
| &nbsp;&nbsp;&nbsp;&nbsp;telephone | เบอร์โทรศัพท์ติดต่อ | string |
| &nbsp;&nbsp;&nbsp;&nbsp;coordinate | ตำแหน่งรูปแบบ `lat`,`lng` | number[] |
| &nbsp;&nbsp;&nbsp;&nbsp;type | ชนิดของผลลัพธ์ ดูเพิ่มเติมได้ที่ [type](./readme-type-category.md#type) | string |
| &nbsp;&nbsp;&nbsp;&nbsp;category | หมวดหมู่ของผลลัพธ์ ดูเพิ่มเติมได้ที่ [category](./readme-type-category.md#category) | string |
| &nbsp;&nbsp;&nbsp;&nbsp;poi_score | คะแนนความน่าสนใจ | number |
| total | จำนวนผลลัพธ์การค้นหาทั้งหมด | number |

#### ตัวอย่าง
##### Request

> URL : `https://api.mapmagic.co.th/v1/search/nearbysearch`
```
BODY :
{
    "keyword": "โรงพยาบาล",
    "origin": [ 18.7607, 98.9707 ],
    "distance": "10km",
    "app_id": "${app_id}",
    "api_key": "${api_key}",
}
```

##### Response

```
{
  "result": [
    {
      "data_id": "5afbe95e9519f2cd96037ca4",
      "name": {
        "th": "โรงพยาบาลเชียงใหม่ใกล้หมอ",
        "en": "Chiang Mai Klaimo Hospital"
      },
      "short_name": {
        "th": "รพ.เชียงใหม่ใกล้หมอ",
        "en": "Chiang Mai Klaimo Hospital"
      },
      "address":{
          "tambon": {
            "th": "ตำบลป่าแดด"
          },
          "amphoe": {
            "th": "อำเภอเมืองเชียงใหม่"
          },
          "province": {
            "th": "จังหวัดเชียงใหม่"
          },
      }
      "telephone": "053-200-002",
      "coordinate": {
        "lat": 18.760683142668,
        "lng": 98.9720924957009
      },
      "type": "landmark",
      "category": "hospital",
      "poi_score": 6
    },
    {
      "data_id": "5afbe86d9519f2cd96006515",
      "name": {
        "th": "โรงพยาบาลมหาราชนครเชียงใหม่",
        "en": "Maharaj Nakhorn Chiang Mai Hospital"
      },
      "short_name": {
        "th": "รพ.มหาราชนครเชียงใหม่",
        "en": "Maharaj Nakhorn Chiang Mai Hospital"
      },
      "address":{
          "tambon": {
            "th": "ตำบลศรีภูมิ"
          },
          "amphoe": {
            "th": "อำเภอเมืองเชียงใหม่"
          },
          "province": {
            "th": "จังหวัดเชียงใหม่"
          },
      },
      "telephone": "053-936-150",
      "coordinate": {
        "lat": 18.789686036711,
        "lng": 98.9741474662705
      },
      "type": "landmark",
      "category": "hospital",
      "poi_score": 8
    },
    ...
  ],
  "total": 9685
}
```
---

### ตัวอย่างตามสถานการณ์ต่างๆ

#### ตัวอย่าง 1

ค้นหาคำว่า "โรงพยาบาล"

##### request
> URL : https://api.mapmagic.co.th/v1/search/textsearch
```
BODY :
{
    "keyword": "โรงพยาบาล",
    "app_id": "${app_id}",
    "api_key": "${api_key}"
}
```

#### ตัวอย่าง 2

ค้นหาคำว่า "โรงพยาบาล" ที่อยู่ใกล้กับสนามบินเชียงใหม่ ( lat = 18.7677534, lng = 98.96211 )

##### request
> URL : https://api.mapmagic.co.th/v1/search/nearbysearch
```
BODY :
{
    "keyword": "โรงพยาบาล",
    "origin": [ 18.7677534, 98.96211 ],
    "distance": "10km",
    "app_id": "${app_id}",
    "api_key": "${api_key}"
}
```

#### ตัวอย่าง 3

ค้นหาคำว่า "โรงพยาบาล" โดยจำกัดการแสดงผลเพียง 5 ผลลัพธ์ต่อหน้า และแสดงผลที่หน้าที่ 3 ของผลลัพธ์ทั้งหมด

##### request
> URL : https://api.mapmagic.co.th/v1/search/textsearch
```
BODY :
{
    "keyword": "โรงพยาบาล",
    "page": 3,
    "limit": 5,
    "app_id": "${app_id}",
    "api_key": "${api_key}"
}
```

---

### Multi Search

การค้นหาที่สามารถเลือกชนิดการค้นหาได้หลายรูปแบบพร้อมๆกัน

> **POST** `https://api.mapmagic.co.th/v1/search/multisearch`

#### Body
| Property | Description | Allowed Values | Default Value |
|----------|-------------|-------------|-------|
| app_id | application ID ที่ได้จากการ register บน [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) ใช้ในการ authentication | string | - |
| api_key | api key ที่ได้จากการ register บน [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) ใช้ในการ authentication | string | - |
| queries | ชุด query ของการค้นที่ต้องการโดยในแต่ละ query ต้องมี searchtype นอกจากนั้นก็สามารถมีค่าได้ตาม textsearch body และ nearbysearch body ตามปกติ | object[] | - |
| &nbsp;&nbsp;&nbsp;&nbsp;searchtype | ที่ใช้บอกว่า query ชนิดนี้เป็น search ชนิดไหน | string | - |

#### Response
| Property | Description | Type |
|----------|-------------|------|
| responses | response ตามลำดับของ query ที่ส่งไป | object[] |
| &nbsp;&nbsp;&nbsp;&nbsp;result | ผลลัพธ์การค้นหา 10 อันดับแรก | object[] |
| &nbsp;&nbsp;&nbsp;&nbsp;total | จำนวนผลลัพธ์การค้นหาทั้งหมด | number |

#### ตัวอย่าง

##### Request

> URL : `https://api.mapmagic.co.th/v1/search/multisearch`

```
BODY : 
{
    "app_id": "${app_id}",
    "api_key": "${api_key}",
    "queries":[
        {
            "searchtype": "nearbysearch",
            "keyword": "โรงแรม",
            "origin": [ 18.7607, 98.9707 ],
            "distance": "10km"
        },
        {
            "searchtype": "textsearch",
            "keyword": "โรงแรม"
        },
        ...
    ]
}
```
##### Response

```
{
    "responses": [
        {
            "result": [
            {
                "data_id": "5b0513ced1135ec509509dd4",
                "name": {
                    "th": "โรงแรมวิน เพลส",
                    "en": "Win Place Hotel"
                },
                "short_name": {
                    "th": "รร.วิน เพลส",
                    "en": "Win Place Hotel"
                },
                "address":{
                    "tambon": {
                        "th": "ตำบลป่าแดด"
                    },
                    "amphoe": {
                        "th": "อำเภอเมืองเชียงใหม่"
                    },
                    "province": {
                        "th": "จังหวัดเชียงใหม่"
                    },,
                },
                "telephone": "0 5381 2828",
                "coordinate": {
                    "lat": 18.7600702129351,
                    "lng": 98.9895538108367
                },
                "type": "landmark",
                "category": "motel",
                "poi_score": 6
            },
            {
                "data_id": "5b0513d9d1135ec509513143",
                "name": {
                    "th": "โรงแรมศิรินาถ ฮิลล์",
                    "en": "Sirinart Hill"
                },
                "short_name": {
                    "th": "รร.ศิรินาถ ฮิลล์",
                    "en": "Sirinart Hill"
                },
                "address":{
                    "tambon": {
                        "th": "ตำบลสุเทพ"
                    },
                    "amphoe": {
                        "th": "อำเภอเมืองเชียงใหม่"
                     },
                    "province": {
                        "th": "จังหวัดเชียงใหม่"
                    },
                },
                "telephone": "0 5390 4904, 0 5390 4420",
                "coordinate": {
                    "lat": 18.768471,
                    "lng": 98.950534
                },
                "type": "landmark",
                "category": "motel",
                "poi_score": 6
            }
            
            ...
            
            ],
            "total": 3426
        }, 
        {
            "result": [
                {
            	  "data_id": "5b068f3dfdc60a1d0edfbc71",
            	  "name": {
            	    "th": "โรงแรมโตเกียวเวนเดอร์",
            	    "en": "Tokyo Lavender Hotel"
            	  },
            	  "short_name": {
            	    "th": "รร.โตเกียวเวนเดอร์",
            	    "en": "Tokyo Lavender Hotel"
            	  },
                  "address":{
            	      "amphoe": {
                        "tambon": {
            	            "th": "ตำบลสุเทพ"
            	          },
                        "th": "อำเภอเมืองเชียงใหม่"
            	      },
            	      "province": {
            	        "th": "จังหวัดเชียงใหม่"
            	      },
                    },
            	  "telephone": "0 5321 1100",
            	  "coordinate": {
            	    "lng": 98.9779315803569,
                    "lat": 18.795541977671
            	  },
            	  "type": "landmark",
                 "category": "motel",
            	  "poi_score": 4
            	}, 
                {
            	  "data_id": "5b068f3dfdc60a1d0edfbc76",
            	  "name": {
            	    "th": "โรงแรมเชียงใหม่ ภูคำ",
            	    "en": "Chiang Mai Phucome Hotel"
            	  },
            	  "short_name": {
            	    "th": "รร.เชียงใหม่ ภูคำ",
            	    "en": "Chiang Mai Phucome Hotel"
            	  },
                  "address":{
            	  	"tambon": {
            	  	  "th": "ตำบลสุเทพ"
            	  	},
                    "amphoe": {
            	  	  "th": "อำเภอเมืองเชียงใหม่"
            	  	},
            	  	"province": {
            	  	  "th": "จังหวัดเชียงใหม่"
            	  	},
                  },
            	  "telephone": "0 5321 1026-31",
            	  "coordinate": {
            	    "lat": 18.8044417255795,
            	    "lng":98.9591387423975
            	  },
            	  "type": "landmark",
                  "category": "motel",
            	  "poi_score": 5
                },
                ...
            ],
            "total": 1566
        }
    ]
}
```

---