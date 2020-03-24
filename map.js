class GeoMap {

    constructor(svg) {
        let self = this
        // Responsive design
        self.width = $(svg.node()).width();
        self.height = $(svg.node()).height();
        self.scale = 500;
        self.center = [0, 0];

        // Separate container for drawing
        self.svg = svg;
        self.chart = svg.append('g');

        // Zoom and Pan
        svg.call(d3.zoom().on('zoom', function(){
                    self.chart.attr("transform", d3.event.transform);
                })
            );

        self.data = null;       // Data pointer
        self.scale = scale;     // For Projection
        self.entities = null;   // Each entity has a boundary
        self.path = null;       // Path generator for entity boundaries
    }

    addData(data, draw=true) {
        this.data = data;

        // Add class (distinguishable hsl color) for each entity
        var sheet = document.createElement('style')
        sheet.innerHTML = "";
        var h, s = 0.6, l;
        var lMin = 0.4, lMax = 0.8, lDecay = 30;
        var base = 3, tmp = "";
        data.forEach(function(d, i) {
            tmp = i.toString(base).split("").reverse().join("");
            h = 360 * parseInt(tmp, base) / Math.pow(base, tmp.length);
            l = lMin + (lMax - lMin) * (1 - Math.exp(-i/lDecay));
            sheet.innerHTML += `\
                .state-${d.id} path { \
                    fill: ${d3.hsl(h, s, l).toString()}; \
                } `
        })
        document.body.appendChild(sheet);

        if (draw) this.draw();
    }

    draw() {
        let self = this
        self.chart.selectAll('*').remove();     // Clear Chart

        // Projection operator
        let project = d3.geoMercator().center(self.center)
            .translate([self.width / 2, self.height / 2]).scale(self.scale);

        // Boundary Path generator
        self.path = d3.geoPath().projection(project);
        // this.path = path;

        // Add boundary path for each entity
        self.entities = self.chart.selectAll('g')
            .data(self.data).enter().append('g');
        self.entities.append("path").attr("d", self.path);

        self.entities.append("text")
            .attr("transform", function(d) {
                return "translate(" + self.path.centroid(d) + ")";
            })
            .attr("dy", ".35em")
            .text(function(d) { return d.properties.name; });
    }
}

let width  = 800, height = 700, scale = 1200;
svg = d3.select("#map").append('svg')
        .attr("width", width)
        .attr("height", height);
var map = new GeoMap(svg);
map.center = [83, 23];
map.scale = scale;

d3.queue()
    .defer(d3.json, "ne_10m_admin_1_India_Official.json")
    .await(function(error, topoMap) {
        if (error) throw error;
        var states = topojson.feature(topoMap, topoMap.objects.ne_10m_admin_1_India_Official);
        map.addData(states.features);
        map.entities.attr('class', (d,i) => (i%2 == 0) ? 'state selected': 'state unselected');
        map.entities.on('click', function(d) {
            let self = d3.select(this);
            if (self.classed("selected")) {
                self.classed(`state-${d.id}`, !self.classed(`state-${d.id}`));
            }
        })
    });
