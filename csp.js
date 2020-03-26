class ConnectedScatterPlot {
    constructor(svg, labels = null, units=null) {
        let self = this;

        if (!labels) labels = {'x': 'x', 'y': 'y', 't': 't'};
        if (!units) units = {'x': '', 'y': '', 't': ''};

        // Set chart margin, height and width
        let w = $(svg.node()).width(), h = $(svg.node()).height();
        let margin = {'top':.05*h, 'bottom':.1*h, 
                      'right': .05*w, 'left': .1*w};
        self.width = w - margin.left - margin.right;    // Chart width
        self.height = h - margin.top - margin.bottom;   // Chart height

        // Create chart
        self.svg = svg;
        self.chart = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
        self.lines = self.chart.append('g')   // container for all lines
            .attr('class', 'csls');

        // Set scales
        self.x = d3.scaleLinear().domain([0, 100]).range([0, self.width]);
        self.y = d3.scaleLinear().domain([0, 100]).range([self.height, 0]);
        self.t = d3.scaleSqrt().domain([0, 100])
                    .range([0.005*self.width, 0.03*self.width]);

        // Set x axis
        self.xAxis = d3.axisBottom(self.x);
        self.g_xAxis = self.chart.append('g')
            .attr('transform', `translate(${0}, ${self.height})`);
        self.g_xAxis.call(self.xAxis);

        // Set y axis
        self.yAxis = d3.axisLeft(self.y);
        self.g_yAxis = self.chart.append('g');
        self.g_yAxis.call(self.yAxis);

        // Set axis labels
        self.xlabel = self.chart.append("text")
            .attr('transform', `translate(${self.width-5}, ${self.height-5})`)
            .attr('text-anchor', 'end')
            .text(labels.x);
        self.ylabel = self.chart.append('text')
            .attr('transform', `translate(${5}, ${0})`)
            .attr('text-anchor', 'start')
            .text(labels.y);

        self.tlegend = self.chart.append('g')
            .attr('transform', `translate(${self.width/2}, ${10})`);
        self.tlegend.append('text').attr('id', 'tmin')
            .attr('x', -1).attr('y', 5)
            .attr('text-anchor', 'end');
        self.tlegend.append('text').attr('id', 'tmax')
            .attr('x', self.width/5 + 5).attr('y', 5)
            .attr('text-anchor', 'start');


        self.lineGen = d3.line()           // Line generator
            .curve(d3.curveCatmullRom)
            .x(d => self.x(d.x))
            .y(d => self.y(d.y));

        // Add tool tip
        self.toolTip = d3.select('body').append('div')
            .attr('class', 'toolTip');
        self.toolTip.append('h3').attr('id', 'title');
        for (let l of ['y', 'x', 't']) {
            let tip = `${labels[l]}: <span id=${l}></span> ` + units[l];
            self.toolTip.append('p').html(tip);
        }

        self.nlines = 0;                // counter for number of lines
        self.data = {};
    }

    updateScale(domains = null) {
        let self = this;
        if (domains) {
            for (let dim of Object.keys(domains)) {
                self[dim].domain(domains[dim]);
            }

            // self.tlegend.selectAll('circle').remove();
            let [tmin, tmax] = self.t.domain();
            let legdata = d3.range(5).map(i => self.t( tmin + (tmax - tmin) * i / 4) );

            self.tlegend.selectAll('circle')
                .data(legdata).enter().append('circle')
                .transition().duration(300)
                    .attr("cx", (d, i) => 2 * d3.sum(legdata.slice(0, i+1)))
                    .attr("cy", d => 0)
                    .attr("r", d => d)
                    .attr('class', 'legcircle');
            self.tlegend.select('#tmin').text(tmin);
            self.tlegend.select('#tmax').text(tmax);
            // self.tlegend.selectAll('text')
            //     .data([tmin, tmax]).enter().append('text')
            //     .transition().duration(300)
            //         .attr('x', (d, i) => (i==0) ? 0 : self.width/16)
            //         .attr('text-anchor', (d, i) => (i==0) ? 'end' : 'start');
        }

        // update axis
        self.g_xAxis.transition().duration(1000)
            .call(self.xAxis);
        self.g_yAxis.transition().duration(1000)
            .call(self.yAxis);

        // update previous paths
        self.chart.selectAll('g.csl').nodes()
            .forEach(function(g) {
                let csl = d3.select(g);
                let id = csl.attr('id');
                csl.select('path')
                    .transition().duration(300)
                    .attr("d", self.lineGen(self.data[id]));
                csl.selectAll('circle')
                    .transition().duration(300)
                    .attr("cx", d => self.x(d.x))
                    .attr("cy", d => self.y(d.y))
                    .attr("r", d => self.t(d.t));

            });
    }

    reset() {
        let self = this;
        self.chart.selectAll('g.csl').remove();       // All the circles
        self.nlines = 0;
        self.data = {};
        self.tlegend.selectAll('circle').remove();
        self.tlegend.selectAll('text').text('')
    }

    remove(id) {
        let self = this;
        self.lines.select(`g.csl#${id}`).remove();
        self.nlines--;
        delete this.data[id];
    }

    addData(data, attr={'id': null, 'color': 'black', 'title': ''}) {
        let self = this;
        self.nlines ++;     // Increase the count of number of paths
        if (!attr.id) attr.id = self.nlines;
        if (!attr.color) attr.color = 'black';
        if (!attr.title) attr.title = 'line '+self.nlines;
        if (!attr.animtime) attr.animtime = 0;
        self.data[attr.id] = data;

        // set scale
        let d_doms = {}
        for (let dim of ['x', 'y', 't']) {
            d_doms[dim] = d3.extent(data, d => d[dim]);   // Data domain
        }
        let domains = {}
        if (self.nlines > 1) {
            for (let dim of ['x', 'y', 't']) {
            let c_dom = self[dim].domain();             // Current domain
            domains[dim] = [Math.min(d_doms[dim][0], c_dom[0]),
                            Math.max(d_doms[dim][1], c_dom[1])];
            }
        }
        else domains = d_doms;
        self.updateScale(domains)

        // Create a Connected Scatter Line container
        let g = self.lines.append('g')
            .attr('id', attr.id).attr('class', 'csl');

        // draw line
        let path = g.append("path")
                    .datum(data)
                    .attr("stroke", attr.color)
                    .attr("d", self.lineGen);

        if (attr.animtime > 0) {
            const l = path.node().getTotalLength()
            path.attr("stroke-dasharray", `0,${l}`)
                .transition().duration(attr.animtime)
                .ease(d3.easeLinear)
                .attr("stroke-dasharray", `${l},${0}`);
        }
        

        // draw circles
        g.selectAll("circle")
            .data(data).enter().append("circle")
            .attr("stroke", attr.color)
            .attr("cx", d => self.x(d.x))
            .attr("cy", d => self.y(d.y))
            .attr("r", d => self.t(d.t))
            .on('mouseover', function(d) {
                self.toolTip.select('#title').text(attr.title);
                for (let label of ['y', 'x', 't']) {
                    self.toolTip.select('#'+label).text(d[label]);
                }
                let offset = $(this).offset()
                let w = $(self.toolTip.node()).width(),
                    h = $(self.toolTip.node()).height();
                self.toolTip.transition(20).duration(200)
                    .style("opacity", 0.95)
                    .style('left', (offset.left - w) + 'px')
                    .style('top', (offset.top - h) + 'px');
            })
            .on('mouseout', function(d) {
                self.toolTip.style('opacity', 0);
            });
    }
}
