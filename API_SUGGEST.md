## API สำหรับการแนะนำชื่อสถานที่
`https://api.mapmagic.co.th/suggest/:place`

| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|-------------| ------- |
| place | ชื่อของสถานที่ที่ต้องการค้นหา | params | String | - |

*จำกัดผลลัพธ์มากที่สุด 5 สถานที่*

### ตัวอย่างการใช้งาน
`https://api.mapmagic.co.th/suggest/ปรินส์รอยแยลส์`

ผลลัพธ์

```JSON
[
  {
    "amphoe": {
      "th": "อำเภอเมืองเชียงใหม่"
    },
    "score": 4,
    "coordinate": {
      "lon": 99.0064818220904,
      "lat": 18.7969584951845
    },
    "province": {
      "th": "จังหวัดเชียงใหม่"
    },
    "data_id": "5afbe8749519f2cd9600d6c5",
    "name": {
      "th": "โรงเรียนปรินส์รอยแยลส์วิทยาลัย",
      "en": "The Prince Royal's College"
    },
    "short_name": {
      "th": "รร.ปรินส์รอยแยลส์วิทยาลัย",
      "en": "The Prince Royal's College"
    },
    "telephone": "",
    "type": "landmark",
    "tambon": {
      "th": "ตำบลวัดเกต"
    }
  }
]
```