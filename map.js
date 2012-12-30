
var CellClusters = (function() {

    CellClusters.prototype.has = function(cellIndex) {
        return this.indexes[cellIndex];
    };

    CellClusters.prototype.forEach = function(iterator, context) {
        this.clusters.forEach(iterator, context || this);
    };

    CellClusters.prototype.map = function(iterator, context) {
        return this.clusters.map(iterator, context || this);
    };

    CellClusters.prototype.filter = function(iterator, context) {
        return this.clusters.filter(iterator, context || this);
    };


    CellClusters.prototype.addCluster = function(cluster) {
        this.clusters.push(cluster);
    };

    CellClusters.prototype.getCluster = function(clusterIndex) {
        return this.clusters[clusterIndex];
    };

    CellClusters.prototype.addToNewCluster = function(cellIndex, cellType) {
        this.indexes[cellIndex] = true;
        this.addCluster(new CellCluster(cellIndex, cellType))
    };

    CellClusters.prototype.addToCluster = function(clusterIndex, cellIndex) {
        this.indexes[cellIndex] = true;
        this.getCluster(clusterIndex).add(cellIndex);
    };

    CellClusters.prototype.getClusterIndex = function(cellIndex) {
        for (var clusterIndex = 0, cl = this.clusters.length; clusterIndex < cl; clusterIndex++) {
            if (this.clusters[clusterIndex].has(cellIndex)) {
                return clusterIndex;
            }
        }
        return -1;
    };

    CellClusters.prototype.removeCluster = function(clusterIndex) {
        this.clusters.splice(clusterIndex, 1);
    };

    CellClusters.prototype.removeDuplicates = function() {
        var sortCells = function(index1, index2) {
            return parseInt(index1, 10) - parseInt(index2, 10);
        };
        this.clusters = Util.Array.unique(this.clusters, function(cluster1, cluster2) {
            var sortedCells1 = cluster1.cells.sort(sortCells);
            var sortedCells2 = cluster2.cells.sort(sortCells);
            return sortedCells1.join(",") == sortedCells2.join(",");
        });
    };

    function CellClusters(count) {
        this.indexes = {};
        this.clusters = [];
        this.count = count;
    }

    return CellClusters;
})();

var CellCluster = (function() {

    CellCluster.prototype.has = function(cellIndex) {
        return this.indexes[cellIndex];
    };

    CellCluster.prototype.add = function(cellIndex) {
        this.indexes[cellIndex] = true;
        this.cells.push(cellIndex + "");
    };

    CellCluster.prototype.join = function(cluster) {
        cluster.cells.forEach(function(cellIndex) {
            if (!this.has(cellIndex)) {
                this.add(cellIndex);
            }
        }, this);
    };

    CellCluster.prototype.getExteriorCells = function() {
        return this.cells.filter(function(cellIndex) {
            return this.interiorCells.indexOf(cellIndex) == -1;
        }, this);
    };

    function CellCluster(cellIndex, cellType) {
        this.indexes = {};
        this.cells = [];
        this.add(cellIndex);
        this.cellType = cellType;
    }

    return CellCluster;
})();
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
            biomes = this.cells.biomes,
            elevations = this.cells.elevations;

        var setCellClass = function(d, i) {
            return "cell " + biomes[i] + " elevation-" + Math.round(elevations[i] * 10);
        };
        var setCellData = function(d, i) { return Util.SVG.polygonString(polygons[i]); };
        var cellAttrs = { "class": setCellClass, "d": setCellData };

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
        var rivers = this.cells.rivers;
        var setRiverData = function(d, i) {
            return Util.SVG.polygonString(rivers[i], true);
        };
        var setRiverStyle = function(d, i) {
            return "stroke-width: " + rivers[i].length + "px";
        };
        var cellAttrs = {
            "class": "river",
            "style": setRiverStyle,
            "d": setRiverData
        };
        var callback = function(nodes) { nodes.attr(cellAttrs) };
        
        this.bindData(this.riverNodes, rivers, "svg:path", callback);
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
        var cellOutputs = this.cells.biomes.map(function(cellClass, index) {
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
        var classCounts = Util.Array.count(this.cells.biomes);
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
            clusterIndex: this.cells.getContainingClusterIndex(index),
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
        this.continents = new ContinentalPlates(cellCount, this.mask);
        this.cells = new Cells(cellCount, this.mask, this.continents);
    }
    return CellMap;

})();
var Cells = (function() {

    Cells.prototype.CLASSIFICATIONS = [
        ["tropical-rainforest", "tropical-rainforest",  null,       null,       null    ],
        ["tropical-rainforest", "temperate-rainforest", "forest",   null,       null    ],
        ["tropical-forest",     "forest",               "forest",   "taiga",    null    ],
        ["tropical-forest",     "forest",               "forest",   "taiga",    "taiga" ],
        ["savanna",             "savanna",              "prairie",  "taiga",    "taiga" ],
        ["desert",              "desert",               "prairie",  "taiga",    "tundra"]
    ];

    Cells.prototype.TYPES = {
        "ocean": "ocean",
        "land": "land"
    };

    Cells.prototype.getPolygons = function() {
        var initialPoints;
        while (!initialPoints) {
            var randomPoints = this.getRandomPoints(this.count);
            try {
                initialPoints = Util.Geom.relaxPoints(randomPoints, this.mask, 1);
            } catch(e) {}
        }
        return Util.Geom.getClippedVoronoi(initialPoints, this.mask);
    };

    Cells.prototype.setCentroids = function(continents) {
        this.centroids = [];
        this.temperatures = [];
        this.vertices = {};
        var setCentroid = function(polygon, index) {
            var centroid = Util.Geom.polygonCentroid(polygon);
            this.centroids.push(centroid);
            this.temperatures.push(this.getTemperature(centroid));
            this.setVertices(polygon, index, this.vertices);

            var continentIndex = continents.getContainingContinent(centroid);
            this.setParentContinent(index, continents.plates[continentIndex]);
        };
        this.polygons.forEach(setCentroid, this);
    };

    Cells.prototype.setVertices = function(polygon, index, vertices) {
        var setVertex = function(vertex) {
            var value = vertices[vertex] || [];
            value.push(index);
            vertices[vertex] = value;
        };
        polygon.map(Util.Geom.pointToString).forEach(setVertex);
    };

    Cells.prototype.getVertices = function() {
        var vertices = {};
        this.areas = [], this.landVertices = [];
        var getVertices = function(values, index) {
            var polygon = values[0], type = values[1];
            this.areas.push(d3.geom.polygon(polygon).area() / this.averageArea);
            this.setVertices(polygon, index, vertices);
            if (type == "land") {
                this.landVertices = this.landVertices.concat(polygon);
            }
        };
        var properties = [this.polygons, this.types];
        Util.Array.multiEach(properties, getVertices, this);
        return vertices;
    };

    Cells.prototype.mapVertex = function(vertex, iterator) {
        return this.vertices[vertex].map(iterator);
    };

    Cells.prototype.getEdges = function() {
        var edges = [];
        var types = this.types;
        var getEdge = function(point, indexes) {
            var getConnections = function(index, i) {
                var type = types[index];
                var connections = edges[index] || [];
                for (var j = 0; j < indexes.length; j++) {
                    if (j == i) continue;

                    var otherIndex = indexes[j] + "";
                    var otherType = types[otherIndex];
                    var connection = null, newConnection = null;
                    for (var k = 0; k < connections.length; k++) {
                        if (connections[k].index == otherIndex) {
                            connection = connections[k];
                            break;
                        }
                    }
                    if (!connection) {
                        newConnection = {
                            exterior: type != otherType,
                            index: otherIndex,
                            points: [point]
                        };
                    } else {
                        if (connection.points.length == 1) {
                            connection.points.push(point);
                        } else if (point != connection.points[1]) {
                            newConnection = {
                                exterior: connection.exterior,
                                index: connection.index,
                                points: [connection.points[1], point]
                            };
                        }
                    }
                    if (newConnection) {
                        connections.push(newConnection);
                    }
                }
                edges[index] = connections;
            };
            indexes.forEach(getConnections);
        };
        Util.Obj.forEach(this.vertices, getEdge);
        return edges;
    };

    Cells.prototype.relaxVertices = function() {
        var getCentroid = Util.Array.getter(this.centroids);
        var coordMean = function(coord) {
            if (this.isEdgePoint(coord)) return coord;
            return Util.Geom.roundPoint(Util.Geom.pointMean(this.mapVertex(coord, getCentroid)));
        };
        var relaxPolygon = function(polygon) {
            return Util.Geom.simplifyPolygon(polygon.map(coordMean, this));
        };
        return this.polygons.map(relaxPolygon, this);
    };

    Cells.prototype.getTemperature = function(centroid) {
        var yMidpoint = this.mask.height / 2;
        return 1 - (Math.abs(yMidpoint - centroid[1]) / yMidpoint);
    };

    Cells.prototype.parentContinents = [];
    Cells.prototype.continentCentralities = [];
    Cells.prototype.continentEdgeDistances = [];

    Cells.prototype.setParentContinent = function(index, continent) {
        var centroid = this.centroids[index];
        this.parentContinents[index] = continent;    
        this.continentCentralities[index] = continent.getPointCentrality(centroid);
        this.continentEdgeDistances[index] = Math.min(1,
            Util.Geom.distanceToPolygon(centroid, continent.cell) / this.averageRadius);
    };

    Cells.prototype.getTypes = function() {
        var landProbability = { min: 0.2, max: 0.8, kind: "float" };
        var landProbabilityGenerator = new Stochator(landProbability);
        var landProbabilities = landProbabilityGenerator.next(this.count);
        var properties = [landProbabilities, this.parentContinents, this.edgePolygons,
            this.continentCentralities];
        var getType = function(values, index) {
            var landProbability = values[0], continent = values[1], edgeCell = values[2],
                centrality = values[3];
            if (edgeCell) return this.TYPES.ocean;
            return centrality > landProbability ? this.TYPES.land: this.TYPES.ocean;
        };
        return Util.Array.multiMap(properties, getType, this);
    };

    Cells.prototype.setNeighborTypes = function() {
        this.oceanNeighbors = [], this.clusterExteriors = [];
        var isOcean = Util.Function.equals("ocean");
        var indexGetter = Util.Obj.attrGetter("index");
        var typeGetter = Util.Array.getter(this.types);
        var setNeighborTypes = function(values, index) {
            var type = values[0], edges = values[1], edgeCell = values[2];
            var isSameType = Util.Function.equals(type);
            var neighborTypes = edges.map(indexGetter).map(typeGetter);
            var clusterExterior = edgeCell ||
                neighborTypes.filter(isSameType).length < neighborTypes.length;
            this.oceanNeighbors.push(neighborTypes.filter(isOcean).length / neighborTypes.length);
            this.clusterExteriors.push(clusterExterior);
        };

        var properties = [this.types, this.edges, this.edgePolygons];
        Util.Array.multiEach(properties, setNeighborTypes, this);
    };

    Cells.prototype.getRiverMoistures = function() {
        var riverVertices = this.riverVertices;
        var getLength = Util.Obj.attrGetter("length");
        var countRiverVertices = function(count, vertex) {
            if (riverVertices[Util.Geom.pointToString(vertex)]) return count + 1;
            return count;
        };
        var getRiverVertices = function(polygon) {
            return polygon.reduce(countRiverVertices, 0) / polygon.length;
        };
        return this.polygons.map(getRiverVertices, this);
    };

    Cells.prototype.getMoistures = function() {
        var moistureScale = d3.scale.linear().clamp(true);
        var moistureVariator = new Stochator({ min: -0.3, max: 0.3 });
        var moistureSeeds = moistureVariator.next(this.count);
        var sqrt2 = Math.sqrt(2);
        var properties = [moistureSeeds, this.riverMoistures, this.oceanNeighbors];
        var getMoisture = function(values, index) {
            var moistureSeed = values[0], riverMoisture = values[1], oceanNeighbors = values[2];
            var moisture = Math.sqrt(oceanNeighbors + riverMoisture) / sqrt2;
            return moistureScale(moistureSeed + moisture);
        };
        return Util.Array.multiMap(properties, getMoisture, this);
    };

    Cells.prototype.getElevations = function() {
        var elevationScale = d3.scale.linear().clamp(true);
        var elevationVariator = new Stochator({ min: -0.1, max: 0.1 });
        var elevationSeeds = elevationVariator.next(this.count);
        var properties = [elevationSeeds, this.types, this.centroids, this.continentEdgeDistances,
            this.containingClusters];
        var getElevation = function(values, index) {
            var elevationSeed = values[0], type = values[1], centroid = values[2],
                continentEdgeDistance = values[3], containingCluster = values[4];
            if (type == "ocean") return 0;

            var clusterEdges = this.clusterEdges[containingCluster];
            var coastDistance = Util.Geom.distanceToPolygons(centroid, clusterEdges);
            var elevationValue = Util.Math.geometricMean([coastDistance, continentEdgeDistance]) / 11;
            return elevationScale(elevationSeed + elevationValue);
        };
        return Util.Array.multiMap(properties, getElevation, this);
    };

    Cells.prototype.getVertexElevations = function() {
        var getElevation = Util.Array.getter(this.elevations);
        var vertexElevations = {};
        var edges = this.edges;
        var getVertexElevation = function(vertex) {
            var neighborElevations = this.mapVertex(vertex, getElevation);
            var meanElevation = Util.Math.mean(neighborElevations);
            vertexElevations[vertex] = meanElevation;
        };
        this.landVertices.forEach(getVertexElevation, this);

        return vertexElevations;
    };

    Cells.prototype.getIndexes = function() {
        return d3.range(this.count);
    };

    Cells.prototype.getRivers = function() {
        var riverGenerator = new Stochator({ min: 0.25, max: 1 }, {});
        var vertexElevations = this.vertexElevations;
        var _this = this;
        var vertices = this.vertices;
        var edges = this.edges;
        var riverOrigins = [];

        var getNeighborEdges = function(vertex) {        
            return _this.mapVertex(vertex, function(index) {
                var hasVertex = function(edge) {
                    return edge.points.indexOf(vertex) != -1;
                };
                return edges[index].filter(hasVertex);
            });
        };
        var isExteriorVertex = function(vertex) {
            var getExterior = Util.Obj.attrGetter("exterior");
            var hasExteriorEdge = function(edges) {
                return edges.some(getExterior);
            };
            return getNeighborEdges(vertex).some(hasExteriorEdge);
        };
        var getVertexElevation = function(vertex, value) {
            var seedValues = riverGenerator.next();
            if (value > seedValues[0] && seedValues[1] < 0.25 && !isExteriorVertex(vertex)) {
                riverOrigins.push(vertex);
            }
        };
        Util.Obj.forEach(vertexElevations, getVertexElevation);

        var getLowestNeighborVertex = function(vertex, riverPoints) {
            var neighborEdges = getNeighborEdges(vertex);
            var lowestElevation, lowestElevationVertex, lowestNeighborEdge;
            d3.merge(neighborEdges).forEach(function(neighborEdge) {
                var otherPointIndex = 1 - neighborEdge.points.indexOf(vertex);
                var otherPoint = neighborEdge.points[otherPointIndex];
                var elevation = vertexElevations[otherPoint];
                var isLowest = lowestElevationVertex == null || elevation < lowestElevation;
                if (isLowest && riverPoints.indexOf(otherPoint) == -1) {
                    lowestElevation = elevation;
                    lowestElevationVertex = otherPoint;
                    lowestNeighborEdge = neighborEdge;
                }
            });
            if (!lowestNeighborEdge || lowestNeighborEdge.exterior) {
                return null;
            }

            return lowestElevationVertex;          
        };

        var rivers = [];
        var getRiver = function(vertex) {
            var riverPoints = [];
            var count = 0;
            while (vertex) {
                riverPoints.push(vertex);
                vertex = getLowestNeighborVertex(vertex, riverPoints);
            }
            return riverPoints;
        };

        return riverOrigins.map(getRiver);
    };

    Cells.prototype.getRiverVertices = function() {
        var riverVertices = {};
        this.rivers.forEach(function(river) {
            river.forEach(function(vertex) {
                riverVertices[vertex] = true;
            });
        });
        return riverVertices;
    };

    Cells.prototype.getClusters = function() {
        var getIndex = Util.Obj.attrGetter("index");
        var visitedIndexes = {};
        var getEdgeCluster = function(values, index) {
            var edge = values[0], type = values[1];
            var startingIndex = index + "";
            if (visitedIndexes[startingIndex]) return;

            var cells = [], queue = [];
            var addToCluster = function(index) {
                if (!visitedIndexes[index]) {
                    cells.push(index);
                    queue.push(index);
                    visitedIndexes[index] = true;
                }
            };

            addToCluster(startingIndex);
            while (queue.length) {
                this.interiorEdges[queue.pop()].map(getIndex).forEach(addToCluster);
            }

            return { cellType: type, cells: cells };
        };
        var properties = [this.edges, this.types];
        return Util.Array.multiMap(properties, getEdgeCluster, this).filter(Boolean);
    };

    Cells.prototype.getInteriorEdges = function(index) {
        var isInteriorEdge = function(edge) {
            return !edge.exterior && edge.points.length == 2;
        };
        var getInteriorEdges = function(edges) {
            return edges.filter(isInteriorEdge);
        };
        return this.edges.map(getInteriorEdges);
    };

    Cells.prototype.getContainingClusters = function() {
        var containingClusters = [];
        var addClusterCells = function(cluster, clusterIndex) {
            var setter = Util.Array.valueSetter(containingClusters, clusterIndex);
            cluster.cells.forEach(setter);
        };
        this.clusters.forEach(addClusterCells);
        return containingClusters;
    };

    Cells.prototype.getBiomes = function() {
        var properties = [this.types, this.oceanNeighbors, this.elevations, this.temperatures,
            this.moistures];
        var temperatureScale = d3.scale.linear().clamp(true);
        var moistureScale = d3.scale.linear().clamp(true);
        var getBiome = function(values, index) {
            var type = values[0], oceanNeighbors = values[1], elevation = values[2],
                temperature = values[3], moisture = values[4];
            if (type != "land") {
                if (oceanNeighbors > 0.75) return "deepwater";
                return type;
            }
            moistureScale.range([0.01, temperature + 0.1]);
            temperature = temperatureScale(temperature - (elevation / 4));

            var quantizedMoisture = 5 - Math.floor(moistureScale(moisture) * 5);
            var quantizedTemperature = 4 - Math.floor(temperature * 4);

            return this.CLASSIFICATIONS[quantizedMoisture][quantizedTemperature];
        };

        return Util.Array.multiMap(properties, getBiome, this);
    };

    Cells.prototype.adjustBiomesByCluster = function() {
        var adjustBiomes = function(cluster, clusterIndex) {
            if (cluster.cellType == "ocean") {
                if (cluster.cells.length < 3) {
                    this.setClusterCellType(cluster, "lake", 0);
                } else if (cluster.cells.length < 100) {
                    this.setClusterCellType(cluster, "sea", 0);
                }
            }
        };
        this.clusters.forEach(adjustBiomes, this);
    };

    Cells.prototype.setClusterCellType = function(cluster, cellType, elevation) {
        var setType = function(index) {
            this.biomes[index] = cellType;
            if (elevation != null) this.elevations[index] = elevation;
        };
        cluster.cellType = cellType;
        cluster.cells.forEach(setType, this);
    };

    Cells.prototype.getPointGenerator = function() {
        var x = { min: 0, max: this.mask.width, kind: "integer" };
        var y = { min: 0, max: this.mask.height, kind: "integer" };
        var pointGenerator = new Stochator(x, y);
        return pointGenerator.next;
    };

    Cells.prototype.getClusterCentroids = function() {
        var getCentroid = Util.Array.getter(this.centroids);
        var getClusterCentroid = function(cluster) {
            return Util.Geom.pointMean(cluster.cells.map(getCentroid));
        };
        return this.clusters.map(getClusterCentroid, this);
    };

    Cells.prototype.getEdgeKey = function(index1, index2) {
        return index1 < index2 ? [index1, index2] : [index2, index1];
    };
    
    Cells.prototype.getClusterEdges = function() {
        var getClusterExterior = Util.Array.getter(this.clusterExteriors);
        var getClusterCells = Util.Obj.attrGetter("cells");
        var getEdgeExterior = Util.Obj.attrGetter("exterior");
        var getEdgePoints = Util.Obj.attrGetter("points");
        var isValidPoint = function(points) { return points.length == 2; };
        var getExteriorEdgePoints = function(index) {
            return this.edges[index].filter(getEdgeExterior)
                .map(getEdgePoints).filter(isValidPoint);
        };
        var getCellEdgePoints = function(cells) {
            return cells.filter(getClusterExterior, this).map(getExteriorEdgePoints, this);
        };

        var getExteriorEdgePolygon = function(clusterEdgePoints, index) {
            if (!clusterEdgePoints.length) return [];

            var newClusters = [];
            var currentEdgePoints = clusterEdgePoints.pop();
            var currentPoint = currentEdgePoints[0];
            var pointStrings = [currentPoint];
            var count = 0;
            var startingEdgePoints = clusterEdgePoints.slice();
            while (clusterEdgePoints.length) {
                var foundNextPoint = false;
                for (var i = 0; i < clusterEdgePoints.length; i++) {
                    var edgePoints = clusterEdgePoints[i];
                    var currentPointIndex = edgePoints.indexOf(currentPoint);
                    if (currentPointIndex != -1) {
                        currentPoint = edgePoints[1 - currentPointIndex];
                        pointStrings.push(currentPoint);
                        clusterEdgePoints.splice(i, 1);
                        foundNextPoint = true;
                        break;
                    }
                }
                if (!foundNextPoint) {
                    break;
                }
            }

            if (clusterEdgePoints.length) {
                newClusters.push(clusterEdgePoints);
            }

            var points = pointStrings.map(Util.Geom.stringToPoint);
            points.push(points[0]);
            points.cellType = this.clusters[index].cellType;
            var polygons = [points];
            newClusters.forEach(function(clusterEdgePoints) {
                var additionalPolygons = getExteriorEdgePolygon.call(this, clusterEdgePoints, index);
                additionalPolygons.forEach(function(points) {
                    polygons.push(points);
                });
            }, this);

            return polygons;

        };
        var clusterEdges = this.clusters.map(getClusterCells)
            .map(getCellEdgePoints, this)
            .map(d3.merge)
            .map(getExteriorEdgePolygon, this);

        return clusterEdges;
    };

    Cells.prototype.getEdgePolygons = function() {
        return this.polygons.map(this.isEdgePolygon);
    };

    Cells.prototype.getAverageRadius = function() {
        var maskRadius = Util.Geom.distance([0, 0], [this.mask.width, this.mask.height]) / 2;
        return maskRadius / this.count;
    };

    function Cells(count, mask, continents) {
        this.count = count;
        this.mask = mask;
        this.averageArea = this.mask.area() / this.count;
        this.averageRadius = this.getAverageRadius();
        this.isEdgePoint = Util.Geom.edgeTester(this.mask.width, this.mask.height);
        this.isEdgePolygon = Util.Geom.polygonEdgeTester(this.mask.width, this.mask.height);
        this.getRandomPoints = this.getPointGenerator();
        this.indexes = this.getIndexes();
        this.polygons = this.getPolygons();
        this.setCentroids(continents);
        this.polygons = this.relaxVertices();
        this.edgePolygons = this.getEdgePolygons();
        this.types = this.getTypes();
        this.vertices = this.getVertices();
        this.edges = this.getEdges();
        this.setNeighborTypes();
        this.interiorEdges = this.getInteriorEdges();
        this.clusters = this.getClusters();
        this.clusterCentroids = this.getClusterCentroids();
        this.clusterEdges = this.getClusterEdges();
        this.containingClusters = this.getContainingClusters();
        this.elevations = this.getElevations();
        this.vertexElevations = this.getVertexElevations();
        this.rivers = this.getRivers();
        this.riverVertices = this.getRiverVertices();
        this.riverMoistures = this.getRiverMoistures();
        this.moistures = this.getMoistures();
        this.biomes = this.getBiomes();
        this.adjustBiomesByCluster();
    }

    return Cells;

})();
var ContinentalPlates = (function() {

    ContinentalPlates.prototype.getPlateEdges = function() {
        var edges = d3.map();
        this.vertices.forEach(function(point, centroids) {
            for (var i = 0; i < centroids.length; i++) {
                for (var j = i + 1; j < centroids.length; j++) {
                    var centroidPair = [centroids[i], centroids[j]];
                    if (!edges.get(centroidPair)) {
                        edges.set(centroidPair, true);
                    }
                }
            }
        });
        return edges.keys();
    };

    ContinentalPlates.prototype.getPlateVertices = function() {
        var vertices = d3.map();
        this.plates.forEach(function(plate, plateIndex) {
            plate.cell.forEach(function(vertex) {
                var value = vertices.get(vertex) || [];
                value.push(plateIndex);
                vertices.set(vertex, value);
            });
        });
        return vertices;
    };

    ContinentalPlates.prototype.setPlates = function(plates, plateTypes) {
        this.plates = plates.map(function(continentCell, index) {
            return new ContinentalPlate(continentCell, plateTypes[index]);
        });
        this.vertices = this.getPlateVertices();
        this.edges = this.getPlateEdges();
    };

    ContinentalPlates.prototype.getContainingContinent = function(point) {
        var closestIndex = null, closestDistance = null;
        this.plates.forEach(function(continent, continentIndex) {
            var distance = Util.Geom.distance(point, continent.centroid);
            if (closestIndex == null || distance < closestDistance) {
                closestIndex = continentIndex, closestDistance = distance;
            };
        });
        return closestIndex;
    };

    ContinentalPlates.prototype.getInitialCentroids = function() {
        return this.getRandomPoints(this.continentCount);
    };

    ContinentalPlates.prototype.getPlates = function() {
        return Util.Geom.getClippedVoronoi(
            Util.Geom.relaxPoints(this.getInitialCentroids(), this.mask, 1),
            this.mask
        );
    }

    function ContinentalPlates(cellCount, mask) {
        var continentCountExp = new Stochator({ min: 0.2, max: 0.4 });
        this.continentCount = Math.pow(cellCount, continentCountExp.next());
        this.mask = mask;
        var pointGenerator = new Stochator(
            { min: 0, max: this.mask.width, kind: "integer" },
            { min: 0, max: this.mask.height, kind: "integer" }
        );
        this.getRandomPoints = pointGenerator.next;
        var plateTypeGenerator = new Stochator({
            kind: "set",
            values: ["land", "ocean"],
            weights: [0.8, 0.2]
        });
        var plates = this.getPlates();
        var plateTypes = plateTypeGenerator.next(plates.length);
        this.setPlates(plates, plateTypes);
    }

    return ContinentalPlates;

})();

var ContinentalPlate = (function() {

    ContinentalPlate.prototype.getVertexDistance = function() {
        var distanceSum = this.cell.map(function(point) {
            return Util.Geom.distance(point, this.centroid);
        }, this).reduce(function(distance1, distance2) {
            return distance1 + distance2;
        });
        return distanceSum / this.cell.length;
    }

    ContinentalPlate.prototype.getPointCentrality = function(point) {
        return 1 - (Util.Geom.distance(point, this.centroid) / this.vertexDistance);
    };

    function ContinentalPlate(cell, plateType) {
        this.cell = cell;
        this.plateType = plateType;
        this.centroid = Util.Geom.pointMean(this.cell);
        this.vertexDistance = this.getVertexDistance();
    }

    return ContinentalPlate;
})();
var Util = {};

Util.Geom = {};

Util.Geom.intersection = function(line1, line2) {
    var slope1 = Util.Geom.slope(line1[0], line1[1]);
    var intercept1 = Util.Geom.intercept(line1[0], line1[1]);
    var slope2 = Util.Geom.slope(line2[0], line2[1]);
    var intercept2 = Util.Geom.intercept(line2[0], line2[1]);

    return (intercept1 + intercept2) / (slope2 - slope1);
};

Util.Geom.slope = function(point1, point2) {
    return (point2[1] - point1[1]) / (point2[0] - point1[0]);
};

Util.Geom.intercept = function(point, slope) {
    return point[1] + slope * point[0];
};

Util.Geom.distanceSquared = function(point1, point2) {
    return Math.pow(point2[0] - point1[0], 2) + Math.pow(point2[1] - point1[1], 2);
};

Util.Geom.distance = function(point1, point2) {
    return Math.sqrt(Util.Geom.distanceSquared(point1, point2));
};

Util.Geom.createRectangle = function(topLeft, bottomRight) {
    var bottomLeft = [topLeft[0], bottomRight[1]];
    var topRight = [bottomRight[0], topLeft[1]];
    return d3.geom.polygon([
        topLeft, bottomLeft, bottomRight, topRight
    ]);
};

Util.Geom.pointSum = function(point1, point2) {
    return [point1[0] + point2[0], point1[1] + point2[1]];
};

Util.Geom.pointMean = function(points) {
    var pointsSum = points.reduce(Util.Geom.pointSum, [0, 0]);
    return [pointsSum[0] / points.length, pointsSum[1] / points.length];
};

Util.Geom.roundPoint = function(point, precision) {
    point[0] = Math.round(point[0]);
    point[1] = Math.round(point[1]);
    return point;
};

Util.Geom.roundPoints = function(points) {
    return points.map(Util.Geom.roundPoint);
};
Util.Geom.edgeTester = function(width, height) {
    return function(coord) {
        var isTopOrLeft = coord[0] === 0 || coord[1] === 0;
        var isBottomOrRight = coord[0] === width || coord[1] === height;
        return isTopOrLeft || isBottomOrRight;
    };
};
Util.Geom.polygonEdgeTester = function(width, height) {
    var edgeTest = Util.Geom.edgeTester(width, height);
    return function(polygon) {
        return polygon.some(edgeTest);
    };
};

Util.Geom.polygonCentroid = function(polygon) {
    return d3.geom.polygon(polygon).centroid();
};

Util.Geom.closestPointOnSegment = function(point, linePoint1, linePoint2) {
    var closestPoint = linePoint1;
    var lineXDistance = linePoint2[0] - linePoint1[0];
    var lineYDistance = linePoint2[1] - linePoint1[1];
    if (lineXDistance != 0 && lineYDistance != 0) {
        var squaredDistance = lineXDistance * lineXDistance + lineYDistance * lineYDistance;
        var pointXDistance = point[0] - linePoint1[0];
        var pointYDistance = point[1] - linePoint1[1];
        var t = (pointXDistance * lineXDistance + pointYDistance * lineYDistance) / squaredDistance;
        if (t > 1) {
            closestPoint = linePoint2;
        } else if (t > 0) {
            closestPoint = [linePoint1[0] + t * lineXDistance, linePoint1[1] + t * lineYDistance];
        }
    }
    return closestPoint;
};

Util.Geom.closestPointsOnPolygon = function(point, polygon) {
    var getClosestPoint = function(point1, point2) {
        return Util.Geom.closestPointOnSegment(point, point1, point2);
    };
    var closestPoints = [];
    for (var i = 0, pl = polygon.length; i < pl; i += 2) {
        var point1 = polygon[i], point2 = polygon[i + 1];
        if (!point2)  point2 = polygon[0];
        closestPoints.push(getClosestPoint(point1, point2))
    }
    return closestPoints;
};

Util.Geom.closestPoint = function(point, points) {
    var closestPoint = null, closestDistance = null;
    points.forEach(function(otherPoint) {
        var distance = Util.Geom.distance(point, otherPoint);
        if (closestDistance == null || distance < closestDistance) {
            closestPoints = point, closestDistance = distance;
        }
    });
    return closestPoint;
};

Util.Geom.distanceToPoints = function(point, points) {
    var getDistanceToPoint = function(otherPoint) {
        return Util.Geom.distance(point, otherPoint);
    };
    return points.map(getDistanceToPoint);
};

Util.Geom.distanceToPolygon = function(point, polygon) {
    var closestPoints = Util.Geom.closestPointsOnPolygon(point, polygon);
    var closestPointsDistances = Util.Geom.distanceToPoints(point, closestPoints);
    return Math.min.apply(Math, closestPointsDistances);
};

Util.Geom.distanceToPolygons = function(point, polygons) {
    return Util.Geom.distanceToPolygon(point, d3.merge(polygons));
};

Util.Geom.getClippedVoronoi = function(points, mask) {
    try {
        return d3.geom.voronoi(points)
            .map(mask.clip)
            .map(Util.Geom.roundPoints);
    } catch (e) {
        return null;
    }
};

Util.Geom.relaxPoints = function(points, mask, times) {
    d3.range(times).forEach(function() {
        points = Util.Geom.getClippedVoronoi(points, mask).map(Util.Geom.polygonCentroid);
    });
    return points;
};

Util.Geom.pointToString = function(point) {
    return point.join(",");
};

Util.Geom.stringToPoint = function(string) {
    var coords = string.split(",");
    return [parseInt(coords[0], 10), parseInt(coords[1], 10)];
};

Util.Geom.simplifyPolygon = function(polygon) {
    return Util.Array.unique(polygon, function(point1, point2) {
        return point1[0] == point2[0] && point1[1] == point2[1];
    });
};

Util.Obj = {};

Util.Obj.countValues = function(objs, attr) {    
    var count = {};
    return objs.reduce(function(count, obj) {
        count[obj[attr]] = (count[obj[attr]] || 0) + 1;
        return count;
    }, {});
};

Util.Obj.attrGetter = function(attr) {
    return function(obj) {
        return obj[attr];
    };
};

Util.Obj.forEach = function(obj, iterator, context) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            iterator.call(context || this, prop, obj[prop]);
        }
    }
};

Util.SVG = {};

Util.SVG.polygonString = function(points, open) {
    return "M" + points.join("L") + (open ? "" : "Z");
};

Util.Function = {};

Util.Function.compose = function(fn1, fn2) {
    return function() { fn2(fn1()); };
};

Util.Function.equals = function(compareValue) {
    return function(value) {
        return value === compareValue;
    };
};

Util.Array = {};

Util.Array.getPercentiles = function(array, percentiles, comparator) {
    var sorter = comparator || function(a, b) { return a - b; };
    var getter = Util.Array.getter(array.sort(sorter));
    var getPercentileIndex = function(percentile) {
        return Math.floor(array.length * percentile);
    };
    var percentileValues = percentiles.map(getPercentileIndex).map(getter);
    return Util.Array.toObject(d3.zip(percentiles, percentileValues));
};

Util.Array.toObject = function(array) {
    var obj = {};
    array.forEach(function(values) {
        obj[values[0]] = values[1];
    });
    return obj;
};

Util.Array.valueSetter = function(array, value) {
    return function(index) {
        array[index] = value;
    };
};

Util.Array.indexGetter = function(index) {
    return function(array) {
        return array[index];
    };
};

Util.Array.getter = function(array) {
    return function(index) {
        return array[index];
    };
};

Util.Array.count = function(array) {
    var counts = {};
    array.forEach(function(value) {
        counts[value] = (counts[value] || 0) + 1;
    });

    return counts;
};

Util.Array.zipMap = function() {
    var arrayCount = arguments.length - 1;
    var arrays = Array.prototype.slice.call(arguments, 0, arrayCount);
    var iterator = Array.prototype.slice.call(arguments, arrayCount)[0];
    var result = [];

    for (var index = 0; index < arrays[0].length; index++) {
        var values = arrays.map(Util.Array.indexGetter(index));
        result.push(iterator.apply(this, values));
    }
    return result;
};

Util.Array.unique = function(array, comparator) {
    var uniqueValues = [];
    comparator = comparator || function(value1, value2) {
        return value1 === value2;
    };
    for (var index1 = 0; index1 < array.length; index1++) {
        var value1 = array[index1];
        var isUnique = true;
        for (var index2 = 0; index2 < uniqueValues.length; index2++) {
            var value2 = uniqueValues[index2];
            if (comparator(value1, value2)) {
                isUnique = false;
                break;
            }
        }
        if (isUnique) {
            uniqueValues.push(value1);
        }
    }
    return uniqueValues;
};

Util.Array.multiMap = function(arrays, iterator, context) {
    var arrayLengths = arrays.map(Util.Obj.attrGetter("length"));
    var maxArrayLength = Math.max.apply(Math, arrayLengths);
    return d3.range(maxArrayLength).map(function(index) {
        return iterator.call(context || this, arrays.map(Util.Array.indexGetter(index)), index);
    });
};

Util.Array.multiEach = function(arrays, iterator, context) {
    var arrayLengths = arrays.map(Util.Obj.attrGetter("length"));
    var maxArrayLength = Math.max.apply(Math, arrayLengths);
    d3.range(maxArrayLength).forEach(function(index) {
        iterator.call(context || this, arrays.map(Util.Array.indexGetter(index)), index);
    });
};

Util.Array.sum = function(array) {
    return array.reduce(Util.Math.add);
};

Util.Array.indexFilter = function(array, iterator, context) {
    var indexes = [];
    array.forEach(function(value, index) {
        if (iterator.call(context || this, value)) {
            indexes.push(index);
        }
    });
    return indexes;
};

Util.Math = {};

Util.Math.clamp = function(number, min, max) {
    return Math.min(max, Math.max(min, number));
};

Util.Math.round = function(number, precision) {
    var coefficient = Math.pow(10, precision || 0);
    return Math.round(number * coefficient) / coefficient;
};

Util.Math.mean = function(numbers) {
    return Util.Array.sum(numbers) / numbers.length;
};

Util.Math.geometricMean = function(numbers) {
    var multiply = function(number1, number2) { return number1 * number2; };
    return Math.pow(numbers.reduce(multiply, 1), 1 / numbers.length);
};

Util.Math.add = function(number1, number2) {
    return number1 + number2;
};

