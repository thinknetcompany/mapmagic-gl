
## Choose your map style

Specify a style name in `style` property when init MapMagic GL like example below

```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: '<MAP_STYLE>', 
});

```
## List of Map Styles
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

## Example map style

### Almond
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'almond',
});

```
![map style almond](/static/image/map-style/almond.png)

### Cha-Thai
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'cha-thai',
});

```
![map style cha-thai](/static/image/map-style/cha-thai.png)

### Charcoal
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'charcoal',
});

```
![map style charcoal](/static/image/map-style/charcoal.png)

### Cloudy
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'cloudy',
});

```
![map style cloudy](/static/image/map-style/cloudy.png)

### Hybrid
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'hybrid',
});

```
![map style hybrid](/static/image/map-style/hybrid.png)

### Ivory
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'ivory',
});

```
![map style hybrid](/static/image/map-style/ivory.png)

### LightSteel
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'lightsteel',
});

```
![map style lightsteel](/static/image/map-style/lightsteel.png)

### Midnight
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'midnight',
});

```
![map style midnight](/static/image/map-style/midnight.png)

### Satellite
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'satellite',
});

```
![map style satellite](/static/image/map-style/satellite.png)

### Spearmint
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'spearmint',
});

```
![map style spearmint](/static/image/map-style/spearmint.png)

### Terrain
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: 'terrain',
});

```
![map style terrain](/static/image/map-style/terrain.png)

## Choose maps language

Specify map language in `lang` property as abbreviation name when init MapMagic GL. Now, some bilingual option is also available.

| Language | value|
|------|---------|
|  Thai (default)|  th |
| English |  en |
| Thai - English |  th-en |

### Bilingual option example
![map th-en](/static/image/map-style/th-en-map.png)
```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<YOUR_APP_ID>',
  api_key: '<YOUR_API_KEY>',
  style: '<MAP_STYLE>',
  lang: 'th-en',
});

```