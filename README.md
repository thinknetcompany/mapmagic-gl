![](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/common-mapmagic-image/logo_mapmagic.png)

# mapmagic-gl

mapmagic-gl คือ Javascript library ที่จะช่วยทำให้การแสดงแผนที่และการเพิ่มฟังก์ชันบนเว็ปไซต์ของคุณง่ายขึ้น

Official Site : https://www.mapmagic.co.th

For Developers : https://developers.mapmagic.co.th
 สำหรับจัดการ api key และการเข้าถึง MapMagic บน application ของคุณ 

## Release Notes 0.3.1
```
1. Render map tile บนเว็บบราวเซอร์
2. ฟังก์ชันพื้นฐานการใช้งานและแสดงผลบนแผนที่ (Marker, Line, Polygon)

  2.1 addMarker ที่สามารถเลือกการแสดงหมุดในแบบของ default marker , custom marker , image marker รวมถึงการเพิ่มฟังก์ชันการลากวางหมุดด้วยฟังก์ชัน draggable Marker

  2.2 addLine ใช้วาดเส้นลงและกำหนด Properties บนแผนที่

  2.3 addPolygon สำหรับวาด พื้นที่ polygon บนแผนที่

  2.4 เพิ่มฟังก์ชันการป้องกันการเลื่อนแผนที่ด้วยนิ้วเดียวในกรณีเล่นในโทรศัพท์หรือการใช้ scroll mouse บน desktop แล้วทำให้เกิดปัญหาเลื่อนแผนที่โดยไม่ได้ตั้งใจ
```

## Features
  * [แสดงแผนที่บนเว็ปไซต์](#เริ่มใช้งาน)
  * [เพิ่ม Marker](#%E0%B9%80%E0%B8%9E%E0%B8%B4%E0%B9%88%E0%B8%A1-marker)
  * [ปรับแต่ง Marker](#%E0%B8%9B%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B9%81%E0%B8%95%E0%B9%88%E0%B8%87-marker)
  * [เพิ่ม Marker เป็นรูปภาพ](#%E0%B9%80%E0%B8%9E%E0%B8%B4%E0%B9%88%E0%B8%A1-marker-%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B8%A0%E0%B8%B2%E0%B8%9E)
  * [แสดง Popup บนเครื่องหมาย](#%E0%B9%80%E0%B8%9E%E0%B8%B4%E0%B9%88%E0%B8%A1-popup-%E0%B8%A5%E0%B8%87%E0%B9%83%E0%B8%99-marker)
  * [วาดเส้นบนแผนที่](#วาดเส้นลงแผนที่)
  * [วาด Polygon บนแผนที่](#%E0%B8%A7%E0%B8%B2%E0%B8%94-polygon)
  * [สร้าง Dragable marker ที่สามารถรับข้อมูลตำแหน่ง (lat,lng)](#%E0%B9%80%E0%B8%9E%E0%B8%B4%E0%B9%88%E0%B8%A1-marker-%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%AA%E0%B8%B2%E0%B8%A1%E0%B8%B2%E0%B8%A3%E0%B8%96%E0%B8%A5%E0%B8%B2%E0%B8%81%E0%B8%A7%E0%B8%B2%E0%B8%87%E0%B9%84%E0%B8%94%E0%B9%89)
  * [เปลี่ยนตำแหน่ง Marker](#%E0%B9%80%E0%B8%9B%E0%B8%A5%E0%B8%B5%E0%B9%88%E0%B8%A2%E0%B8%99%E0%B8%95%E0%B8%B3%E0%B9%81%E0%B8%AB%E0%B8%99%E0%B9%88%E0%B8%87-marker)
  * [ป้องกันการเลื่อนแผนที่](#ป้องกันการเลื่อนแผนที่)

## การติดตั้ง
#### ติดตั้งผ่าน NPM

install package

```
$ npm install mapmagic-gl --save
```

จากนั้น Import library mapmagic-gl เข้าสู่โปรเจ็ค

```javascript
const MapmagicGL = require('mapmagic-gl')
require('node_modules/mapmagic-gl/dist/mapmagic-gl.css')
```
---

#### หรือดาวน์โหลดจาก mapmagic server สำหรับใช้บน HTML

```html
<script src='https://libs.mapmagic.co.th/mapmagic-gl/0.3.1/js/mapmagic-gl.js'></script>
<link href='https://libs.mapmagic.co.th/mapmagic-gl/0.3.1/css/mapmagic-gl.css' rel='stylesheet' />
```


## เริ่มใช้งาน
### เริ่มต้นสร้างแผนที่

สร้าง Div สำหรับเป็นพื้นที่ให้ map render ลงบนหน้าเว็ป

```html
<html>
...
  <div id="map"></div>
...
</div>
```
ก่อนที่จะใช้ Mapmagic ได้ต้องทำการสร้าง "app_id" และ "api_key" จาก [Mapmagic Platform](https://developers.mapmagic.co.th)
เพื่อนำมาใช้งานในเว็บไซต์ของคุณ

```javascript
const map = new MapmagicGL.Map({
  container: 'map', // id ของ div ที่จะให้ map ไป render
  app_id: '<your app id>',
  api_key: '<your api key>',
})
```

ชื่อของ container จะต้องตรงกับ id ของ div ที่ใช้แสดงแผนที่ และคุณก็สามารถใช้ชื่อ container อื่นๆได้เช่นกัน
## API เบื้องต้น
| Property | Description | Type | Default |
|----------|-------------|------|---------|
| container | id ของ container ที่จะใช้ render map | string | map |
| app_id | Application ID ของคุณ | string | - |
| api_key | API Key ของคุณ | string | - |
| center | จุดเริ่มต้นของแผนที่ | Object | { lng: 100.49, lat: 13.72 } |
| zoom | ระดับการซูมขณะเริ่มแผนที่ จะต้องอยู่ระหว่าง 1 - 22 | integer | 9 |
| navigation | แสดงแถบปรับมุมมองของแผนที่ | boolean | false |

*สามารถศึกษา API เพิ่มเติมได้จาก Reference: [Mapbox GL API](https://www.mapbox.com/mapbox-gl-js/api/#map)*

## การใช้แผนที่อย่างง่าย
การเรียกใช้แผนที่ให้ Render บน เว็บไซต์
```javascript
map.on('load', function() {
  map.addMarker({
    id: 'bangbon',
    lat: 13.72,
    lng: 100.49,
    onClick: () => {
        alert('รถรับส่ง 6 ล้อ บางบอน')
    }
  })
})
```
### เพิ่ม Marker
เพิ่ม Simple marker ลงในแผนที่

![simple marker](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/images/marker.png)

```javascript
map.addMarker({
  id: 'bangbon',
  lat: 13.72,
  lng: 100.49,
  onClick: () => {
      alert('รถรับส่ง 6 ล้อ บางบอน')
  }
})
```

### ปรับแต่ง Marker
ปรับแต่ง Marker's style เช่น icon

![styled marker](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/images/custom-marker.png?lang=th)

```javascript
map.addMarker({
  id: 'bangbon',
  lat: 13.72,
  lng: 100.49,
  icon: 'mmg_car_2_orange',
})
```

### เพิ่ม Marker ที่เป็นรูปภาพ
ใช้รูปภาพแทน default icon

![Image marker](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/images/image-marker-example.png)

```javascript
map.addMarkerImage({
  lat: 13.72,  // require
  lng: 100.20, // require
  url: '<your image>'
})
```

### เพิ่ม Popup ลงใน Marker

![marker's popup](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/images/popup.png)

```javascript
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

```

### วาดเส้นลงแผนที่
วาดเส้นโดยการเพิ่มตำแหน่ง (lat, lng) ลงใน Array อย่างเป็นลำดับ

![draw line](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/images/line.png)

```javascript
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
```

### วาด Polygon
วาด Polygon โดยการเพิ่มตำแหน่ง (lat, lng) ลงใน Array อย่างเป็นลำดับ

![draw polygon](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/images/polygon.png)

```javascript
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
```

###  เพิ่ม Marker ที่สามารถลากวางได้
เพิ่ม Draggable marker ที่สามารถใช้ onClick and onDragEnd event ได้

![draggable marker](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/images/draggable-marker.gif)

```javascript
map.addMarker({
  id: 'bangbon',
  lat: 13.50,
  lng: 100.49,
  draggable: true,
  onClick: (e) => {
    const {lng, lat} = e.lngLat
    alert(`you are at [${lng}, ${lat}]`)
  }
})

map.addMarker({
  id: 'bangbon1',
  lat: 13.45,
  lng: 100.79,
  draggable: true,
  onDragEnd: (e) => {
    const {lng, lat} = e.lngLat
    alert(`you are at [${lng}, ${lat}]`)
  }
})
```

### เปลี่ยนตำแหน่ง Marker
html
```html
<select id="selected-value">
  <option value="100.61,13.66">บางนา</option>
  <option value="100.49,13.65">บางมด</option>
  <option value="100.39,13.66">บางบอน</option>
</select>
```
javascript

```javascript
map.addMarker({
  id: 'bangbon',
  lng: 100.61,
  lat: 13.66,
  icon: 'mmg_car_2_orange',
  onClick: () => {
    alert('รถรับส่ง 6 ล้อ บางบอน')
  }
})

document.getElementById('selected-value').addEventListener('change', (val) => {
  const lngLat = val.target.value.split(',')
  console.log(lngLat)
  map.setMarker({
    id: 'bangbon',
    lng: lngLat[0],
    lat: lngLat[1],
  })
})
```

### ป้องกันการเลื่อนแผนที่

![protected scrolling](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/images/protected-scroll.png)

```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<your app id>',
  api_key: '<your api key>',
  protectScroll: true,
});
```
