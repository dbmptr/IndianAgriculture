(function() {
    d3.queue()
      .defer(d3.json, "ne_10m_admin_1_India_Official.json")
      .await(function(error, topoMap) {
        if (error) throw error;
        var states = topojson.feature(topoMap, topoMap.objects.ne_10m_admin_1_India_Official);
    
        // Map render
        var map     = stateMap(states.features).width(800).height(700).scale(1200);
        d3.select("#map").call(map);
    });
}());

function stateMap(states) {

    var width  = 800, height = 700, scale = 1200;
    var color  = ["#dadaeb", "#bcbddc", "#9e9ac8", "#807dba", "#6a51a3"]
    
    function render(selection) {
      selection.each(function() {

        d3.select(this).select("svg").remove();
        var svg = d3.select(this).append("svg")
                    .attr("width", width)
                    .attr("height", height);

        var projection = d3.geoMercator()
            .center([83, 23])
            .scale(scale)
            .translate([width / 2, height / 2]);
    
        var path = d3.geoPath().projection(projection);
        var selectState     = svg.selectAll("g").data(states).enter().append("g").attr("class", "state");

        selectState.append("path")
            .style("fill", function(d) { return color[Math.floor(Math.random() * 5)]; })
            .attr("d", path);
          
        // svg.selectAll("text").data(states).enter().append("text")
        //     .attr("class", function(d) { return "label " + d.id; })
        //     .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        //     .attr("dy", ".35em")
        //     .text(function(d) { return d.properties.name; });

        selectState.append("text")
            .attr("class", function(d) { return "label " + d.id; })
            .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
            .attr("dy", ".35em")
            .attr("visibility", "hidden")
            .text(function(d) { return d.properties.name; });

        selectState.on("mouseover", function(d) {d3.select(this).selectAll("text").attr("visibility", "visible")})
        selectState.on("mouseout", function(d) {d3.select(this).selectAll("text").attr("visibility", "hidden")})
      });
    } // render
    render.height = function(value) {
            	if (!arguments.length) return height;
            	height = value;
            	return render;
        	};
    render.width = function(value) {
            	if (!arguments.length) return width;
            	width = value;
            	return render;
        	};
    render.scale = function(value) {
            	if (!arguments.length) return scale;
            	scale = value;
            	return render;
        	};
  
return render;
} // stateMap