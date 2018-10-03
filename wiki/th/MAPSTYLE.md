
## การเลือกใช้ map style

ในการเลือกใช้ style ของ map ให้กำหนด option style ในตอนสร้าง map แล้วใส่ชื่อ style ที่ต้องการ

```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: '<MAP_STYLE>', 
});

```
## รายชื่อ Map Styles
- [Almond](#almond)
- [Cha thai](#cha-thai)
- [Charcoal](#charcoal)
- [Cloudy](#cloudy)
- [Hybrid](#hybrid)
- [Ivory](#ivory)
- [Lightsteel](#lightsteel)
- [Midnight](#midnight)
- [Satellite](#satellite)
- [Spearmint](#spearmint)
- [Terrain](#terrain)

## ตัวอย่าง map style

### Almond
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'almond',
});

```
![map style almond](../../static/image/map-style/almond.png)

### Cha-Thai
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'cha-thai',
});

```
![map style cha-thai](../../static/image/map-style/cha-thai.png)

### Charcoal
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'charcoal',
});

```
![map style charcoal](../../static/image/map-style/charcoal.png)

### Cloudy
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'cloudy',
});

```
![map style cloudy](../../static/image/map-style/cloudy.png)

### Hybrid
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'hybrid',
});

```
![map style hybrid](../../static/image/map-style/hybrid.png)

### Ivory
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'ivory',
});

```
![map style hybrid](../../static/image/map-style/ivory.png)

### LightSteel
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'lightsteel',
});

```
![map style lightsteel](../../static/image/map-style/lightsteel.png)

### Midnight
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'midnight',
});

```
![map style midnight](../../static/image/map-style/midnight.png)

### Satellite
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'satellite',
});

```
![map style satellite](../../static/image/map-style/satellite.png)

### Spearmint
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'spearmint',
});

```
![map style spearmint](../../static/image/map-style/spearmint.png)

### Terrain
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'terrain',
});

```
![map style terrain](../../static/image/map-style/terrain.png)

## การกำหนดการแสดงภาษาบนแผนที่

ในการกำหนดการแสดงภาษาบนแผนที่ ให้กำหนด option lang ในตอนสร้าง map แล้วใส่อักษรย่อ ภาษา ที่ต้องการ ซึ่งในตอนนี้ map style รองรับภาษา ไทย อังกฤษ และ ไทย-อังกฤษ

| ภาษา | key ที่ใช้ |
|------|---------|
|  ไทย (default)|  th |
| อังกฤษ |  en |
| ไทย-อังกฤษ |  th-en |

### ตัวอย่าง การเรียกใช้ภาษา ไทย อังกฤษ
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: '<MAP_STYLE>',
  lang: 'th-en',
});

```
### การแสดงผล

![map th-en](../../static/image/map-style/th-en-map.png)
