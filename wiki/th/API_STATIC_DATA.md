# **Service Static Data API Document**
Service สำหรับดึงข้อมูล ภูมิภาค, จังหวัด, อำเภอ/เขต, ตำบล/แขวง, สถานศึกษา(ระดับวิทยาลัยและมหาวิทยาลัย), นิคมอุตสาหกรรม ในประเทศไทย

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
* [Industrial Estates](#industrial-estates)
    * [Get All Industrial Estates](#get-all-industrial-estates)
    * [Get Industrial Estates By `industrial_estate_code`](#get-industrial-estates-by-industrial_estate_code)
* [Educations](#education-places)
    * [Get All Education Places](#get-all-education-places)
    * [Get Education Place By `education_code`](#get-education-place-by-education_code)
* [Advance Optional Search](#advance-optional-search)
    * [Example](#example)

## Regions
ดึงข้อมูล ภูมิภาค ทั้งหมดของประเทศไทย **ไม่มีข้อมูล polygon และ centroid*
> **GET** `https://api.mapmagic.co.th/v1/static/regions`

#### Response Array Object
| Property | Description | Type |
|----------|-------------|------|
| name | ชื่อภูมิภาค | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อภูมิภาคภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อภูมิภาคภาษาอังกฤษ | String |
| code | รหัสของภูมิภาค | String |

#### Example Response

> **GET** `https://api.mapmagic.co.th/v1/static/regions?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY`


```
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
ดึงข้อมูล จังหวัด ทั้งหมดของประเทศไทย
> **GET** `https://api.mapmagic.co.th/v1/static/provinces`

#### Query Strings
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| region_code | รหัสภูมิภาค | String | "1", "2", "3", "4", "5" | - |

#### Response Array Object
| Property | Description | Type |
|----------|-------------|------|
| name | ชื่อจังหวัด | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อจังหวัดภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อจังหวัดภาษาอังกฤษ | String |
| code | รหัสของจังหวัด | String |
| region_code | รหัสของภูมิภาค | String |

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
ดึงข้อมูล จังหวัด จากรหัสของจังหวัด
> **GET** `https://api.mapmagic.co.th/v1/static/provinces/:provinces_code`

#### Params
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| province_code | รหัสของจังหวัด | String | "01" - "77" | - |

#### Response Object
| Property | Description | Type |
|----------|-------------|------|
| name | ชื่อจังหวัด | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อจังหวัดภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อจังหวัดภาษาอังกฤษ | String |
| code | รหัสของจังหวัด | String |
| region_code | รหัสของภูมิภาค | String |

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

ข้อมูลอำเภอ/เขตทั้งหมดในประเทศไทย

> **GET** `https://api.mapmagic.co.th/v1/static/districts`

#### Query Strings
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| province_code | รหัสจังหวัด | String | "01" - "77" | - |

#### Response Array Object
| Property | Description | Type |
|----------|-------------|------|
| name | ชื่อเขต/อำเภอ | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อเขต/อำเภอภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อเขต/อำเภอภาษาอังกฤษ | String |
| code | รหัสเขต/อำเภอ | String |
| province_code | รหัสจังหวัด | String |

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
กรองข้อมูลจากรหัสเขต/อำเภอ

> **GET** `https://api.mapmagic.co.th/v1/static/districts/:district_code`

#### Params
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| district_code | รหัสเขต/อำเภอ | String | "01" - "77" | - |

#### Response Object
| Property | Description | Type |
|----------|-------------|------|
| name | ชื่อเขต/อำเภอ | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อเขต/อำเภอภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อเขต/อำเภอภาษาอังกฤษ | String |
| code | รหัสเขต/อำเภอ | String |
| province_code | รหัสจังหวัด | String |

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
ดึงข้อมูล ตำบล/แขวง ทั้งหมดของประเทศไทย
> **GET** `https://api.mapmagic.co.th/v1/static/sub-districts`

#### Query Strings
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| province_code | รหัสของจังหวัด | String | "01" - "77" | - |
| district_code | รหัสของอำเภอ/เขต | String | "0101" - "77xx" | - |

#### Response Array Object
| Property | Description | Type |
|----------|-------------|------|
| name | ชื่อตำบล/แขวง | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อชื่อตำบล/แขวงภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อชื่อตำบล/แขวงภาษาอังกฤษ | String |
| code | รหัสของตำบล/แขวง | String |
| province_code | รหัสจังหวัด | String |
| district_code | รหัสอำเภอ/เขต | String |

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
กรองข้อมูลจากรหัสของ แขวง/ตำบล
> **GET** `https://api.mapmagic.co.th/v1/static/sub-districts/:sub_district_code`

#### Params
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| sub_district_code | รหัสแขวง/ตำบล | String | "010101" - "77xxxx" | - |

#### Response Object
| Property | Description | Type |
|----------|-------------|------|
| name | ชื่อตำบล/แขวง | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อตำบล/แขวงภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อตำบล/แขวงภาษาอังกฤษ | String |
| code | รหัสของตำบล/แขวง | String |
| province_code | รหัสของจังหวัด | String |
| district_code | รหัสของอำเภอ/เขต | String |

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

### Get Sub District by `sub_district_code`
กรองข้อมูลจากรหัสของ แขวง/ตำบล
> **GET** `https://api.mapmagic.co.th/v1/static/sub-districts/:sub_district_code`

#### Params
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| sub_district_code | รหัสแขวง/ตำบล | String | "010101" - "77xxxx" | - |

#### Response Object
| Property | Description | Type |
|----------|-------------|------|
| name | ชื่อตำบล/แขวง | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อตำบล/แขวงภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อตำบล/แขวงภาษาอังกฤษ | String |
| code | รหัสของตำบล/แขวง | String |
| province_code | รหัสของจังหวัด | String |
| district_code | รหัสของอำเภอ/เขต | String |

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

## Education Places
### Get All Education Places
ดึงข้อมูล สถานศึกษาระดับวิทยาลัยและมหาวิทยาลัย ทั้งหมดของประเทศไทย
> **GET** `https://api.mapmagic.co.th/v1/static/educations

#### Query Strings
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| province_code | รหัสของจังหวัด | String | "01" - "77" | - |
| category | ประเภทของสถานศึกษา | String | "university", "college" | - |

#### Response Array Object
| Property | Description | Type |
|----------|-------------|------|
| name | ชื่อของสถานศึกษา | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อภาษาอังกฤษ | String |
| label | ชื่อย่อของสถานศึกษา | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อย่อภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อย่อภาษาอังกฤษ | String |
| id | รหัสของสถานศึกษา | String |
| province_code | รหัสของจังหวัด | String |
| district_code | รหัสของอำเภอ/เขต | String |
| sub_district_code | รหัสของตำบล/แขวง | String |

#### Example Response
> **GET** `https://api.mapmagic.co.thv1/static/educations?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY`

```
[
    {
        "name": {
            "th": "มหาวิทยาลัยธรรมศาสตร์ ศูนย์ลำปาง",
            "en": "Thammasat University Lampang Campus"
        },
        "label": {
            "th": "ม.ธรรมศาสตร์",
            "en": "Thammasat University"
        },
        "id": "1000237",
        "province_code": "52",
        "district_code": "5213",
        "sub_district_code": "521301",
        "category": "University"
    },
    {
        "name": {
            "th": "วิทยาลัยสารพัดช่างน่าน",
            "en": "Nan Polytechnic College"
        },
        "label": {
            "th": "วิทยาลัยสารพัดช่างน่าน",
            "en": "Nan Polytechnic College"
        },
        "id": "1000239",
        "province_code": "26",
        "district_code": "2601",
        "sub_district_code": "260106",
        "category": "College"
    },
    ...
]
```

### Get Education Place by `education_code`
ดึงข้อมูล สถานศึกษาระดับวิทยาลัยและมหาวิทยาลัย ในประเทศไทย จาก `education_code`
> **GET** `https://api.mapmagic.co.th/v1/static/educations/:education_code`

#### Params
| Property | Description | Type |
|----------|-------------|------|
| education_code | รหัสของสถานศึกษา | String |

#### Response Object
| Property | Description | Type |
|----------|-------------|------|
| name | ชื่อของสถานศึกษา | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อภาษาอังกฤษ | String |
| label | ชื่อย่อของสถานศึกษา | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อย่อภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อย่อภาษาอังกฤษ | String |
| id | รหัสของสถานศึกษา | String |
| province_code | รหัสของจังหวัด | String |
| district_code | รหัสของอำเภอ/เขต | String |
| sub_district_code | รหัสของตำบล/แขวง | String |

#### Example Response
> **GET** `https://api.mapmagic.co.th/v1/static/educations/1000237?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY`

```
{
    "name": {
        "th": "มหาวิทยาลัยธรรมศาสตร์ ศูนย์ลำปาง",
        "en": "Thammasat University Lampang Campus"
    },
    "label": {
        "th": "ม.ธรรมศาสตร์",
        "en": "Thammasat University"
    },
    "id": "1000237",
    "province_code": "52",
    "district_code": "5213",
    "sub_district_code": "521301",
    "category": "University"
}
```

-----

## Industrial Estates
### Get All Industrial-Estates
ดึงข้อมูล นิคมอุตสาหกรรม ทั้งหมดของประเทศไทย
> **GET** `https://api.mapmagic.co.th/v1/static/industrial-estates`

#### Query Strings
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| province_code | รหัสของจังหวัด | String | "01" - "77" | - |

#### Response Array Object
| Property | Description | Type |
|----------|-------------|------|
| id | รหัสของ นิคมอุตสาหกรรม | String |
| name | ชื่อ นิคมอุตสาหกรรม | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อภาษาอังกฤษ | String |
| label | ชื่อย่อ นิคมอุตสาหกรรม | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อย่อภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อย่อภาษาอังกฤษ | String |
| sub_district_code | รหัสของ ตำบล/แขวง | String |
| district_code | รหัสของ อำเภอ/เขต | String |
| province_code | รหัสของจังหวัด | String |

#### Example Response
> **GET** `https://api.mapmagic.co.th/v1/static/industrial-estates?province_code=01&app_id=YOUR_APP_ID&api_key=YOUR_API_KEY`

```
[
    {
        name: {
            th: "นิคมอุตสาหกรรมบางชัน",
            en: "Bang Chan Industrial Estate"
        },
        label: {
            th: "นิคมอุตสาหกรรมบางชัน",
            en: "Bang Chan Industrial Estate"
        },
        province_code: "01",
        district_code: "0134",
        sub_district_code: "013401",
        id: "1139315"
    },
    {
        name: {
            th: "นิคมอุตสาหกรรมลาดกระบัง",
            en: "Lat Krabang Industrial Estate"
        },
        label: {
            th: "นิคมอุตสาหกรรมลาดกระบัง",
            en: "Lat Krabang Industrial Estate"
        },
        province_code: "01",
        district_code: "0138",
        sub_district_code: "013806",
        id: "1142280"
    },
    ...
]
```

### Get Industrial Estates By `industrial_estate_code`
กรองข้อมูลจากรหัสของ นิคมอุตสาหกรรม
> **GET** `https://api.mapmagic.co.th/v1/static/industrial-estates/:industrial_estate_code`

#### Params
| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|----------------|---------------|
| industrial_estate_code | รหัสของนิคมอุตสาหกรรม | String | - | - |

#### Response Object
| Property | Description | Type |
|----------|-------------|------|
| id | รหัสของ นิคมอุตสาหกรรม | String |
| name | ชื่อ นิคมอุตสาหกรรม | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อภาษาอังกฤษ | String |
| label | ชื่อย่อ นิคมอุตสาหกรรม | Object |
| &nbsp;&nbsp;&nbsp;&nbsp;th | ชื่อย่อภาษาไทย | String |
| &nbsp;&nbsp;&nbsp;&nbsp;en | ชื่อย่อภาษาอังกฤษ | String |
| sub_district_code | รหัสของ ตำบล/แขวง | String |
| district_code | รหัสของ อำเภอ/เขต | String |
| province_code | รหัสของจังหวัด | String |

#### Example Response
> **GET** `https://api.mapmagic.co.th/v1/static/industrial-estates/1038703?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY`

```
{
    name: {
        th: "นิคมอุตสาหกรรมภาคเหนือ (ลำพูน)",
        en: "Northern Region Industrial Estate (Lamphun)"
    },
    label: {
        th: "นิคมอุตสาหกรรมภาคเหนือ (ลำพูน)",
        en: "Northern Region Industrial Estate (Lamphun)"
    },
    address: {
        sub_district: {
            name: "ตำบลเวียงยอง",
            code: "530109"
        },
        district: {
            name: "อำเภอเมืองลำพูน",
            code: "5301"
        },
        province: {
            name: "จังหวัดลำพูน",
            code: "53"
        }
    },
    id: "1038703"
}
```

-----

## Advanced Options
ตัวเลือกเพิ่มเติมสำหรับการรับข้อมูล

| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|--|----------------|---------------|
| centroid | แสดงจุดศูนย์กลางของพื้นที่ที่ค้นหา | boolean | true, false | false |
| polygon | แสดงข้อมูลเชิง Geometry ของจังหวัด อำเภอ ตำบล (ไม่รองรับ `Route educations`)| boolean | true, false | false |


### Example
#### 1. แสดง Centroid ใน Response
> **GET** `https://api.mapmagic.co.th/v1/static/provinces/01?app_id=YOUR_APP_ID&api_key=YOUR_API_KEY&centroid=true`

```
{
    "name": {
        "th": "กรุงเทพมหานคร",
        "en": "Bangkok"
    },
    "centroid": {
        lng: 100.620453270956,
        lat: 13.7676578582668
    },
    "code": "01",
    "region_code": "2"
}
```

#### 2. แสดง Polygon ใน Response
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