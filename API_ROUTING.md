# Routing
การค้นหาเส้นทางโดยอ้างอิงจากตำแหน่งเริ่มต้นและจุดหมายปลายทาง
> **GET** `https://api.mapmagic.co.th/v1/masstransit/route`

### Query
| ชื่อ | รายละเอียด |
|----|-----------|
| src | จุดเริ่มต้นของเส้นทาง โดยสามารถใช้ได้ทั้ง Node ID และค่า Latitude, Longtitude |
| dst | จุดเริ่มต้นของเส้นทาง โดยสามารถใช้ได้ทั้ง Node ID และค่า Latitude, Longtitude |
| filter | array parameter สำหรับเลือกประเภทการเดินทาง (optional) <br> 1 = รถไฟฟ้า <br> 2 = รถเมล์ <br> 3 = เรือ <br> 4 = รถไฟ <br> 5 = รถด่วนพิเศษบีอาร์ที |
| app_id | application ID ที่ได้จากการ register บน [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) ใช้ในการ authentication |
| api_key | api key ที่ได้จากการ register บน [MapMagic platform](https://developers.mapmagic.co.th/auth/signin) ใช้ในการ authentication |


### Response
| ชื่อ | รายละเอียด |
|----|-----------|
| code | success = 200, error code |
| data | ข้อมู, Routing แบบต่างๆ |
| id | route id |
| type |ประเภทของ Routing <br> 1 = เส้นทางที่เปลี่ยนสายน้อยสุด <br> 3 = เส้นทางที่ใช้เวลาเดินทางน้อยสุด <br> 4 = เส้นทางที่ค่าโดยสารถูกที่สุด |
| distance | ระยะทางรวมของการเดินทาง (เมตร) |
| time | ระยะเวลารวมของการเดินทาง (วินาที) |
| route | ข้อมูล edge ของ Routing |
| &nbsp;&nbsp;&nbsp;&nbsp;seq | ลำดับการเดินทางของ (edge, node) |
| &nbsp;&nbsp;&nbsp;&nbsp;tn_type | ประเภทของ edge <br> 0 = ทางเชื่อมระหว่าง edge ประเภทต่างๆ <br> 1 = รถไฟฟ้า <br> 2 = รถเมล์ <br> 3 = เรือ <br> 4 = รถไฟ <br> 5 = รถด่วนพิเศษบีอาร์ที |
| &nbsp;&nbsp;&nbsp;&nbsp;time | ระยะของ edge (วินาที) |
| &nbsp;&nbsp;&nbsp;&nbsp;distance | ระยะทางของ edge (เมตร) |
| &nbsp;&nbsp;&nbsp;&nbsp;tn_id | geometry id ของ edge <br> "10001" = edge ของการเปลี่ยนเส้นทาง(ขึ้น)เช่น การขึ้นรถเมล์สายใหม่ เป็นต้น <br> "10002" = edge ของการเปลี่ยนเส้นทาง(ลง)เช่น การลงจากรถเมล์ เป็นต้น <br> "20001" = edge ของการเดินด้วยเท้า <br> "อื่นๆ" = edge id ของ MapMagic |
| waypoint | ข้อมูล node ของ Routing เช่น จุดการเปลี่ยนสายรถเมล์ เป็นต้น |
| &nbsp;&nbsp;&nbsp;&nbsp;seq | ลำดับการเดินทางของ (edge, node) |
| &nbsp;&nbsp;&nbsp;&nbsp;node_id | node id |
| &nbsp;&nbsp;&nbsp;&nbsp;nameth | ชื่อภาษาไทยของ node |
| &nbsp;&nbsp;&nbsp;&nbsp;nameen | 	ชื่อภาษาอังกฤษของ node |
| &nbsp;&nbsp;&nbsp;&nbsp;geom | geometry ของ node (geojson) |

## ตัวอย่าง

ค้นหาเส้นทางโดยใช้จุดเริ่มต้นเป็น Node ID และปลายทางเป็น Node ID
##### Request
> **URL:** https://api.mapmagic.co.th/v1/masstransit/route?src=11515&dst=2328

##### Response
```json
{
  "code":200,
  "data":[
    {
      "id":2,
      "type":3,
      "distance":17784.136680056432,
      "time":4224.5548988282035,
      "price":61,
      "route":[
        {
          "seq":1,
          "time":600,
          "distance":5.12929303680556,
          "tn_type":2,
          "tn_id":"10002",
          "edge_id":"2427320",
          "nameth":"รถเมล์สาย 14",
          "nameen":"Bus No 14",
          "geom":"{\"type\":\"LineString\",\"coordinates\":[[100.544787020138,13.7280620927252],[100.544741762543,13.7280704977612]]}"
        },
        {
          "seq":3,
          "time":215.177123074908,
          "distance":279.730249736935,
          "tn_type":0,
          "tn_id":"20001",
          "edge_id":"2520790",
          "nameth":"เดินจาก สวนลุมไนท์บาร์ซ่าร์ - สถานีรถไฟฟ้าใต้ดิน สถานีลุมพินี",
          "nameen":"Walk : Suanlum Night Barzar - สถานีรถไฟฟ้าใต้ดิน สถานีลุมพินี",
          "geom":"{\"type\":\"LineString\",\"coordinates\":[[100.544741762543,13.7280704977612],[100.545675,13.725804]]}"
        },
        ...
      ],
      "waypoint":[
        {
          "seq":2,
          "node_id":"11563",
          "tn_type":2,
          "nameth":"สวนลุมไนท์บาร์ซ่าร์",
          "nameen":"Suanlum Night Barzar",
          "geom":"{\"type\":\"Point\",\"coordinates\":[100.544741762543,13.7280704977612]}"
        },
        {
          "seq":4,
          "node_id":"637",
          "tn_type":1,
          "nameth":"สถานีรถไฟฟ้าใต้ดิน สถานีลุมพินี",
          "nameen":"สถานีรถไฟฟ้าใต้ดิน สถานีลุมพินี",
          "geom":"{\"type\":\"Point\",\"coordinates\":[100.545675,13.725804]}"
        },
        ...
      ]
    },
    ...
  ]
}
```

> **URL:** https://api.mapmagic.co.th/v1/masstransit/route?src=13.727151,100.531407&dst=1962

ค้นหาเส้นทางโดยใช้จุดเริ่มต้นเป็น Latitude, Longtitude และปลายทางเป็น Node ID

```json
{
  "code":200,
  "data":[
    {
      "id":2,
      "type":3,
      "distance":28612.82035721669,
      "time":4240.255643791475,
      "price":85,
      "route":[
        {
          "seq":2,
          "time":273.8577637387383,
          "distance":356.0150928603598,
          "tn_type":0,
          "tn_id":"20001",
          "edge_id":"2515757",
          "nameth":"เดินจาก 13.727151,100.531407 ไป สถานีรถไฟฟ้าบีทีเอสศาลาแดง",
          "nameen":"Walk : $13.727151,100.531407 to สถานีรถไฟฟ้าบีทีเอสศาลาแดง",
          "geom":"{\"type\":\"LineString\",\"coordinates\":[[100.531407,13.727151],[100.534365682209,13.7285617330323]]}"
        },
        {
          "seq":4,
          "time":60,
          "distance":0.721636268594103,
          "tn_type":1,
          "tn_id":"10001",
          "edge_id":"2401588",
          "nameth":"รถไฟฟ้า BTS สายสีลม",
          "nameen":"BTS Skytrain Silom Line",
          "geom":"{\"type\":\"LineString\",\"coordinates\":[[100.534365682209,13.7285617330323],[100.53436342234,13.7285676353598]]}"
        },
        ...
      ],
      "waypoint":[
        {
          "seq":1,
          "node_id":"-1",
          "tn_type":0,
          "nameth":"13.727151,100.531407",
          "nameen":"13.727151,100.531407",
          "geom":"{\"type\":\"Point\",\"coordinates\":[100.531407,13.727151]}"
        },
        {
          "seq":3,
          "node_id":"85",
          "tn_type":1,
          "nameth":"สถานีรถไฟฟ้าบีทีเอสศาลาแดง",
          "nameen":"สถานีรถไฟฟ้าบีทีเอสศาลาแดง",
          "geom":"{\"type\":\"Point\",\"coordinates\":[100.534365682209,13.7285617330323]}"
        },
        ...
      ]
    },
    ...
  ]
}
```

> **URL:** https://api.mapmagic.co.th/v1/masstransit/route?src=13.727151,100.531407&dst=13.796254,100.520507

ค้นหาเส้นทางโดยใช้จุดเริ่มต้นเป็น Latitude, Longtitude และปลายทางเป็น Latitude, Longtitude 

```json
{
  "code":200,
  "data":[
    {
      "id":2,
      "type":3,
      "distance":13104.61168086004,
      "time":3898.7857430615627,
      "price":50.5,
      "route":[
        {
          "seq":2,
          "time":273.8577637387383,
          "distance":356.0150928603598,
          "tn_type":0,
          "tn_id":"20001",
          "edge_id":"2515757",
          "nameth":"เดินจาก 13.727151,100.531407 ไป สถานีรถไฟฟ้าบีทีเอสศาลาแดง",
          "nameen":"Walk : $13.727151,100.531407 to สถานีรถไฟฟ้าบีทีเอสศาลาแดง",
          "geom":"{\"type\":\"LineString\",\"coordinates\":[[100.531407,13.727151],[100.534365682209,13.7285617330323]]}"
        },
        {
          "seq":4,
          "time":60,
          "distance":0.721636268594103,
          "tn_type":1,
          "tn_id":"10001",
          "edge_id":"2401588",
          "nameth":"รถไฟฟ้า BTS สายสีลม",
          "nameen":"BTS Skytrain Silom Line",
          "geom":"{\"type\":\"LineString\",\"coordinates\":[[100.534365682209,13.7285617330323],[100.53436342234,13.7285676353598]]}"
        },
        ...
      ],
      "waypoint":[
        {
          "seq":1,
          "node_id":"-1",
          "tn_type":0,
          "nameth":"13.727151,100.531407",
          "nameen":"13.727151,100.531407",
          "geom":"{\"type\":\"Point\",\"coordinates\":[100.531407,13.727151]}"
        },
        {
          "seq":3,
          "node_id":"85",
          "tn_type":1,
          "nameth":"สถานีรถไฟฟ้าบีทีเอสศาลาแดง",
          "nameen":"สถานีรถไฟฟ้าบีทีเอสศาลาแดง",
          "geom":"{\"type\":\"Point\",\"coordinates\":[100.534365682209,13.7285617330323]}"
        },
        ...
      ]
    },
    ...
  ]
}
```