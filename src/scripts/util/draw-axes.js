var d3 = require('d3');
var axis = require('../axis/index.js');
var dateFormatter = require('./dates').formatter;

function getHeight(selection) {
    return Math.ceil(selection.node().getBoundingClientRect().height);
}

function getWidth(selection) {
    return Math.ceil(selection.node().getBoundingClientRect().width);
}

function Axes(svg, model) {
    this.model = model;
    this.svg = svg;
    this.margin = 0.2;
    this.tickExtender = 1.5;
}

Axes.prototype.rearrangeLabels = function () {
    var model = this.model;
    var showsAllLabels = this.svg.selectAll('.x.axis .primary line')[0].length === this.svg.selectAll('.x.axis .primary text')[0].length;
    var allPositiveValues = Math.min.apply(null, this.valueScale.domain()) >= 0;

    if (showsAllLabels && allPositiveValues && model.chartType == 'column') {
        model.tickSize = 0;
        this.svg.selectAll('.x.axis').remove();
        this.timeAxis.tickSize(0).scale(this.timeScale, this.model.units);
        this.svg.call(this.timeAxis);
    } else if (!showsAllLabels) { //todo: should/can this be in category.js?
        this.svg.selectAll('.x.axis').remove();
        this.timeAxis.scale(this.timeScale, [model.units[1]]);
        this.svg.call(this.timeAxis);
    }
};

Axes.prototype.columnWidth = function (){
    var columnWidth = this.timeScale.rangeBand();
    if(!this.model.stack){
        columnWidth = columnWidth / this.model.y.series.length;
    }
    return columnWidth;
};

Axes.prototype.xPositions = function(d, seriesNumber){ //seriesNumber: grrr.
    var timeScale = this.timeScale(d.key);
    var adjustX = (this.timeScale.rangeBand && !this.model.stack) ? (this.timeScale.rangeBand() / this.model.y.series.length) : 0;
    return timeScale + (adjustX * seriesNumber);
};

Axes.prototype.yPositions = function(d, i){
    var maxYValue = (this.model.stack) ? this.stackSeries(d, i) : d.value;
    return this.valueScale(Math.max(0, maxYValue));
};

Axes.prototype.stackSeries = function(d, stack){
    var model = this.model;
    if(!model.stacks )        model.stacks = [];
    if (!model.stacks[stack]) model.stacks[stack] = [];
    model.stacks[stack].push(d.value);
    return d3.sum(model.stacks[stack]);
};

Axes.prototype.ordinalScale = function (model) {
    var plotWidth = model.chartWidth - (getWidth(this.svg) - model.chartWidth);
    return d3.scale.ordinal()
        .domain(model.timeDomain)
        .rangeRoundBands([0, plotWidth], 0, this.margin);
};

Axes.prototype.timeScale = function (model) {
    return d3.time.scale()
        .domain(model.timeDomain)
        .range([0, model.chartWidth]);
};

Axes.prototype.addIndependentScale = function (scale) {
    var model = this.model;
    if(scale == 'ordinal'){
        this.timeScale = this.ordinalScale(model);
        this.timeAxis = axis.category();
    } else {
        this.timeScale = this.timeScale(model);
        this.timeAxis = axis.date();
    }
    this.timeAxis
        .simple(model.simpleDate)
        .yOffset(model.chartHeight)	//position the axis at the bottom of the chart
        .tickSize(model.tickSize)
        .scale(this.timeScale, this.model.units);
    this.svg.call(this.timeAxis);
};

Axes.prototype.addValueScale = function () {
    var model = this.model;
    this.valueScale = d3.scale.linear()
        .domain(model.valueDomain.reverse())
        .range([0, model.chartHeight]);

    if (model.niceValue) {
        this.valueScale.nice();
    }

    this.vAxis = axis.number()
        .tickFormat(model.numberAxisFormatter)
        .simple(model.simpleValue)
        .tickSize(model.chartWidth)	//make the ticks the width of the chart
        .scale(this.valueScale);

    if (model.numberAxisOrient !== 'right' && model.numberAxisOrient !== 'left') {
        this.vAxis.noLabels(true);
    } else {
        this.vAxis.orient(model.numberAxisOrient);
    }
    this.svg.call(this.vAxis);
};

Axes.prototype.extendedTicks = function () {
    var showsAllLabels = this.svg.selectAll('.x.axis .primary line')[0].length === this.svg.selectAll('.x.axis .primary text')[0].length;
    if (showsAllLabels) return;
    var model = this.model;
    var self = this;
    var extendedTicks_selector = ".x.axis .tick line[y2=\"" + (model.tickSize * this.tickExtender) + "\"]";
    var ticks_selector = ".x.axis .tick line";

    this.svg.selectAll(ticks_selector)
        .attr("y2", function (d) {
            var quarter = d.getMonth ? dateFormatter[model.units[0]](d) : d.toString();
            return (quarter.indexOf('Q1') === 0) ? (model.tickSize * self.tickExtender) : model.tickSize ;
        });
    var tickCount = this.svg.selectAll(ticks_selector)[0].length;
    var extendedCount = this.svg.selectAll(extendedTicks_selector)[0].length;
    if (extendedCount+2 >= tickCount){
        //take into account of first + last starting on something not q1
        this.svg.selectAll(extendedTicks_selector).attr("y2", model.tickSize);
    }
};

Axes.prototype.repositionAxis = function () {
    var model = this.model;

    if (model.groupData) { //todo: grr. two places!
        this.rearrangeLabels();
    }

    var xLabelHeight = getHeight(this.svg) - model.chartHeight;
    var yLabelWidth = getWidth(this.svg) - model.chartWidth;
    var plotHeight = model.chartHeight - xLabelHeight;
    var plotWidth = model.chartWidth - yLabelWidth;
    var vLabelWidth = 0;

    this.valueScale.range([this.valueScale.range()[0], plotHeight]);
    this.timeAxis.yOffset(plotHeight);
    this.vAxis.tickSize(plotWidth).tickExtension(yLabelWidth);

    if (this.timeScale.rangeRoundBands) {
        this.timeScale.rangeRoundBands([0, plotWidth], this.margin);
    } else {
        this.timeScale.range([this.timeScale.range()[0], plotWidth]);
    }

    this.svg.selectAll('*').remove();
    this.svg.call(this.vAxis);
    this.svg.call(this.timeAxis);

    if (model.groupData && model.tickSize>0) {
        this.rearrangeLabels();
        this.extendedTicks();
    }

    if (model.numberAxisOrient !== 'right') {
        this.svg.selectAll('.y.axis text').each(function () {
            vLabelWidth = Math.max(vLabelWidth, getWidth(d3.select(this)));
        });
        model.chartPosition.left += vLabelWidth + 4;//NOTE magic number 4
    }
    model.chartPosition.top += (getHeight(this.svg.select('.y.axis')) - plotHeight);
    model.plotWidth = plotWidth;
    model.plotHeight = plotHeight;

    this.svg.attr('transform', model.translate(model.chartPosition));
};

module.exports = Axes;
