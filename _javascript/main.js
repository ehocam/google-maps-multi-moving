let map;
let directionDisplay;
let directionsService;
let stepDisplay;

let position;
let marker = [];
let polyline = [];
let poly2 = [];
let poly = null;
let startLocation = [];
let endLocation = [];
let locations = [];
let timerHandle = [];

const speed = 0.000005,
  wait = 1;
let infowindow = null;

let myPano;
let panoClient;
let nextPanoId;

const startLoc = new Array();
startLoc[0] = "ankara, turkey";
startLoc[1] = "ankara, turkey";
startLoc[2] = "ankara, turkey";
startLoc[3] = "ankara, turkey";

const endLoc = new Array();
endLoc[0] = "istanbul, turkey";
endLoc[1] = "corum, turkey";
endLoc[2] = "cankiri, turkey";
endLoc[3] = "yozgat, turkey";

var Colors = ["#FF0000", "#00FF00", "#0000FF"];

initialize();

function initialize() {
  infowindow = new google.maps.InfoWindow({
    size: new google.maps.Size(350, 50),
  });

  var myOptions = {
    zoom: 200,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
  };
  map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);

  address = "Ankara";
  geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: address }, function (results, status) {
    map.fitBounds(results[0].geometry.viewport);
  });
  setRoutes();
}

function createMarker(latlng, label, html) {
  var contentString = "<b>" + label + "</b><br>" + html;
  var marker = new google.maps.Marker({
    position: latlng,
    map: map,
    title: label,
    zIndex: Math.round(latlng.lat() * -100000) << 5,
  });
  marker.myname = label;

  google.maps.event.addListener(marker, "click", function () {
    infowindow.setContent(contentString);
    infowindow.open(map, marker);
  });
  return marker;
}

function setRoutes() {
  var directionsDisplay = new Array();

  for (var i = 0; i < startLoc.length; i++) {
    var rendererOptions = {
      map: map,
      suppressMarkers: true,
      preserveViewport: true,
    };
    directionsService = new google.maps.DirectionsService();

    var travelMode = google.maps.DirectionsTravelMode.DRIVING;

    var request = {
      origin: startLoc[i],
      destination: endLoc[i],
      travelMode: travelMode,
    };

    directionsService.route(
      request,
      makeRouteCallback(i, directionsDisplay[i])
    );
  }

  function makeRouteCallback(routeNum, disp) {
    if (polyline[routeNum] && polyline[routeNum].getMap() != null) {
      startAnimation(routeNum);
      return;
    }
    return function (response, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        var bounds = new google.maps.LatLngBounds();
        var route = response.routes[0];
        startLocation[routeNum] = new Object();
        endLocation[routeNum] = new Object();

        polyline[routeNum] = new google.maps.Polyline({
          path: [],
          strokeColor: "#FFFF00",
          strokeWeight: 3,
        });

        poly2[routeNum] = new google.maps.Polyline({
          path: [],
          strokeColor: "#FFFF00",
          strokeWeight: 3,
        });

        // For each route, display summary information.
        var path = response.routes[0].overview_path;
        var legs = response.routes[0].legs;

        disp = new google.maps.DirectionsRenderer(rendererOptions);
        disp.setMap(map);
        disp.setDirections(response);

        //Markers
        for (i = 0; i < legs.length; i++) {
          if (i == 0) {
            startLocation[routeNum].latlng = legs[i].start_location;
            startLocation[routeNum].address = legs[i].start_address;
            // marker = google.maps.Marker({map:map,position: startLocation.latlng});
            marker[routeNum] = createMarker(
              legs[i].start_location,
              "start",
              legs[i].start_address,
              "green"
            );
          }
          endLocation[routeNum].latlng = legs[i].end_location;
          endLocation[routeNum].address = legs[i].end_address;
          var steps = legs[i].steps;

          for (j = 0; j < steps.length; j++) {
            var nextSegment = steps[j].path;
            var nextSegment = steps[j].path;

            for (k = 0; k < nextSegment.length; k++) {
              polyline[routeNum].getPath().push(nextSegment[k]);
              //bounds.extend(nextSegment[k]);
            }
          }
        }
      }

      polyline[routeNum].setMap(map);
      //map.fitBounds(bounds);
      startAnimation(routeNum);
    }; // else alert("Directions request failed: "+status);
  }
}

var lastVertex = 1;
var stepnum = 0;
var step = 50; // 5; // metres
var tick = 100; // milliseconds
var eol = [];

//----------------------------------------------------------------------
function updatePoly(i, d) {
  // Spawn a new polyline every 20 vertices, because updating a 100-vertex poly is too slow
  if (poly2[i].getPath().getLength() > 20) {
    poly2[i] = new google.maps.Polyline([
      polyline[i].getPath().getAt(lastVertex - 1),
    ]);
    // map.addOverlay(poly2)
  }

  if (polyline[i].GetIndexAtDistance(d) < lastVertex + 2) {
    if (poly2[i].getPath().getLength() > 1) {
      poly2[i].getPath().removeAt(poly2[i].getPath().getLength() - 1);
    }
    poly2[i]
      .getPath()
      .insertAt(
        poly2[i].getPath().getLength(),
        polyline[i].GetPointAtDistance(d)
      );
  } else {
    poly2[i]
      .getPath()
      .insertAt(poly2[i].getPath().getLength(), endLocation[i].latlng);
  }
}

//----------------------------------------------------------------------------

function animate(index, d) {
  if (d > eol[index]) {
    marker[index].setPosition(endLocation[index].latlng);
    return;
  }
  var p = polyline[index].GetPointAtDistance(d);

  //map.panTo(p);
  marker[index].setPosition(p);
  updatePoly(index, d);
  /*
    Optain Information From Service
    and Send to Queue Service
  */
  timerHandle[index] = setTimeout(
    "animate(" + index + "," + (d + step) + ")",
    tick
  );
}

//-------------------------------------------------------------------------

function startAnimation(index) {
  if (timerHandle[index]) clearTimeout(timerHandle[index]);
  eol[index] = polyline[index].Distance();
  map.setCenter(polyline[index].getPath().getAt(0));

  poly2[index] = new google.maps.Polyline({
    path: [polyline[index].getPath().getAt(0)],
    strokeColor: "#FFFF00",
    strokeWeight: 3,
  });

  timerHandle[index] = setTimeout("animate(" + index + ",50)", 2000); // Allow time for the initial map display
}
