![](/static/image/logo_mapmagic.png)

# MapMagic GL

**Map GL Library** สำหรับการใช้งานแผนที่ดิจิตอลบนเว็บไซต์ด้วย Javascript 
มีฟังก์ชันรองรับการแสดงผล และ Interaction บนแผนที่ พร้อมกับ Map Style ที่มีให้เลือกใช้กว่า 10 แบบ

**Official Site** : https://www.mapmagic.co.th

**For Developers** : https://developers.mapmagic.co.th
สำหรับจัดการ API Key และรับสิทธิ์การเข้าถึง MapMagic บน Application ของคุณ

**ดูตัวอย่างเพิ่มเติมได้ที่**: [DEMO](https://maps.mapmagic.co.th)


## :mega: Upcoming Releases
- [ ] แก้ไขรูปทรงของ line และ polygon ได้

## :pushpin: Release Notes 1.1.1
- [x] แก้ปัญหาเวลาใช้ Style URL แล้วไม่สามารถลบ apiKey และ appId ออกได้
- [x] แก้ปัญหาที่ใช้ Option style ตอน init แล้ว error
- [x] เพิ่มรูปแบบการใช้คีย์ใน Options คือ apiKey, appId, styleURL

## :clipboard: Features
* [แสดงแผนที่บนเว็ปไซต์](#%3Aelectric_plug%3A-%E0%B9%80%E0%B8%A3%E0%B8%B4%E0%B9%88%E0%B8%A1%E0%B9%83%E0%B8%8A%E0%B9%89%E0%B8%87%E0%B8%B2%E0%B8%99-mapmagic-api)
* [การกำหนดการแสดงภาษาบนแผนที่](MAPSTYLE.md#%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%81%E0%B8%B3%E0%B8%AB%E0%B8%99%E0%B8%94%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%81%E0%B8%AA%E0%B8%94%E0%B8%87%E0%B8%A0%E0%B8%B2%E0%B8%A9%E0%B8%B2%E0%B8%9A%E0%B8%99%E0%B9%81%E0%B8%9C%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88)
* [Map Style](#map-style)
  * [เปลี่ยน Map Style](#%E0%B9%80%E0%B8%9B%E0%B8%A5%E0%B8%B5%E0%B9%88%E0%B8%A2%E0%B8%99-map-style)
* [Scroll protection](#protected-scrolling)
* [Marker](#marker)
  * [เพิ่ม Marker](#%E0%B9%80%E0%B8%9E%E0%B8%B4%E0%B9%88%E0%B8%A1-marker-%E0%B8%A5%E0%B8%87%E0%B8%9A%E0%B8%99%E0%B9%81%E0%B8%9C%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88)
  * [ปรับแต่ง Marker](#icon-marker)
  * [เพิ่ม Popup บน Marker](#%E0%B9%80%E0%B8%9E%E0%B8%B4%E0%B9%88%E0%B8%A1-popup-%E0%B8%A5%E0%B8%87%E0%B9%83%E0%B8%99-marker)
  * [เปลี่ยนตำแหน่ง Marker](#mapsetmarkeroptions-%E0%B8%9B%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%95%E0%B8%B3%E0%B9%81%E0%B8%AB%E0%B8%99%E0%B9%88%E0%B8%87-marker)
  * [Marker แบบลากวาง](#draggable-marker)
  * [Image Marker](#map.addMarkerImage%28options%29-%E0%B9%80%E0%B8%9E%E0%B8%B4%E0%B9%88%E0%B8%A1-Marker-%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B8%A0%E0%B8%B2%E0%B8%9E)
* [Geometry](#Geometry)
  * [Line](#map.addLine%28options%29-%E0%B8%A7%E0%B8%B2%E0%B8%94%E0%B9%80%E0%B8%AA%E0%B9%89%E0%B8%99%E0%B8%A5%E0%B8%87%E0%B9%81%E0%B8%9C%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88)
  * [Polygon](#map.addPolygon%28options%29-%E0%B8%A7%E0%B8%B2%E0%B8%94-Polygon)


## :inbox_tray: ติดตั้ง MapMagic GL
#### ติดตั้งผ่าน NPM

ติดตั่ง dependencies

```shell
$ npm install mapmagic-gl --save
```

จากนั้น `import mapmagic-gl` เข้าสู่โปรเจค

```javascript
const MapmagicGL = require('mapmagic-gl')
require('node_modules/mapmagic-gl/dist/mapmagic-gl.css')
```
---

#### หรือดาวน์โหลดจาก MapMagic Server สำหรับใช้บน HTML

```html
<script src='https://libs.mapmagic.co.th/mapmagic-gl/1.1.1/js/mapmagic-gl.js'></script>
<link href='https://libs.mapmagic.co.th/mapmagic-gl/1.1.1/css/mapmagic-gl.css' rel='stylesheet' />
```


## :electric_plug: เริ่มใช้งาน MapMagic API
### เริ่มต้นสร้างแผนที่

สร้าง div สำหรับเป็นพื้นที่ให้ render map ลงบนหน้าเว็ป และก่อนที่จะใช้ MapMagic คุณต้องทำการสร้าง `app_id` และ `api_key` จาก [MapMagic Platform](https://developers.mapmagic.co.th)
เพื่อนำมาใช้งานกับแผนที่ของคุณ

```html
<html>
  <head>
    <script src='https://libs.mapmagic.co.th/mapmagic-gl/1.1.1/js/mapmagic-gl.js'></script>
    <link href='https://libs.mapmagic.co.th/mapmagic-gl/1.1.1/css/mapmagic-gl.css' rel='stylesheet' />
  </head>
  <body>
    <div id="map" style="height: 100vh;" />
    <script>
      const map = new mapmagic.Map({
        container: 'map', // id ของ div ที่จะให้ map ไป render
        app_id: 'YOUR_APP_ID',
        api_key: 'YOUR_APP_ID',
      })
    </script>
  </body>
</html>
```

ชื่อของ container จะต้องตรงกับ id ของ div ที่ใช้แสดงแผนที่ และคุณก็สามารถใช้ชื่อ container อื่นๆได้เช่นกัน
### MapMagic initial options
| Property | Description | Type | Default |
|----------|-------------|------|---------|
| container | id ของ container ที่จะใช้ render map | string | map |
| app_id | Application ID ของคุณ | string | - |
| api_key | API Key ของคุณ | string | - |
| center | จุดเริ่มต้นของแผนที่ | object | { lng: 100.49, lat: 13.72 } |
| zoom | ระดับการซูมขณะเริ่มแผนที่ จะต้องอยู่ระหว่าง 1 - 22 | integer | 9 |
| navigationCtrl | แสดงแถบปรับมุมมองของแผนที่ | boolean | false |
| protectScroll | ป้องกันการเลื่อนโดนแผนที่ | boolean | false |

การเรียกใช้ฟังก์ชันแผนที่ ทุกฟังก์ชันจะต้องเรียกหลังจากที่แผนที่ load เสร็จแล้ว ด้วยการเรียกฟังก์ชันใน `map.on('load', function...)` ดังนี้
```javascript
map.on('load', function() {
  ...
})
```

### Map style
#### รายชื่อ Map Style
- [Almond](MAPSTYLE.md###almond)
- [Cha thai](MAPSTYLE.md###cha-thai)
- [Charcoal](MAPSTYLE.md###charcoal)
- [Cloudy](MAPSTYLE.md###cloudy)
- [Hybrid](MAPSTYLE.md###hybrid)
- [Ivory](MAPSTYLE.md###ivory)
- [Lightsteel](MAPSTYLE.md###lightsteel)
- [Midnight](MAPSTYLE.md###midnight)
- [Satellite](MAPSTYLE.md###satellite)
- [Spearmint](MAPSTYLE.md###spearmint)
- [Terrain](MAPSTYLE.md###terrain)

![map style satellite](/static/image/map-style/satellite.png)

#### เปลี่ยน Map Style
สามารถเปลี่ยน Map Style ได้ 2 ทาง คือ

##### ผ่านทาง Initial map

```javascript
const map = new mapmagic.Map({
  container: 'map', // div's id for render map
  app_id: 'YOUR_APP_ID',
  api_key: 'YOUR_APP_ID',
  style: 'MAP_STYLE'
})
```

##### ผ่านทางฟังก์ชั่น `setStyle`

```javascript
map.setStyle('satellite')
```
---

#### Protected Scrolling

![protected scrolling](/static/image/protected-scroll.png)

```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  protectScroll: true,
});
```
---

### Marker
#### map.addMarker(options)
| Property | Description | Type | Default |
|--|--|--|--|
| id | ระบุ id ให้แต่ละ marker ( ห้ามซ้ำเด็ดขาด ) | string | (Random ID) |
| lat | latitude ของ Marker | number | - |
| lng | longtitude ของ Marker | number | - |
| offset | ระยะห่างของ icon กับพิกัดของ Marker | number[] | [0, 0] |
| onClick | event ที่จะเกิดขึ้นเมื่อผู้ใช้ click | function | - |
| icon | เปลี่ยน icon | string | - |
| draggable | ทำให้ Marker สามารถลากวางได้ | boolean | false |
| onDragEnd | event ที่จะเกิดขึ้นเมื่อผู้ใช้ drag เสร็จสิ้น | function | - |
| popup | แสดง [Popup](#map.addMarker(options)-กับ-Popup) บน Marker | object | - |

###### เพิ่ม Marker ลงบนแผนที่

![simple marker](/static/image/marker.png)

```javascript
map.on('load', function() {
  map.addMarker({
    id: 'bangbon',
    lat: 13.72,
    lng: 100.49,
    offset: [0, -10],
    onClick: function() {
        alert('รถรับส่ง 6 ล้อ บางบอน')
    }
  })
})
```

###### Icon Marker
![styled marker](/static/image/custom-marker.png)

```javascript
map.on('load', function() {
  map.addMarker({
    id: 'bangbon',
    lat: 13.72,
    lng: 100.49,
    icon: 'mmg_car_2_orange',
  })
})
```

###### Draggable Marker
![draggable marker](/static/image/draggable-marker.gif)

```javascript
map.on('load', function() {
  map.addMarker({
    id: 'bangbon',
    lat: 13.50,
    lng: 100.49,
    draggable: true,
    onClick: function(e) {
      const {lng, lat} = e.lngLat
      alert(`you are at [${lng}, ${lat}]`)
    }
  })

  map.addMarker({
    id: 'bangbon1',
    lat: 13.45,
    lng: 100.79,
    draggable: true,
    onDragEnd: function(e) {
      const {lng, lat} = e.lngLat
      alert(`you are at [${lng}, ${lat}]`)
    }
  })
}
```

---

#### map.addMarker(options) กับ Popup
| Property | Description | Type | Default |
|--|--|--|--|
| description | คำธิบายเมื่อ popup แสดงขึ้น | string | - |
| action | เมื่อ action นี้ถูกเรียก popup จะแสดง มี 2 รูปแบบคือ `click` และ `hover` | string | click |
|offset| ระยะห่างของ popup กับพิกัดของ Marker | number[] | [0, 0] |

###### เพิ่ม Popup ลงใน Marker
![marker's popup](/static/image/popup.png)

```javascript
map.on('load', function() {
  map.addMarker({
    id: 'bangbon',
    lat: 13.72,
    lng: 100.49,
    icon: 'mmg_car_2_orange',
    description: 'รถ ว. บางบอน 2',
    popup: {
      action: 'click'
    }
  })
}
```

#### map.setMarker(options) ปรับตำแหน่ง Marker
| Property | Description | Type | Default |
|--|--|--|--|
| id | id ของ Marker ที่ต้องการ update ค่า | string | - |
| lat | latitude ของ Marker | number | - |
| lng | longtitude ของ Marker | number | - |

###### ตัวอย่าง

HTML
```html
<select id="selected-value">
  <option value="100.61,13.66">บางนา</option>
  <option value="100.49,13.65">บางมด</option>
  <option value="100.39,13.66">บางบอน</option>
</select>
```
javascript

```javascript
map.on('load', function() {
  map.addMarker({
    id: 'bangbon',
    lng: 100.61,
    lat: 13.66,
    icon: 'mmg_car_2_orange',
    onClick: function() {
      alert('รถรับส่ง 6 ล้อ บางบอน')
    }
  })

  document.getElementById('selected-value').addEventListener('change', function(val) {
    const lngLat = val.target.value.split(',')
    console.log(lngLat)
    map.setMarker({
      id: 'bangbon',
      lng: lngLat[0],
      lat: lngLat[1],
    })
  })
}
```

----
#### map.addMarkerImage(options) เพิ่ม Marker ที่เป็นรูปภาพ
| Property | Description | Type | Default |
|--|--|--|--|
| url | URL รูปภาพ | string | - |

![Image marker](/static/image/image-marker-example.png)

```javascript
map.on('load', function() {
  map.addMarkerImage({
    lat: 13.72,  // require
    lng: 100.20, // require
    url: '<your image>'
  })
})
```
---
### Geometry
#### map.addLine(options) วาดเส้นลงแผนที่
| Property | Description | Type | Default |
|--|--|--|--|
| id | ระบุ id ให้แต่ละ Line (ห้ามซ้ำเด็ดขาด) | string | (random id) |
| coordinates | Array ของพิกัดแต่ละจุด (เพื่อที่จะวาดเส้นต้องมีมากกว่า 1 จุด) | array(number[]) | - |
| style | รูปแบบของเส้น | object | - |

###### Line style
| Property | Description | Type | Default |
|--|--|--|--|
| lineWidth | ความหนาของเส้น | number | - |
| color | สีของเส้น | string | - |

ตัวอย่างการวาดเส้น โดยการเพิ่มตำแหน่ง (lng, lat) ลงใน Array อย่างเป็นลำดับ

![draw line](/static/image/line.png)

```javascript
map.on('load', function() {
  map.addLine({
    id: 'phra-pradaeng',
    coordinates: [
      [100.47644313104138, 13.681937298079163],
      [100.48129943712564, 13.675842487108369],
      [100.50780677440406, 13.67191026727113],
      [100.5265613225339, 13.693628535272623],
      [100.54052320248576, 13.69873993645703],
      [100.55559187760178, 13.719054839020814]
    ],
    style: {
      lineWidth: 5,
    }
  })

  map.addLine({
    id: 'rama-9',
    coordinates: [
      [100.58888632828723, 13.630326416375254],
      [100.59795464990867, 13.599711115944729],
      [100.61036393209162, 13.589969053546099],
      [100.60415929098656, 13.573731393137876],
      [100.63947801727284, 13.52547579371847]
    ],
    style: {
      color: '#000FF0'
    }
  })
}
```

#### map.addPolygon(options) วาด Polygon
| Property | Description | Type | Default |
|--|--|--|--|
| id | ระบุ id ให้แต่ละ Polygon (ห้ามซ้ำเด็ดขาด) | string | (random id) |
| coordinates | Array ของพิกัดแต่ละจุด (เพื่อที่จะวาด Polygon ต้องมีมากกว่า 2 จุด) | array(number[]) | - |
วาด Polygon โดยการเพิ่มตำแหน่ง (lat, lng) ลงใน Array อย่างเป็นลำดับ

![draw polygon](/static/image/polygon.png)

```javascript
map.on('load', function() {
  map.addPolygon({
    id: 'city-district',
    coordinates:[
      [100.5182085132937, 13.810625871384914],
      [100.49004639314808, 13.757788616172789],
      [100.51436822418873, 13.739137321964094],
      [100.54829077800093, 13.713644819353718],
      [100.58093323543875, 13.787627594325201],
      [100.5521310671059, 13.833621879410586]
    ]
  })
}
```
---

## :bulb: Code ตัวอย่าง
```html
<html>
  <head>
    <title>DEMO</title>
    <meta name='viewport' content='initial-scale=1,maximum-scale=1,user-scalable=no' />
    <script src='https://libs.mapmagic.co.th/mapmagic-gl/1.1.1/js/mapmagic-gl.js'></script>
    <link href='https://libs.mapmagic.co.th/mapmagic-gl/1.1.1/css/mapmagic-gl.css' rel='stylesheet' />
  </head>
  <body>
    <div id="map" style="height: 100vh;"></div>
    <script>
        const map = new mapmagic.Map({
            container: 'map',
            app_id: '<YOUR_APP_ID>',
            api_key: '<YOUR_API_KEY>'
        });

        map.on('load', function() {
          map.addMarker({
            id: 'bangbon',
            lat: 13.72,
            lng: 100.49,
            onClick: function() {
                alert('รถรับส่ง 6 ล้อ บางบอน')
            }
          })

          map.addPolygon({
            id: 'city-district',
            coordinates:[
              [100.5182085132937, 13.810625871384914],
              [100.49004639314808, 13.757788616172789],
              [100.51436822418873, 13.739137321964094],
              [100.54829077800093, 13.713644819353718],
              [100.58093323543875, 13.787627594325201],
              [100.5521310671059, 13.833621879410586]
            ]
          })
        })
    </script>
  </body>
</html>
```