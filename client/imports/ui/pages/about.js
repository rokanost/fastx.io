import "./about.html";
import "../styles/about.less";
import Typed from 'typed.js';


let sydOfficeLocation;

Template.about.onCreated(function() {

  // We can use the `ready` callback to interact with the map API once the map is ready.
  GoogleMaps.ready('about_map', function(map) {
    // Add/ a marker to the map once it's ready
    var infowindow = new google.maps.InfoWindow({
      content: "FastX"
    });
    var marker = new google.maps.Marker({
      position: sydOfficeLocation,
      map: map.instance
    });
  });
});

Template.about.onRendered(function() {
  window.prerenderReady = true;//Tell pre-render we are now ready
  /*let typedCryptos = new Typed("#types", {
    strings: ["cash", "crypto"],
    typeSpeed: 60,
    backSpeed: 30,
    backDelay: 3000,
    loop: true,
    showCursor: false
  });*/
});

Template.about.helpers({
  about_map_options: function() {
    if (GoogleMaps.loaded()) {
      sydOfficeLocation = new google.maps.LatLng(-33.8398301, 151.2063793); // Sydney Office
      return {
        center: sydOfficeLocation,
        zoom: 13
      };
    }
  }
});
