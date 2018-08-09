## API Document

* [Reverse Geocoding](#reverse-geocoding)

---

## Reverse Geocoding

Search by coordinate (lat, lng)

> **GET** `https://api.mapmagic.co.th/v1/reverse-geocoding`

### Query String
| Property | Description | Type |
|----------|-------------|------|
| lat | Latitude of interested coordinate. | number |
| lng | Longitude of interested coordinate. | number |
| app_id | [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) application ID that use for authentication. | string | - |
| api_key | [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) API key that use for authentication. | string | - |

### Responses
| Property | Description | Type |
|----------|-------------|------|
| response | Response that consist of currentLocation, currentStreet, nearbyPOI | object |
| &nbsp;&nbsp;&nbsp;&nbsp;currentLocation | Current location of marker location. | object[] |
| &nbsp;&nbsp;&nbsp;&nbsp;currentStreet | Current street of marker location. | object[] |
| &nbsp;&nbsp;&nbsp;&nbsp;nearbyPOI | Points of interest sorted by distance to marker location. | object[] |

### Example
#### Request

> URL : `https://api.mapmagic.co.th/v1/reverse-geocoding?lat=18.760694&lng=98.971197&api_key=${your_api_key}&app_id=${your_app_id}`

#### Responses

```
{
    "response": {
        "currentLocation": [
            {
                "coordinate": {
                    "lat": 18.8150305712266,
                    "lng": 99.0095841527645
                },
                "data_id": "5b6198de0579f491c6f93648",
                "name": {
                    "th": "ต.ฟ้าฮ่าม",
                    "en": "Tambon Fa Ham"
                },
                "type": "tambon",
                "poi_score": 10,
                "address": {
                    "tambon": {
                        "th": "ต.ฟ้าฮ่าม",
                        "en": "Tambon Fa Ham"
                    },
                    "amphoe": {
                        "th": "อำเภอเมืองเชียงใหม่",
                        "en": "Amphoe Mueang Chiang Mai"
                    },
                    "province": {
                        "th": "จังหวัดเชียงใหม่",
                        "en": "Changwat Chiang Mai"
                    }
                }
            }
        ],
        "currentStreet": [
            {
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
            }
        ],
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
                        "th": "ตำบลฟ้าฮ่าม"
                    },
                    "amphoe": {
                        "th": "อำเภอเมืองเชียงใหม่"
                    },
                    "province": {
                        "th": "จังหวัดเชียงใหม่"
                    }
                }
            }
        ]
    }
}
```
---