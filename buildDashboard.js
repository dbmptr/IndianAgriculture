// Drawing object for map
var map = new GeoMap(getSVG('#map'));
map.center = [83, 23];
map.scale = (map.width*1.4 > map.height) ? 1.5 * map.height : map.width * 2;

// Drawing object for crop yield growth
let labels = {'x': 'Area', 'y': 'Production', 't': 'Year'};
let units = {'x': 'sq mt', 'y': 'units', 't': ''};
var yieldgrowth = new ConnectedScatterPlot(getSVG('#yield'), labels, units);

function getSVG(containerID) {
    let width = $(containerID).width(),
        height = $(containerID).height() - $(`${containerID} h1`).height();
    return d3.select(containerID).append('svg')
            .attr('width', width).attr('height', height)
}

// Gather data
d3.queue()
    .defer(d3.json, "ne_10m_admin_1_India_Official.json")
    .defer(d3.csv, "apy.csv")
    .await(buildDashboard);

// Build the dashboard using both data sources
function buildDashboard(error, topoMap, agroData) {
    if (error) throw error;

    // Set up the map
    var states = topojson.feature(topoMap, topoMap.objects.ne_10m_admin_1_India_Official);
    map.addData(states.features);
    map.entities.attr('class', 'state');
    map.entities.on('click', function(d) {
        let self = d3.select(this);
        if (self.classed("selected")) {
            self.classed(`state-${d.id}`, !self.classed(`state-${d.id}`));
            if (self.classed(`state-${d.id}`)) {
                showYield(d.properties.name, d.id, d.properties.color);   
            }
            else yieldgrowth.remove(d.id);
        }
    })
    let map_info = d3.select('#map_info');

    // Group by crops
    let cropsData = d3.nest().key(d => d.Crop).entries(agroData);

    // Set up the menu
    let crop_menu = d3.select('.crop_menu')
    crop_menu.select('select').selectAll('option')
        .data(cropsData).enter()
        .append('option')
            .attr('value', d => d.key )
            .text(d => d.key );

    var crop_name, cropData, cropStatesData, cropStatesName;
    crop_menu.on('change', update_menu);
    function update_menu() {
        crop_name = crop_menu.select('select').property('value');

        // Get data for the current crop
        cropData = cropsData.filter(d => d.key == crop_name)[0].values;
        cropStatesData = d3.nest().key(d => d.State_Name).entries(cropData);
        cropStatesName = cropStatesData.map(d => d.key);

        // Clear yield chart
        yieldgrowth.reset()

        // update map_info
        map_info.style('visibility', 'visible');
        map_info.select('#state_count').text(cropStatesData.length);
        map_info.select('#crop_name').text(crop_name);

        var n_selected = 0;
        map.entities.attr('class', 'state');
        map.entities.classed('selected', function (d) {
            if (cropStatesName.includes(d.properties.name)) {
                n_selected++;
                return true;
            }
            return false;
        });
        console.log(n_selected, ' selected on map');
    }
    update_menu();      // For first time

    // Set up the Yield growth chart
    function showYield(stateName, id, color) {
        // Prepare data for line chart
        let cropStateData = cropStatesData
                                .filter(d => d.key == stateName)[0]
                                .values;
        let cropStateYearsData = d3.nest().key(d => d.Crop_Year)
                                    .entries(cropStateData);
        let lineChartData = cropStateYearsData.map(function (yearData) {
                return {'t': +yearData.key, 
                        'x': d3.sum(yearData.values, d => d.Area), 
                        'y': d3.sum(yearData.values, d => d.Production)}
                })
                .sort((d1, d2) => d3.ascending(d1.t, d2.t));

        yieldgrowth.addData(lineChartData, {'id': id, 'color': color, 'title': stateName});
    }

    // Set up the Season chart
}