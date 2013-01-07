var CellMap = (function() {

    CellMap.prototype.drawCells = function() {
        var polygons = this.cells.polygons,
            classifications = this.cells.biomes,
            biomes = this.biomes,
            elevations = this.cells.elevations,
            moistures = this.cells.moistures,
            temperatures = this.cells.temperatures;

        var setCellStyle = function(d, i) {
            return biomes.getStyle(classifications[i], elevations[i], moistures[i], temperatures[i]);
        };

        var setCellData = function(d, i) {
            return Util.SVG.polygonString(polygons[i]);
        };
        var cellAttrs = { "class": "cell", "style": setCellStyle, "d": setCellData };

        var _this = this;
        var callback = function(nodes) {
            nodes.attr(cellAttrs).on("click", function(d, index) {
                _this.logCell(index);
            });
        };
        
        this.bindData(this.cellNodes, this.cells.centroids, "svg:path", callback);
    };

    CellMap.prototype.drawClusters = function() {
        var clusterEdges = d3.merge(this.cells.clusterEdges);
        var setClusterData = function(d, i) {
            return Util.SVG.polygonString(clusterEdges[i]);
        };
        var setClusterClass = function(d, i) {
            return "cluster " + clusterEdges[i].cellType;
        };
        var cellAttrs = { "class": setClusterClass, "d": setClusterData };
        var callback = function(nodes) { nodes.attr(cellAttrs) };
        
        this.bindData(this.clusterNodes, clusterEdges, "svg:path", callback);
    };

    CellMap.prototype.drawRivers = function() {
        var watersheds = d3.merge(this.cells.watersheds);
        var setRiverData = function(d, i) {
            return Util.SVG.polygonString(watersheds[i], true);
        };
        var setRiverStyle = function(d, i) {
            return "stroke-width: " + watersheds[i].length / 2 + "px";
        };
        var cellAttrs = {
            "class": "river",
            "style": setRiverStyle,
            "d": setRiverData
        };
        var callback = function(nodes) { nodes.attr(cellAttrs) };
        
        this.bindData(this.riverNodes, watersheds, "svg:path", callback);
    };

    CellMap.prototype.drawVertices = function() {
        var landVertices = this.cells.landVertices;
        var getVertex = Util.Obj.getter(this.cells.vertices);
        var getCentroid = Util.Array.getter(this.cells.centroids);
        var setMarkerData = function(d, i) {
            var vertex = landVertices[i];
            var getMarkerPoint = function(centroid) {
                return [vertex[0] * 0.8 + centroid[0] * 0.2, vertex[1] * 0.8 + centroid[1] * 0.2]
            };
            var markerPoints = getVertex(vertex).map(getCentroid).map(getMarkerPoint);
            return Util.SVG.polygonString(markerPoints);
        };
        var setX = function(d, i) { return landVertices[i][0]; };
        var setY = function(d, i) { return landVertices[i][1]; };

        var vertexAttrs = { "class": "vertex-marker", "x": setX, "y": setY, "d": setMarkerData };
        var callback = function(nodes) { nodes.attr(vertexAttrs); };


        this.bindData(this.vertexNodes, landVertices, "svg:path", callback);
    };

    CellMap.prototype.hideVertices = function() {
        this.vertexNodes.style("display", "none");
    };

    CellMap.prototype.showVertices = function() {
        this.vertexNodes.style("display", "");
    };

    CellMap.prototype.drawCellValues = function() {
        var centroids = this.cells.centroids;
        var maxOutput = 0;
        var maxOutputs = null;
        var cellOutputs = this.cells.biomes.map(function(cellClass, index) {
            var area = this.cells.areas[index];
            var outputs = this.biomes.getOutput(cellClass, area);
            var outputSum = Util.Array.sum(outputs);
            if (!maxOutputs || outputSum > maxOutput) {
                maxOutput = outputSum, maxOutputs = outputs;
            } 

            return outputs;
        }, this);

        console.log(maxOutput, maxOutputs);

        var callback = function(nodes) {
            var identity = function(d) { return d; };
            var scaleSize = function(d) { return Math.sqrt(d) * 2.5 };
            var colors = ["#DDD", "#FA6", "#F11"];
            nodes.classed("cell-value", true)
                .attr("transform", function(d, i) { return "translate(" + centroids[i].join(", ") + ")"; })
                .selectAll("circle").data(identity)
                .enter().append("circle")
                .attr("r", function(d) { return scaleSize(d) + "px"; })
                .attr("cx", function(d, i) { return (i - 1) * 15 + "px"; })
                .attr("cy", function(d) { return Math.sqrt(d) + "px"; })
                .style("fill", function(d, i) { return colors[i]; });

            nodes.selectAll("text").data(identity)
                .enter().append("text")
                .classed("cell-value", true)
                .text(function(d, i) { return d ? d : ""; })
                .attr("x", function(d, i) { return (i - 1) * 15 + "px"; })
                .attr("y", function(d) { return Math.sqrt(d) + scaleSize(d) / 2 + 1 + "px"; })
                .style("font-size", function(d) { return scaleSize(d) * 2 + "px "; });
        };
        this.bindData(this.cellValueNodes, cellOutputs, "g", callback);
            
    };

    CellMap.prototype.getCellNodes = function() {
        return this.svg.selectAll("path.cell");
    };

    CellMap.prototype.getVertexNodes = function() {
        return this.svg.selectAll("path.vertex-marker");
    };

    CellMap.prototype.getClusterNodes = function() {
        return this.svg.selectAll("path.cluster");
    };

    CellMap.prototype.getCellValueNodes = function() {
        return this.svg.selectAll("div.cell-value");
    };

    CellMap.prototype.getContinentBoundaryNodes = function() {
        return this.svg.selectAll("path.continent");
    };

    CellMap.prototype.getRiverNodes = function() {
        return this.svg.selectAll("path.river");
    };

    CellMap.prototype.getContainerNode = function() {
        return d3.select("div#container");
    };

    CellMap.prototype.getNodes = function() {
        this.svg = this.initializeSvg();
        this.container = this.getContainerNode();
        this.cellNodes = this.getCellNodes();
        this.clusterNodes = this.getClusterNodes();
        this.vertexNodes = this.getVertexNodes();
        this.cellValueNodes = this.getCellValueNodes();
        this.continentBoundaryNodes = this.getContinentBoundaryNodes();
        this.riverNodes = this.getRiverNodes();
    };

    CellMap.prototype.draw = function() {
        this.getNodes();
        this.drawCells();
        this.drawClusters();
        this.drawRivers();
        this.drawVertices();
        this.drawCellValues();
    };

    CellMap.prototype.bindData = function(nodes, data, element, callback) {
        callback(nodes.data(data).enter().append(element));
    };

    CellMap.prototype.drawContinentBoundaries = function() {
        var plates = this.continents.plates;
        var callback = function(nodes) {
            var setContinentPolygonData = function(d, i) {
                return Util.SVG.polygonString(plates[i].cell);
            };
            nodes.attr({ "class": "continent", "d": setContinentPolygonData });
        };

        this.bindData(this.continentBoundaryNodes, plates, "svg:path", callback);
    };

    CellMap.prototype.zoomPan = function(scaleCoefficient, centerPoint) {
        var container = d3.select("#container");
        var maskMidpoint = [this.mask.width * 0.5, this.mask.height * 0.5];
        if (scaleCoefficient && centerPoint) {
            var currentMidpoint = [maskMidpoint[0] * 0.9, maskMidpoint[1] * 0.9];
            var offset = [centerPoint[0] * 2 - currentMidpoint[0], centerPoint[1] * 2 - currentMidpoint[1]];
            var x = Util.Math.clamp(offset[0], 0, maskMidpoint[0] * 3);
            var y = Util.Math.clamp(offset[1], 0, maskMidpoint[1] * 3);

            container.style("zoom", scaleCoefficient).style("padding", "10%");

            this.svg.classed("zoom-" + scaleCoefficient, true);
            document.body.scrollLeft = x;
            document.body.scrollTop = y;
        } else {
            container.style("zoom", 1).style("padding", "0");
            this.svg.classed("zoom-" + this.zoom, false);
            document.body.scrollLeft = 0;
            document.body.scrollTop = 0;
        }
        this.zoom = scaleCoefficient;
    };

    CellMap.prototype.zoom = 1;

    CellMap.prototype.initializeSvg = function() {
        var size = { "width": this.mask.width, "height": this.mask.height };
        return d3.select("svg#map").attr(size);
    };

    CellMap.prototype.setMapGeometry = function() {
        var docEl = document.documentElement;
        var width = docEl.clientWidth, height = docEl.clientHeight;
        this.mask = Util.Geom.createRectangle([0, 0], [width, height]);
        this.mask.width = width, this.mask.height = height;
    };

    CellMap.prototype.logData = function() {
        var classCounts = Util.Array.count(this.cells.biomes);
        var percentiles = [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99];
        console.log("class counts", classCounts);
        console.log("moisture percentiles",
            Util.Array.getPercentiles(this.cells.moistures, percentiles));
        console.log("elevation percentiles",
            Util.Array.getPercentiles(this.cells.elevations, percentiles));
        console.log("temperature percentiles",
            Util.Array.getPercentiles(this.cells.temperatures, percentiles));
        console.log("area percentiles",
            Util.Array.getPercentiles(this.cells.areas, percentiles));

        var countLengths = function(count, river) {
            return count + river.length;
        };
        var riversLength = this.cells.watersheds.reduce(function(count, watershed) {
            return count + watershed.reduce(countLengths, 0);
        }, 0);
        console.log("rivers", this.cells.watersheds.length, "total length", riversLength);
    };

    CellMap.prototype.logCell = function(index) {
        console.log("Click", [d3.event.x, d3.event.y]);
        console.log({
            elevation: this.cells.elevations[index],
            index: index,
            temperature: this.cells.temperatures[index]
        });
    };

    CellMap.prototype.reinit = function() {
        this.svg.selectAll("*").remove();
        this.constructor.call(this, this.cells.count);
    };

    function CellMap(cellCount) {
        
        console.profile('map geometry');
        this.setMapGeometry();
        console.profileEnd('map geometry');
        
        console.profile('biomes');
        this.biomes = new Biomes();
        console.profileEnd('biomes');
        
        console.profile('continents');
        this.continents = new ContinentalPlates(cellCount, this.mask);
        console.profileEnd('continents');
        
        console.profile('cells');
        this.cells = new Cells(cellCount, this.mask, this.continents, this.biomes);
        console.profileEnd('cells');

        console.profile('draw');
        this.draw();
        console.profileEnd('draw');
    }
    return CellMap;

})();
