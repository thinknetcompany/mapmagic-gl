# **Service Static Data API Document**
Service for Region, Province, District, Sub-district datas in Thailand

## Features
* [Regions](#regions)
* [Provinces](#provinces)
    * [Get All Provinces](#get-all-provinces)
    * [Get Province By `province_code`](#get-province-by-province_code)
* [Districts](#districts)
    * [Get All Districts](#get-all-districts)
    * [Get District By `district_code`](#get-district-by-district_code)
* [Sub Districts](#sub-districts)
    * [Get All Sub Districts](#get-all-sub-districts)
    * [Get Sub District By `sub_district_code`](#get-sub-district-by-sub_district_code)
* [Advance Optional Search](#advance-optional-search)
    * [Example](#example)

## Regions
Request for all region in Thailand **Not contain polygon and centroid*
> **GET** `https://api.mapmagic.co.th/v1/static/regions`

#### Response Array Object
| Property | Description | Type |
|----------|-------------|------|
| name | Province name | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | Province name in Thai | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | Province name in English | String |
| code | Region code | String |

#### Example Response

> **GET** `https://api.mapmagic.co.th/v1/static/regions?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY`


```
GET https://api.mapmagic.co.th/v1/static/regions?
app_id=YOUR_APP_ID&api_key=YOUR_API_KEY

[
    {
        "name": {
            "th": "เหนือ",
            "en": "North"
        },
        "region_code": "1"
    },
    {
        "name": {
            "th": "กลาง",
            "en": "Central"
        },
        "region_code": "2"
    },
    ...
]
```

---

## Provinces
### Get All Provinces
Request for all province in Thailand
> **GET** `https://api.mapmagic.co.th/v1/static/provinces`

#### Query Strings
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| region_code | Region code | String | "1", "2", "3", "4", "5" | - |

#### Response Array Object
| Property | Description | Type |
|----------|-------------|------|
| name | Province name | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | Province name in Thai | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | Province name in English | String |
| code | Province code | String |
| region_code | Region code | String |

#### Example Response

> **GET** `https://api.mapmagic.co.th/v1/static/provinces?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY`

```
[
    {
        "name": {
            "th": "กรุงเทพมหานคร",
            "en": "Bangkok"
        },
        "province_code": "01",
        "region_code": "2"
    },
    {
        "name": {
            "th": "จังหวัดกระบี่",
            "en": "Changwat Krabi"
        },
        "province_code": "02",
        "region_code": "5"
    },
    {
        "name": {
            "th": "จังหวัดกาญจนบุรี",
            "en": "Changwat Kanchanaburi"
        },
        "province_code": "03",
        "region_code": "2"
    },
    ...
]
```

### Get Provinces by `province_code`
Request for spefific province by province code
> **GET** `https://api.mapmagic.co.th/v1/static/provinces/:provinces_code`

#### Params
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| province_code | Province code | String | "01" - "77" | - |

#### Response Object
| Property | Description | Type |
|----------|-------------|------|
| name | Province name | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | Province name in Thai | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | Province name in English | String |
| code | Province code | String |
| region_code | Region code | String |

#### Example Response
> **GET** `https://api.mapmagic.co.th/v1/static/provinces/01?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY`

```
{
    "name": {
        "th": "กรุงเทพมหานคร",
        "en": "Bangkok"
    },
    "province_code": "01",
    "region_code": "2"
}
```


-----

## Districts
### Get All Districts

Request for all district in Thailand

> **GET** `https://api.mapmagic.co.th/v1/static/districts`

#### Query Strings
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| province_code | Province code | String | "01" - "77" | - |

#### Response Array Object
| Property | Description | Type |
|----------|-------------|------|
| name | District name | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | District name tn Thai | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | District name tn English | String |
| code | District code | String |
| province_code | Province code | String |

#### Example Response
> **GET** `https://api.mapmagic.co.th/v1/static/districts?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY`

```
[
    {
        "name": {
            "th": "เขตคลองเตย",
            "en": "Khet Khlong Toei"
        },
        "code": "0101",
        "province_code": "01"
    },
    {
        "name": {
            "th": "เขตคลองสาน",
            "en": "Khet Khlong San"
        },
        "code": "0102",
        "province_code": "01"
    },
    ...
]
```

### Get District by `district_code`
Request for specific district by district code

> **GET** `https://api.mapmagic.co.th/v1/static/districts/:district_code`

#### Params
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| district_code | District code | String | - | - |

#### Response Object
| Property | Description | Type |
|----------|-------------|------|
| name | District name | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | District name in Thai | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | District name in English | String |
| code | District code | String |
| province_code | Province code | String |

#### Example Response
> **GET** `https://api.mapmagic.co.th/v1/static/districts/0116?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY`

```
{
    "name": {
        "th": "เขตบางกะปิ",
        "en": "Khet Bang Kapi"
    },
    "code": "0116",
    "province_code": "01"
}
```

-----

## Sub Districts
### Get All Sub-Districts
Request for all sub-district in Thailand
> **GET** `https://api.mapmagic.co.th/v1/static/sub-districts`

#### Query Strings
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| province_code | Province code | String | "01" - "77" | - |
| district_code | District code | String | "0101" - "77xx" | - |

#### Response Array Object
| Property | Description | Type |
|----------|-------------|------|
| name | Sub-district name | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | Sub-district name in Thai | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | Sub-district name in English | String |
| code | Sub-district code | String |
| province_code | Province code | String |
| district_code | District code | String |

#### Example Response
> **GET** `https://api.mapmagic.co.th/v1/static/sub-districts?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY`

```
[
    {
        "name": {
            "th": "แขวงคลองตัน",
            "en": "Khwaeng Khlong Tan"
        },
        "code": "010101",
        "district_code": "0101",
        "province_code": "01"
    },
    {
        "name": {
            "th": "แขวงคลองเตย",
            "en": "Khwaeng Khlong Toei"
        },
        "code": "010102",
        "district_code": "0101",
        "province_code": "01"
    },
    ...
]
```


### Get Sub District by `sub_district_code`
Request for specific district by district code

> **GET** `https://api.mapmagic.co.th/v1/static/sub-districts/:sub_district_code`

#### Params
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| sub_district_code | Sub-district code | String | "010101" - "77xxxx" | - |

#### Response Object
| Property | Description | Type |
|----------|-------------|------|
| name | Sub-district name | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | Sub-district name in Thai | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | Sub-district name in English | String |
| code | Sub-district code | String |
| province_code | Province code | String |
| district_code | District code | String |

#### Example Response
> **GET** `https://api.mapmagic.co.th/v1/static/sub-districts/010101?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY`

```
{
    "name": {
        "th": "แขวงคลองตัน",
        "en": "Khwaeng Khlong Tan"
    },
    "code": "010101",
    "district_code": "0101",
    "province_code": "01"
}
```

-----

## Advanced Options
Request option for additional data field

| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|--|----------------|---------------|
| centroid | Show centroid of searching area | boolean | true, false | false |
| polygon | Show geometric polygon of searching area | boolean | true, false | false |


### Example
#### 1. Include Centroid in Response
> **GET** `https://api.mapmagic.co.th/v1/static/provinces/01?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY&centroid=true`

```
{
    "name": {
        "th": "กรุงเทพมหานคร",
        "en": "Bangkok"
    },
    "centroid": [
        11201021.9348263,
        1547580.94437943
    ],
    "code": "01",
    "region_code": "2"
}
```

#### 2. Include Polygon in Response
> **GET** `https://api.mapmagic.co.th/v1/static/provinces/01?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY&polygon=true`

```
{
    "name": {
        "th": "กรุงเทพมหานคร",
        "en": "Bangkok"
    },
    "polygon": [
        [
            11199188.4986,
            1567874.7537
        ],
        ...
    ]
    "code": "01",
    "region_code": "2"
}
```