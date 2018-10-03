## API Document

* [Reverse Geocoding v2](./API_REVERSE_GEOCODING_V2.md)

---

## Reverse Geocoding

การค้นหาข้อมูลโดยใช้ระบบพิกัด (lat, lng)

* [Examples](#ตัวอย่างการใช้งาน)
* [Error Response](#error-response)

> **GET** `https://api.mapmagic.co.th/v1/reverse-geocoding`

### Query String
| Property | Description | Type | Default |
|----------|-------------|------|---------|
| lat | ค่าละติจูดของตำแหน่งที่ต้องการ | number | - |
| lng | ค่าลองจิจูดของตำแหน่งที่ต้องการ | number | - |
| radius | กำหนดระยะการค้นหารอบๆ marker (เมตร) | number | 10 |
| response_type | ลักษณะของ response ที่ได้โดยที่เลือกได้ 4 แบบระหว่าง `"simple"`, `"nearby"`, `"area"` และ `"full"` | string | `"full"` |
| app_id | Application ID ที่ได้จากการ register บน [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) ใช้ในการ authentication | string | - |
| api_key | API Key ที่ได้จากการ register บน [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) ใช้ในการ authentication | string | - |

### Responses `simple`
| Property | Description | Type |
|----------|-------------|------|
| response | ผลลัพธ์ที่ได้จากการค้นหาเมื่อ response_type เป็น `"simple"` | object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ผลลัพธ์ภาษาไทย | string |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ผลลัพธ์ภาษาอังกฤษ | string |

### Responses `nearby`
| Property | Description | Type |
|----------|-------------|------|
| response | ผลลัพธ์ที่ได้จากการค้นหาเมื่อ response_type เป็น `"nearby"` โดยจะได้เป็นสถานที่ที่อยู่ใกล้ ( nearby poi ) แต่ถ้าไม่มีจะได้เป็นถนนที่อยู่ใกล้ ( nearby street ) | object |

### Responses `area`
| Property | Description | Type |
|----------|-------------|------|
| response | ผลลัพธ์ที่ได้จากการค้นหาเมื่อ response_type เป็น `"area"` โดยจะได้เป็นข้อมูลพื้นที่ | object |

### Responses `full`
| Property | Description | Type |
|----------|-------------|------|
| response | ผลลัพธ์ที่ได้จากการค้นหาเมื่อ response_type เป็น `"full"` | object |
| &nbsp;&nbsp;&nbsp;&nbsp;currentLocation | ตำแหน่งพื้นที่ปัจจุบัน | object[] |
| &nbsp;&nbsp;&nbsp;&nbsp;currentStreet | ถนนที่ได้จากตำแหน่งปัจจุบัน | object[] |
| &nbsp;&nbsp;&nbsp;&nbsp;nearbyPOI |  ตำแหน่งของสถานที่ที่ใกล้เคียงกับตำแหน่งปัจจุบัน โดยเรียงตามระยะทางที่ใกล้กว่า | object[] |

### ตัวอย่างการใช้งาน
#### Request `simple`

> URL : `https://api.mapmagic.co.th/v1/reverse-geocoding?response_type=simple&lat=18.760694&lng=98.971197&api_key=${your_api_key}&app_id=${your_app_id}`

#### Responses

```
{
    "response": {
        "th": "ป่าแดด เมืองเชียงใหม่ เชียงใหม่",
        "en": "The Office Plus, Pa Daet, Mueang Chiang Mai, Chiang Mai",
    }
}
```
#### Request `nearby`

> URL : `https://api.mapmagic.co.th/v1/reverse-geocoding?response_type=nearby&lat=18.760694&lng=98.971197&api_key=${your_api_key}&app_id=${your_app_id}`

#### Responses

```
{
    "response": {
        "coordinate": {
            "lat": 18.808735,
            "lng": 99.0124930000003
        },
        "data_id": "5b6198820579f491c6f6b453",
        "name": {
            "th": "ร้านอาหารเฮือนซาลาเปา",
            "en": "Hueai Salaphao Restaurant"
        },
        "short_name": {
            "th": "เฮือนซาลาเปา",
            "en": "Hueai Salaphao Restaurant"
        },
        "telephone": null,
        "type": "landmark",
        "category": "food",
        "poi_score": 0,
        "address": {
            "tambon": {
                "th": "ป่าแดด"
            },
            "amphoe": {
                "th": "เมืองเชียงใหม่"
            },
            "province": {
                "th": "เชียงใหม่"
            }
        }
    }
}
```
#### Request `area`

> URL : `https://api.mapmagic.co.th/v1/reverse-geocoding?response_type=area&lat=18.760694&lng=98.971197&api_key=${your_api_key}&app_id=${your_app_id}`

#### Responses

```
{
    "response": {
        "centroid": {
            "lat": 18.7450866577476,
            "lng": 98.9791069030708
        },
        "data_id": "5b988fd80de0d9644c8c2203",
        "name": {
            "th": "ตำบลป่าแดด อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่",
            "en": "Tambon Pa Daet, Amphoe Mueang Chiang Mai, Changwat Chiang Mai"
        },
        "type": "tambon",
        "poi_score": 10,
        "address": {
            "tambon": {
                "code": "140105",
                "th": "ป่าแดด",
                "en": "Pa Daet"
            },
            "amphoe": {
                "code": "1401",
                "th": "เมืองเชียงใหม่",
                "en": "Mueang Chiang Mai"
            },
            "province": {
                "code": "14",
                "th": "เชียงใหม่",
                "en": "Chiang Mai"
            }
        }
    }
}
```
#### Request `full`

> URL : `https://api.mapmagic.co.th/v1/reverse-geocoding?response_type=full&lat=18.760694&lng=98.971197&api_key=${your_api_key}&app_id=${your_app_id}`

#### Responses

```
{
    "response": {
        "currentLocation": [{
            "centroid": {
                "lat": 18.7450866577476,
                "lng": 98.9791069030708
            },
            "data_id": "5b988fd80de0d9644c8c2203",
            "name": {
                "th": "ตำบลป่าแดด อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่",
                "en": "Tambon Pa Daet, Amphoe Mueang Chiang Mai, Changwat Chiang Mai"
            },
            "type": "tambon",
            "poi_score": 10,
            "address": {
                "tambon": {
                    "code": "140105",
                    "th": "ป่าแดด",
                    "en": "Pa Daet"
                },
                "amphoe": {
                    "code": "1401",
                    "th": "เมืองเชียงใหม่",
                    "en": "Mueang Chiang Mai"
                },
                "province": {
                    "code": "14",
                    "th": "เชียงใหม่",
                    "en": "Chiang Mai"
                }
            }
        }],
        "currentStreet": [{
            "data_id": "5b64354708d2302f6f44538c",
            "name": {
                "th": "ถนนไฮเวย์ลำปาง-เชียงใหม่",
                "en": "Highway Lampang-Chiang mai Rd."
            },
            "short_name": {
                "th": "ถ.ไฮเวย์ลำปาง-เชียงใหม่",
                "en": "Highway Lampang-Chiang mai Rd."
            },
            "type": "transport"
        }],
        "nearbyPOI": [{
            "coordinate": {
                "lat": 18.808735,
                "lng": 99.0124930000003
            },
            "data_id": "5b6198820579f491c6f6b453",
            "name": {
                "th": "ร้านอาหารเฮือนซาลาเปา",
                "en": "Hueai Salaphao Restaurant"
            },
            "short_name": {
                "th": "เฮือนซาลาเปา",
                "en": "Hueai Salaphao Restaurant"
            },
            "telephone": null,
            "type": "landmark",
            "category": "food",
            "poi_score": 0,
            "address": {
                "tambon": {
                    "th": "ป่าแดด"
                },
                "amphoe": {
                    "th": "เมืองเชียงใหม่"
                },
                "province": {
                    "th": "เชียงใหม่"
                }
            }
        }]
    }
    
}
```
---

### Error Response

| Status code | Description |
|-------------|-------------|
| 401 | api_key or app_id is invalid ! |
| 404 | Not Found. |
| 408 | Request Timeout. |
| 422 | response_type must be "simple","nearby","area" and "full" only. |
| | Lat must not less than -90 or greater than 90, and Lng must not less than -180 or greater than 180. |
| |  Not found category or type. |
| |  Coordinate[lat, lng] is required. |
| |  Coordinate[lat, lng] is invalid. |
| |  response_type must be “simple”,“nearby”,“area” and “full” only.. |
| 502 | Bad Gateway. |
| 503 | Service Unavailable. |