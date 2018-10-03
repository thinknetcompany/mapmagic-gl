# Routing
Find travel path by locate the start point and destination
> **GET** `https://api.mapmagic.co.th/v1/masstransit/route`

### Query
| Name | Description |
|----|-----------|
| src | Start point, Both of "Node ID" and "Latitude, Longitude" are available |
| dst | Destination point, Both of "Node ID" and "Latitude, Longitude" are available |
| filter | Array parameter to filter travel type (optional) <br> 1 = Transit <br> 2 = Bus <br> 3 = Boat <br> 4 = Train <br> 5 = BRT |


### Response
| Name | Description |
|----|-----------|
| code | success = 200, error code |
| data | Routing path in each type (Shortest path, Cheapest path, Fastest path) |
| id | route id |
| type | Routing Type <br> 1 = Least station change path <br> 3 = Fastest path <br> 4 = Cheapest path |
| distance | Travel distance (metres) |
| time | Travel time (seconds) |
| route | Routing path information |
| waypoint | Node information of each routing e.g. Bus exchange |

#### route
| Name | Description |
|----|-----------|
| seq | Routing sequences (edge, node) |
| tn_type | Type of eact edge <br> 0 = Link between edge <br> 1 = Mass transit <br> 2 = Bus <br> 3 = Boat <br> 4 = Train <br> 5 = BRT |
| time | Edge travel time (seconds) |
| distance | Edge distance (metres) |
| tn_id | Edge geometry ID <br> "10001" = Edge change (Get on) e.g. Get on the new bus line <br> "10002" = Edge change (Get off) e.g. Get off the current bus line <br> "20001" = Footpath edge <br> "อื่นๆ" = Another MapMagic edge ID |

#### waypoint
| Name | Description |
|----|-----------|
| seq | Waypoint sequences (edge, node) |
| node_id | node ID |
| nameth | Node in Thai name |
| nameen | Node in English name |
| geom | Node's geometry (geojson) |

## Examples

Find the route by start with node ID and set destination as node ID
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

Find the route by start with Latitude, Longitude and set destination as node ID

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

Find the route by start with Latitude, Longitude and set destination as Latitude, Longitude

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
