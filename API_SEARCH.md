## API สำหรับการค้นหาสถานที่
`https://api.mapmagic.co.th/search/:place`

| Property | Description | Type | Allowed Values | Default Value |
|----------|-------------|------|-------------| ------- |
| place | ชื่อของสถานที่ที่ต้องการค้นหา | params | String | - |
| page | ตำแหน่งหน้าที่จะแสดง | query | Number | 1 |
| limit | จำกัดข้อมูลที่จะแสดงในแต่ละหน้า | query | Number | 10 |
| lat | ตำแหน่ง latitude ของจุดที่สนใจในแผนที่ | query | Number | unused |
| lng | ตำแหน่ง longitude ของจุดที่สนใจในแผนที่ | query | Number | unused |
| z | ระยะการซูมบนแผนที่ เพื่อใช้ในการคำนวณรัศมีของจุดสนใจ | query | Number (10-16) | 15 |

*type query ทั้งหมดเป็น optional*

### Properties ที่มีผลต่อการค้นหา
1. การกำหนดค่า lat, lng, z จะเป็นการค้นหาโดยคำนวณจากระยะทางที่ใกล้กับจุดสนใจก่อน

2. ถ้าหากไม่กำหนด lat, lng จะเป็นการค้นหาจากข้อมูลทั้งหมดที่มีโดยตรง

3. ค่า z(zoom) ที่มีผลต่อการคำนวณอยู่ในช่วง 10-16 เท่านั้น(และต้องกำหนดค่า lat, lng ด้วย) ถ้าใส่ค่าต่ำกว่าหรือสูงกว่า จะใช้ค่า 10 หรือ 16 ในการคำนวณแทน

### ตัวอย่างการใช้งาน
`https://api.mapmagic.co.th/search/โรงพยาบาล?page=1&limit=2&lat=18.7607&lng=98.9707`

ผลลัพธ์

```JSON
{
  "result": [
    {
      "amphoe": {
        "th": "อำเภอเมืองเชียงใหม่"
      },
      "score": 6,
      "coordinate": {
        "lon": 98.9720924957009,
        "lat": 18.760683142668
      },
      "province": {
        "th": "จังหวัดเชียงใหม่"
      },
      "data_id": "5afbe95e9519f2cd96037ca4",
      "name": {
        "th": "โรงพยาบาลเชียงใหม่ใกล้หมอ",
        "en": "Chiang Mai Klaimo Hospital"
      },
      "short_name": {
        "th": "รพ.เชียงใหม่ใกล้หมอ",
        "en": "Chiang Mai Klaimo Hospital"
      },
      "telephone": "",
      "type": "landmark",
      "tambon": {
        "th": "ตำบลป่าแดด"
      }
    },
    {
      "amphoe": {
        "th": "อำเภอเมืองเชียงใหม่"
      },
      "score": 8,
      "coordinate": {
        "lon": 98.9741474662705,
        "lat": 18.789686036711
      },
      "province": {
        "th": "จังหวัดเชียงใหม่"
      },
      "data_id": "5afbe86d9519f2cd96006515",
      "name": {
        "th": "โรงพยาบาลมหาราชนครเชียงใหม่",
        "en": "Maharaj Nakhorn Chiang Mai Hospital"
      },
      "short_name": {
        "th": "รพ.มหาราชนครเชียงใหม่",
        "en": "Maharaj Nakhorn Chiang Mai Hospital"
      },
      "telephone": "",
      "type": "landmark",
      "tambon": {
        "th": "ตำบลศรีภูมิ"
      }
    }
  ],
  "total": 9685
}
```