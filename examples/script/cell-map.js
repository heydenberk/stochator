var CellMap = (function() {

    CellMap.prototype.CELL_CLASS_OUTPUTS = {
        "lake": { mineral: 0, food: 4, energy: 0 },
        "ocean": { mineral: 0, food: 4, energy: 1 },
        "deepwater": { mineral: 0, food: 0, energy: 0 },
        "sea": { mineral: 0, food: 6, energy: 1 },
        "mountain": { mineral: 8, food: 1, energy: 2 },
        "snow": { mineral: 2, food: 0, energy: 2 },
        "tundra": { mineral: 1, food: 1, energy: 1 },
        "forest": { mineral: 2, food: 4, energy: 4 },
        "prairie": { mineral: 1, food: 5, energy: 2 },
        "taiga": { mineral: 1, food: 2, energy: 2 },
        "tropical-forest": { mineral: 1, food: 6, energy: 2 },
        "tropical-rainforest": { mineral: 1, food: 6, energy: 2 },
        "temperate-rainforest": { mineral: 1, food: 6, energy: 2 },
        "rainforest": { mineral: 1, food: 6, energy: 2 },
        "savanna": { mineral: 2, food: 5, energy: 3 },
        "desert": { mineral: 3, food: 0, energy: 3 }
    };

    CellMap.prototype.drawCells = function() {
        var polygons = this.cells.polygons,
            classifications = this.cells.biomeClassifications,
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
        // var rivers = this.cells.rivers;
        // var riverSlopes = this.cells.riverSlopes;
        var watersheds = d3.merge(this.cells.watersheds);
        var setRiverData = function(d, i) {
            return Util.SVG.polygonString(watersheds[i], true);
        };
        var setRiverStyle = function(d, i) {
            // return "stroke-width: " + Math.floor(riverSlopes[i] * 10) + "px";
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
        var setCircleX = function(d, i) { return landVertices[i][0]; };
        var setCircleY = function(d, i) { return landVertices[i][1]; };

        var vertexAttrs = { "class": "vertex", "r": 5, "cx": setCircleX, "cy": setCircleY };
        var callback = function(nodes) { nodes.attr(vertexAttrs); };

        this.bindData(this.vertexNodes, landVertices, "svg:circle", callback);
    };

    CellMap.prototype.hideVertices = function() {
        this.vertexNodes.style("display", "none");
    };

    CellMap.prototype.showVertices = function() {
        this.vertexNodes.style("display", "");
    };

    CellMap.prototype.drawCellValues = function() {
        var centroids = this.cells.centroids;
        var cellOutputs = this.cells.biomeClassifications.map(function(cellClass, index) {
            var area = this.cells.areas[index];
            var outputs = this.CELL_CLASS_OUTPUTS[cellClass];
            if (!outputs) {
                console.log(cellClass);
            }
            return {
                food: Math.ceil(outputs.food * area),
                energy: Math.ceil(outputs.energy * area),
                mineral: Math.ceil(outputs.food * area)
            };
        }, this);

        var callback = function(nodes) {
            nodes.attr("class", "cell-value")
                .style("left", function(d, i) { return centroids[i][0] - 15 + "px"; })
                .style("top", function(d, i) { return centroids[i][1] - 6  + "px"; })
                .html(function(d, i) {
                    var cellValue = cellOutputs[i];
                    if (cellValue.food || cellValue.mineral || cellValue.energy) {
                        return cellValue.food + ", " + cellValue.mineral + ", " + cellValue.energy;
                    }
                });
        };
        this.bindData(this.cellValueNodes, cellOutputs, "div", callback);
            
    };

    CellMap.prototype.getCellNodes = function() {
        return this.svg.selectAll("path.cell");
    };

    CellMap.prototype.getVertexNodes = function() {
        return this.svg.selectAll("circle.vertex");
    };

    CellMap.prototype.getClusterNodes = function() {
        return this.svg.selectAll("path.cluster");
    };

    CellMap.prototype.getCellValueNodes = function() {
        return d3.select("#mask").selectAll("div.cell-value");
    };

    CellMap.prototype.getContinentBoundaryNodes = function() {
        return this.svg.selectAll("path.continent");
    };

    CellMap.prototype.getRiverNodes = function() {
        return this.svg.selectAll("path.river");
    };


    CellMap.prototype.getNodes = function() {
        this.svg = this.initializeSvg();
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
        var scale = "scale(" + scaleCoefficient + "," + scaleCoefficient + ")";
        var transforms = [scale];
        if (centerPoint) {
            var translatePoint = [
                this.mask.width / 2 - centerPoint[0],
                this.mask.height / 2 - centerPoint[1]
            ];
            var translate = "translate(" + translatePoint.join("px, ") + "px)";
            transforms.push(translate);
        }
        this.svg[0][0].style.webkitTransform = transforms.join(" ");
    };

    CellMap.prototype.isZoomed = false;

    CellMap.prototype.initializeSvg = function() {
        var _this = this;
        return d3.select("svg#map")
            .attr({ "width": this.mask.width, "height": this.mask.height })
            .on("dblclick", function() {
                if (_this.isZoomed) {
                    _this.isZoomed = false;
                    _this.zoomPan(1);
                } else {
                    _this.isZoomed = [_this.mask.width / 2, _this.mask.height / 2];
                    _this.zoomPan(2, [d3.event.x, d3.event.y]);
                }
            });
    };

    CellMap.prototype.setMapGeometry = function() {
        var docEl = document.documentElement;
        var width = docEl.clientWidth, height = docEl.clientHeight;
        this.mask = Util.Geom.createRectangle([0, 0], [width, height]);
        this.mask.width = width, this.mask.height = height;
    };

    CellMap.prototype.logData = function() {
        var classCounts = Util.Array.count(this.cells.biomeClassifications);
        var percentiles = [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99];
        console.log("class counts", classCounts);
        console.log("moisture percentiles",
            Util.Array.getPercentiles(this.cells.moistures, percentiles));
        console.log("riverMoisture percentiles",
            Util.Array.getPercentiles(this.cells.riverMoistures, percentiles));
        console.log("elevation percentiles",
            Util.Array.getPercentiles(this.cells.elevations, percentiles));
        console.log("temperature percentiles",
            Util.Array.getPercentiles(this.cells.temperatures, percentiles));
        var riversLength = this.cells.rivers.reduce(function(count, river) {
            return count + river.length;
        }, 0);
        console.log("rivers", this.cells.rivers.length, "total length", riversLength);
    };

    CellMap.prototype.logCell = function(index) {
        console.log({
            clusterIndex: this.cells.containingClusters[index],
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
        this.setMapGeometry();
        this.biomes = new Biomes();
        this.continents = new ContinentalPlates(cellCount, this.mask);
        this.cells = new Cells(cellCount, this.mask, this.continents, this.biomes);
    }
    return CellMap;

})();
