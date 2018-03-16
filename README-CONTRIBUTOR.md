# Mapmagic JS
Javascript library for ordinary usage, with geographic information data especially in Thailand, and renders them using WebGL

## Setup project
Install dependency using `yarn` or `npm install`
```
$ yarn
```
To build scripts at once. mapmagic-gl.js, mapmagic-gl.css will be built at /dist
```
$ yarn build
```
[Develop optional] Start mapmagic at http://localhost:9966
script will being watched and build at /dist
```
$ yarn start
```

## Example
Examples are locate in /example
- index.html - Show mapmagic initialization.
To start using mapmagic JS, you need to create your own API platform at https://developers.mapmagic.co.th
```
const map = mapmagic.map({
  container: id to render map
  app_id: application ID
  api_key: API key
})
```
- marker-add-marker.html - Add marker on the map
- marker-add-image-marker.html - Add marker as image
- marker-add-marker-array.html - Add multiple marker
- marker-filter-marker-by-name.html
- popup-show-popup.html - Show poup when click or hover
- geometry-draw-line.html - Draw line in the map
- geometry-draw-polygon.html - Draw polygon in the map


In additional, Other class and function can be implements follow by these document https://www.mapbox.com/mapbox-gl-js/api

<!-- [<img width="400" alt="Mapbox" src="docs/pages/assets/logo.png">](https://www.mapbox.com/)

**Mapbox GL JS** is a JavaScript library for interactive, customizable vector maps on the web. It takes map styles that conform to the
[Mapbox Style Specification](https://github.com/mapbox/mapbox-gl-js/style-spec/), applies them to vector tiles that
conform to the [Mapbox Vector Tile Specification](https://github.com/mapbox/vector-tile-spec), and renders them using
WebGL.

Mapbox GL JS is part of the [cross-platform Mapbox GL ecosystem](https://www.mapbox.com/maps/), which also includes
compatible native SDKs for applications on [Android](https://www.mapbox.com/android-sdk/),
[iOS](https://www.mapbox.com/ios-sdk/), [macOS](http://mapbox.github.io/mapbox-gl-native/macos),
[Qt](https://github.com/mapbox/mapbox-gl-native/tree/master/platform/qt), and [React Native](https://github.com/mapbox/react-native-mapbox-gl/). Mapbox provides building blocks to add location features like maps, search, and navigation into any experience you
create. To get started with GL JS or any of our other building blocks,
[sign up for a Mapbox account](https://www.mapbox.com/signup/).

In addition to GL JS, this repository contains code, issues, and test fixtures that are common to both GL JS and the
native SDKs. For code and issues specific to the native SDKs, see the
[mapbox/mapbox-gl-native](https://github.com/mapbox/mapbox-gl-native/) repository.

- [Getting started with Mapbox GL JS](https://www.mapbox.com/mapbox-gl-js/api/)
- [API documentation](https://www.mapbox.com/mapbox-gl-js/api/)
- [Examples](https://www.mapbox.com/mapbox-gl-js/examples/)
- [Style documentation](https://www.mapbox.com/mapbox-gl-js/style-spec/)
- [Open source styles](https://github.com/mapbox/mapbox-gl-styles)
- [Roadmap](https://www.mapbox.com/mapbox-gl-js/roadmap/)
- [Contributor documentation](https://github.com/mapbox/mapbox-gl-js/blob/master/CONTRIBUTING.md)

[<img width="981" alt="Mapbox GL gallery" src="docs/pages/assets/gallery.png">](https://www.mapbox.com/gallery/)

## License

Mapbox GL JS is licensed under the [3-Clause BSD license](https://github.com/mapbox/mapbox-gl-js/blob/master/LICENSE.txt).
The licenses of its dependencies are tracked via [FOSSA](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fmapbox%2Fmapbox-gl-js):

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fmapbox%2Fmapbox-gl-js.svg?type=large)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fmapbox%2Fmapbox-gl-js?ref=badge_large) -->