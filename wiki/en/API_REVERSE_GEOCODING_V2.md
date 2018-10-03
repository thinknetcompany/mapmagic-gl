## API Document

* [Reverse Geocoding v1](./API_REVERSE_GEOCODING.md)

---

## Reverse Geocoding v2

การค้นหาข้อมูลโดยใช้ระบบพิกัด (lat, lng)

* [Examples](#example)
* [Error Response](#error-response)

Search by coordinate (lat, lng)

> **GET** `https://api.mapmagic.co.th/v2/reverse-geocoding`

### Query String
| Property | Description | Type | Default |
|----------|-------------|------|---------|
| lat | Latitude of interested coordinate. | number | - |
| lng | Longitude of interested coordinate. | number | - |
| radius<br>**`optional`** | Set the search distance around the Marker (meters) | number | 10 |
| response_type | Can choose response format is `"simple"`, `"nearby"`, `"area"` and `"full"` [Read more](#responses-simple) | string | `"nearby"` |
| rankby | Sort point of interest(POI) by catagories such as `"sport_club,telephone"`. Reference [Types](https://github.com/thinknetcompany/mapmagic-gl/blob/master/readme-type-category.md#type) and [Categories](https://github.com/thinknetcompany/mapmagic-gl/blob/master/readme-type-category.md#category). | string | - |
| app_id | [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) application ID that use for authentication. | string | - |
| api_key | [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) API key that use for authentication. | string | - |

### Responses `simple`
| Property | Description | Type |
|----------|-------------|------|
| simpleData | Search response when use response_type as `"simple"` | object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | Thai format | string |
| &nbsp;&nbsp;&nbsp;&nbsp;en | English format | string |

### Responses `nearby`
| Property | Description | Type |
|----------|-------------|------|
| nearby | Search response when use response_type as `"nearby"`. Response is place that is close to the current location, but will be closet street if has not any place. | object |

### Responses `area`
| Property | Description | Type |
|----------|-------------|------|
| area | Search response when use response_type as `"area"`. Response is current location. | object |

### Responses `full`
| Property | Description | Type |
|----------|-------------|------|
| area | Current location. | object |
| street | Current street. | object |
| nearbyPOI | Place that is close to the current location. Sort by distance. | [object] |

### Example
#### Request `simple`

> URL : `https://api.mapmagic.co.th/v2/reverse-geocoding?response_type=simple&lat=18.760694&lng=98.971197&api_key=${your_api_key}&app_id=${your_app_id}`

#### Responses

```
{
    simpleData: {
        "th": "ป่าแดด เมืองเชียงใหม่ เชียงใหม่",
        "en": "The Office Plus, Pa Daet, Mueang Chiang Mai, Chiang Mai",
    }
}
```

#### Request `nearby`

> URL : `https://api.mapmagic.co.th/v2/reverse-geocoding?response_type=nearby&lat=18.760694&lng=98.971197&api_key=${your_api_key}&app_id=${your_app_id}`

#### Responses

```
{
    nearby: {
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

> URL : `https://api.mapmagic.co.th/v2/reverse-geocoding?response_type=area&lat=18.760694&lng=98.971197&api_key=${your_api_key}&app_id=${your_app_id}`

#### Responses

```
{
    area: {
        centroid: {
            lat: 18.7450866577476,
            lng: 98.9791069030708
        },
        data_id: "5b988fd80de0d9644c8c2203",
        label: {
            th: "ตำบลป่าแดด อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่",
            en: "Tambon Pa Daet, Amphoe Mueang Chiang Mai, Changwat Chiang Mai"
        },
        type: "tambon",
        poi_score: 10,
        address: {
            tambon: {
                code: "140105",
                th: "ป่าแดด",
                en: "Pa Daet"
            },
            amphoe: {
                code: "1401",
                th: "เมืองเชียงใหม่",
                en: "Mueang Chiang Mai"
            },
            province: {
                code: "14",
                th: "เชียงใหม่",
                en: "Chiang Mai"
            }
        }
    }
}
```
#### Request `full`

> URL : `https://api.mapmagic.co.th/v2/reverse-geocoding?response_type=full&lat=18.760694&lng=98.971197&api_key=${your_api_key}&app_id=${your_app_id}`

#### Responses

```
{
    area: {
        centroid: {
            lat: 18.7450866577476,
            lng: 98.9791069030708
        },
        data_id: "5b988fd80de0d9644c8c2203",
        label: {
            th: "ตำบลป่าแดด อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่",
            en: "Tambon Pa Daet, Amphoe Mueang Chiang Mai, Changwat Chiang Mai"
        },
        type: "tambon",
        poi_score: 10,
        address: {
            tambon: {
                code: "140105",
                th: "ป่าแดด",
                en: "Pa Daet"
            },
            amphoe: {
                code: "1401",
                th: "เมืองเชียงใหม่",
                en: "Mueang Chiang Mai"
            },
            province: {
                code: "14",
                th: "เชียงใหม่",
                en: "Chiang Mai"
            }
        }
    },
    "street": {
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
    },
    "nearbyPOI": [
        {
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
    ]
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