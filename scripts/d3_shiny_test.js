function(el, x) {
  console.log("Data received from R:", x); // Check the console for this!
  console.log("First row example:", x[0]);
  // 'this' refers to the leaflet map object in onRender
  var map = this;

  // Create data for circles
  var markers = x;

  // Leaflet has a specific layer for SVGs
  // We select the svg inside the leaflet-pane
  var svg = d3.select(map.getPanes().overlayPane).append("svg");
  var g = svg.append("g").attr("class", "leaflet-zoom-hide");

  // Create scales based on count column
  var maxN = d3.max(markers, d => d.Count);
  
  var radiusScale = d3.scaleSqrt()
    .domain([0, maxN])
    .range([2, 30]);
    
  var colorScale = d3.scaleSequential(d3.interpolateViridis)
    .domain([0, maxN]);
  
  var circles = g.selectAll("circle")
    .data(markers)
    .enter()
    .append("circle")
    .attr("r", d => radiusScale(d.Count))
    .style("fill", d => colorScale(d.Count))
    .style("fill-opacity", 0.6)
    .attr("stroke", "white")
    .attr("stroke-width", 1);
  
  function update() {
    circles.attr("cx", d => map.latLngToLayerPoint([d.HubLatitude, d.HubLongitude]).x)
           .attr("cy", d => map.latLngToLayerPoint([d.HubLatitude, d.HubLongitude]).y);
           
    var bounds = map.getBounds();
    var topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
    var bottomRight = map.latLngToLayerPoint(bounds.getSouthEast());
    
    svg.attr("width", bottomRight.x - topLeft.x + 100)
       .attr("height", bottomRight.y - topLeft.y + 100)
       .style("left", (topLeft.x - 50) + "px")
       .style("top", (topLeft.y - 50) + "px");
       
    g.attr("transform", "translate(" + (-topLeft.x + 50) + "," + (-topLeft.y + 50) + ")");
  }
  
  map.on("viewreset move", update);
  update();

}
