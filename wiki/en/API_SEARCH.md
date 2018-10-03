## API Document

* [Text Search](#text-search)
* [Nearby Search](#nearby-search)
* [Multi Search](#multi-search)
* [Advanced Options](#advanced-options)
* [Usage Scenario](#usage-scenario)
* [Error Response](#error-response)

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
| &nbsp;&nbsp;&nbsp;&nbsp;type | Place type, reference from [type](./readme-type-category.md#type). | string |
| &nbsp;&nbsp;&nbsp;&nbsp;category | Place category, reference from [category](./readme-type-category.md#category). | string |
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
| distance | Distance from center that use for calculate ascending order of results by [algorithm](./readme-nearby-algorithm.md), value must be text of number and distance unit consist of `km ( kilometer ) `&#124;` m ( meter ) `&#124;` ft ( foot ) `&#124;` yd ( yard ) `&#124;` mi ( mile ) ` | string | `"10km"` |
| app_id | [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) application ID that use for authentication. | string | - |
| api_key | [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) API key that use for authentication. | string | - |

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
| &nbsp;&nbsp;&nbsp;&nbsp;type | Place type, reference from [type](./readme-type-category.md#type). | string |
| &nbsp;&nbsp;&nbsp;&nbsp;category | Place category, reference from [category](./readme-type-category.md#category). | string |
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

### Advanced Options

Additional option for search, support on both <code>Textsearch</code> and <code>Nearbysearch</code>

#### Body
| Property | Description | Type | Default Value |
|----------|-------------|-------------|-------|
| sort_by_field | Sort results by field (Not support search mode "keyword") | Object | - |
| &nbsp;&nbsp;&nbsp;&nbsp; field_name | <code>"name_th"</code> Thai place name <br/> <code>"name_en"</code> English place name | string | - |
| &nbsp;&nbsp;&nbsp;&nbsp; order_by | <code>"asc"</code> Ascending order <br/> <code>"desc"</code> Descending order | string | "asc" |
| scoring_factors | Add factor to calculate searching score (Now can use only "poi_score") | String[] | [] |
| mode | 3 ways of search mode <ol><li> <code>"keyword"</code> Find keyword from using tokenizer to split text, both <code>input</code> and <code>doc</code>(in storage), and match them(Not worry about keyword position in text)</li><li> <code>"prefix"</code> Matching input with prefix of doc(in storage)</li><li> <code>"text"</code> Matching without any process</li> | string | "keyword" |
| page | Page number of results | number | 1 |
| limit | Limit results per page | number | 10 |

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

#### Scenario 4

Search "โรงพยาบาล" by add scoring factor <code>poi_score</code> to calculate search score

##### request
> URL : https://api.mapmagic.co.th/v1/search/textsearch
```
BODY :
{
    "keyword": "โรงพยาบาล",
    "scoring_factors": ["poi_score"]
    "app_id": "${app_id}",
    "api_key": "${api_key}"
}
```

#### Scenario 5

Search prefix "โรงพย" 

##### request
> URL : https://api.mapmagic.co.th/v1/search/textsearch
```
BODY :
{
    "keyword": "โรงพย",
    "mode": "prefix"
    "app_id": "${app_id}",
    "api_key": "${api_key}"
}
```

#### Scenario 6

Search "โรงพยาบาล" and sorting result by field "name.th"

##### request
> URL : https://api.mapmagic.co.th/v1/search/textsearch
```
BODY :
{
    "keyword": "โรงพยาบาล"
    "sort_by_field": {field_name: "name_th" , order_by: "asc"}
    "app_id": "${app_id}",
    "api_key": "${api_key}"
}
```

---

### Error Response
Description and error status from service-search

| Status Code | Message |
|----------|-------------|
| 401 | api_key or app_id is invalid ! |
| 404 | Not Found |
| 408 | Request Timeout |
| 422 | Keyword is missing. |
| | Keyword is missing in query. |
| | Origin is missing. |
| | Origin is missing in query. |
| | Origin is not [ lat, lng ]. |
| | Distance is missing. |
| | Distance is missing in query. |
| | Distance unit is incorrect. |
| | Origin is missing. |
| | lat or lng is missing. |lat or lng is missing. |
| | Fuzziness must be 0,1,2 or auto. |
| | Mode must be only "text", "keyword" or "prefix". |
| | sort_by_field must be object and key must be only "field_name", "order_by" |
| | sort_by_field can order by "asc" or "desc" only. |
| | sort_by_field is allowed field "name_th" and "name_en" only. |
| | Option "sort_by_field" is not support search mode "keyword" |
| 502 | Bad Gateway |
| 503 | Service Unavailable |

---
