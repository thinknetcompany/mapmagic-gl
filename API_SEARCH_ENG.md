## API Document

* [Text Search](#text-search)
* [Nearby Search](#nearby-search)
* [Usage Scenario](#usage-scenario)
* [Multi Search](#multi-search)

---

### Text Search

Search by text.

> **POST** `https://api.mapmagic.co.th/v1/search/textsearch`

#### Body
| Property | Description | Allowed Values | Default Value |
|----------|-------------|-------------|-------|
| keyword | Location name for search. | string | - |
| app_id | [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) application ID that use for authentication. | string | - |
| api_key | [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) API key that use for authentication. | string | - |
| page **`optional`** | Page number of results. | number | 1 |
| limit **`optional`** | Number of resuts. | number | 10 |

#### Response
| Property | Description | Type |
|----------|-------------|------|
| result | First 10 results. | object[] |
| &nbsp;&nbsp;&nbsp;&nbsp;data_id | Unique ID of the result. | string |
| &nbsp;&nbsp;&nbsp;&nbsp;name | Location name. | object |
| &nbsp;&nbsp;&nbsp;&nbsp;short_name | Location short name. | object |
| &nbsp;&nbsp;&nbsp;&nbsp;address | Address of location that consist of `tambon`, `amphoe`, `province`. | object |
| &nbsp;&nbsp;&nbsp;&nbsp;telephone | Telephone number. | string |
| &nbsp;&nbsp;&nbsp;&nbsp;coordinate | Coordinate `lat`,`lng`. | number[] |
| &nbsp;&nbsp;&nbsp;&nbsp;type | Place type, reference from [type](./readme-type-category-eng.md#type). | string |
| &nbsp;&nbsp;&nbsp;&nbsp;category | Place category, reference from [category](./readme-type-category-eng.md#category). | string |
| &nbsp;&nbsp;&nbsp;&nbsp;poi_score | Point of interest score. | number |
| total | Total number of results. | number |

#### Example
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

Search by text and distance between origin and results.


> **POST** `https://api.mapmagic.co.th/v1/search/nearbysearch`

#### Body
| Property | Description | Allowed Values | Default Value |
|----------|-------------|-------------|-------|
| keyword | Location name for search. | string | - |
| origin | Coordinate `lat`,`lng` as a center of search. | number[] | - |
| distance | Distance from center that use for calculate ascending order of results by [algorithm](./readme-nearby-algorithm-eng.md), value must be text of number and distance unit consist of `km ( kilometer ) `&#124;` m ( meter ) `&#124;` ft ( foot ) `&#124;` yd ( yard ) `&#124;` mi ( mile ) ` | string | `"10km"` |
| app_id | [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) application ID that use for authentication. | string | - |
| api_key | [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) API key that use for authentication. | string | - |
| page **`optional`** | Page number of results. | number | 1 |
| limit **`optional`** | Numbers of resuts. | number | 10 |

#### Response
| Property | Description | Type |
|----------|-------------|------|
| result | First 10 results. | object[] |
| &nbsp;&nbsp;&nbsp;&nbsp;data_id | Unique ID of the result. | string |
| &nbsp;&nbsp;&nbsp;&nbsp;name | Location name. | object |
| &nbsp;&nbsp;&nbsp;&nbsp;short_name | Location short name. | object |
| &nbsp;&nbsp;&nbsp;&nbsp;address | Address of location that consist of `tambon`, `amphoe`, `province`. | object |
| &nbsp;&nbsp;&nbsp;&nbsp;telephone | Telephone number. | string |
| &nbsp;&nbsp;&nbsp;&nbsp;coordinate | Coordinate `lat`,`lng`. | number[] |
| &nbsp;&nbsp;&nbsp;&nbsp;type | Place type, reference from [type](./readme-type-category-eng.md#type). | string |
| &nbsp;&nbsp;&nbsp;&nbsp;category | Place category, reference from [category](./readme-type-category-eng.md#category). | string |
| &nbsp;&nbsp;&nbsp;&nbsp;poi_score | Point of interest score. | number |
| total | Total number of results. | number |

#### Example
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

### Usage Scenario

#### Scenario 1

Search "โรงพยาบาล" as a keyword.

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

#### Scenario 2

Search "โรงพยาบาล" as a keyword with location near the Chiang Mai Airport ( lat = 18.7677534, lng = 98.96211 )

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

#### Scenario 3

Search "โรงพยาบาล" as a keyword which shows 5 results from 3rd page

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

Searching which available to put multiple search types simultaneously.

> **POST** `https://api.mapmagic.co.th/v1/search/multisearch`

#### Body
| Property | Description | Allowed Values | Default Value |
|----------|-------------|-------------|-------|
| app_id | [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) application ID that use for authentication. | string | - |
| api_key | [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) API key that use for authentication. | string | - |
| queries | Query sets, body in each of element could be either text search or nearby search | object[] | - |
| &nbsp;&nbsp;&nbsp;&nbsp;searchtype | Query search type | string | - |

#### Response
| Property | Description | Type |
|----------|-------------|------|
| responses | Response in the order of queries. | object[] |
| &nbsp;&nbsp;&nbsp;&nbsp;result | First 10 results. | object[] |
| &nbsp;&nbsp;&nbsp;&nbsp;total | Total number of results. | number |

#### Example

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
