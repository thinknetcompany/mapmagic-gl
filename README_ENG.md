![](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/common-mapmagic-image/logo_mapmagic.png)

# mapmagic-gl

mapmagic-gl is a javascript library that helps you to develop map easier on your application

Official Site : https://www.mapmagic.co.th

For Developers : https://developers.mapmagic.co.th
 For manage your API key and access to MapMagic on your application

## Release Notes 0.4.0
```
1. Add marker offset for move marker
2. Add navigation control in API properties
```

## Features
  * [Display map on website](#start-using-simple-map)
  * [Add marker](#add-marker)
  * [Customize marker](#customize-marker)
  * [Add image marker](#add-image-marker)
  * [Display popup on marker](#add-popup-into-marker)
  * [Add line](#add-line)
  * [Add polygon](#add-polygon)
  * [Add dragable marker and recieve (lat,lng)](#add-draggable-marker)
  * [Re-location marker](#re-location-marker)
  * [Protect scroll map](#protect-scroll-map)

## Installation
#### Using NPM

Install package

```
$ npm install mapmagic-gl --save
```

and then Import library mapmagic-gl to project

```javascript
const MapmagicGL = require('mapmagic-gl')
require('node_modules/mapmagic-gl/dist/mapmagic-gl.css')
```
---

#### Or download from mapmagic server for using on HTML

```html
<script src='https://libs.mapmagic.co.th/mapmagic-gl/0.4.0/js/mapmagic-gl.js'></script>
<link href='https://libs.mapmagic.co.th/mapmagic-gl/0.4.0/css/mapmagic-gl.css' rel='stylesheet' />
```


## Get started
### Initial map

Using div tag for render map to page

```html
<html>
...
  <div id="map"></div>
...
</div>
```
Before you can using Mapmagic, you need to get "app_id" and "api_key" from [Mapmagic Platform](https://developers.mapmagic.co.th)

```javascript
const map = new MapmagicGL.Map({
  container: 'map', // div's id for render map
  app_id: '<your app id>',
  api_key: '<your api key>',
})
```

Container's name must have to match div's id that use for display map only
## API Properties
| Property | Description | Type | Default |
|----------|-------------|------|---------|
| container | Container's name for render map | string | map |
| app_id | Your application ID | string | - |
| api_key | Your API key | string | - |
| center | Center of map on initial map | Object | { lng: 100.49, lat: 13.72 } |
| zoom | Zoom level on initial map (range 1-22) | integer | 9 |
| navigationCtrl | Navigation bar for adjusting the view of map | boolean | false |

*Learn more about our API from [Mapbox GL API](https://www.mapbox.com/mapbox-gl-js/api/#map)*

## Start using simple map
Render map on website
```javascript
map.on('load', function() {
  map.addMarker({
    id: 'bangbon',
    lat: 13.72,
    lng: 100.49,
    onClick: () => {
        alert('6-wheel shuttle Bang Bon')
    }
  })
})
```
### Add marker
Add simple marker to map

![simple marker](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/images/marker.png)

```javascript
map.addMarker({
  id: 'bangbon',
  lat: 13.72,
  lng: 100.49,
  offset: [0,-10],
  onClick: () => {
      alert('Bang Bon 6-wheel shuttle')
  }
})
```

### Customize marker
Customize your marker's style e.g. icon

![styled marker](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/images/custom-marker.png)

```javascript
map.addMarker({
  id: 'bangbon',
  lat: 13.72,
  lng: 100.49,
  icon: 'mmg_car_2_orange',
})
```

### Add image marker
Using image instead of default icon

![Image marker](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/images/image-marker-example.png)

```javascript
map.addMarkerImage({
  lat: 13.72,  // require
  lng: 100.20, // require
  url: '<your image>'
})
```

### Add popup into marker

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

### Add line
Add line to map by adding location(lng, lat) into array sequentially

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

### Add polygon
Add polygon to map by adding location(lng, lat) into array sequentially

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

###  Add draggable marker
Add draggable marker that can use onClick and onDragEnd event

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

### Re-location marker
html
```html
<select id="selected-value">
  <option value="100.61,13.66">Bang Na</option>
  <option value="100.49,13.65">Bang Mod</option>
  <option value="100.39,13.66">Bang Bon</option>
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
    alert('Bang Bon 6-wheel shuttle')
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

### Protect scroll map

![protected scrolling](https://s3-ap-southeast-1.amazonaws.com/cdn-mapmagic-platform/images/protected-scroll.png)

```javascript
const map = new mapmagic.Map({
  container: 'map',
  app_id: '<your app id>',
  api_key: '<your api key>',
  protectScroll: true,
});
```
