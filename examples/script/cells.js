var Biomes = (function() {

    var BIOMES = {
        "TROPICAL_RAINFOREST": "tropical_rainforest",
        "TEMPERATE_RAINFOREST": "temperate_rainforest",
        "FOREST": "forest",
        "TROPICAL_FOREST": "tropical_forest",
        "TAIGA": "taiga",
        "SAVANNA": "savanna",
        "PRAIRIE": "prairie",
        "TUNDRA": "tundra",
        "DESERT": "desert",
        "OCEAN": "ocean",
        "DEEPWATER": "deepwater",
        "LAKE": "lake",
        "SEA": "sea"
    };

    Biomes.prototype.WATER_BIOMES = [BIOMES.DEEPWATER, BIOMES.OCEAN, BIOMES.LAKE, BIOMES.SEA];

    Biomes.prototype.BIOMES = BIOMES;

    Biomes.prototype.MOISTURE_TEMPERATURE_MATRIX = [
        [BIOMES.DESERT,              BIOMES.DESERT,               BIOMES.PRAIRIE, BIOMES.TAIGA, BIOMES.TUNDRA],
        [BIOMES.SAVANNA,             BIOMES.SAVANNA,              BIOMES.PRAIRIE, BIOMES.TAIGA],
        [BIOMES.TROPICAL_FOREST,     BIOMES.FOREST,               BIOMES.FOREST],
        [BIOMES.TROPICAL_FOREST,     BIOMES.TEMPERATE_RAINFOREST],
        [BIOMES.TROPICAL_RAINFOREST]
    ];

    Biomes.prototype.scales = {
        "temperature": d3.scale.linear().clamp(true),
        "moisture": d3.scale.linear().clamp(true).range([0.01, 0.99])
    };

    Biomes.prototype.classify = function(moisture, temperature, elevation) {
        var adjustedTemperature = this.scales.temperature(temperature - (elevation / 6));
        var quantizedMoisture = Math.floor(this.scales.moisture(moisture) * 5);
        var quantizedTemperature = 4 - Math.floor(adjustedTemperature * 4);
        var sum = quantizedMoisture + quantizedTemperature;
        if (sum > 4) {
            quantizedMoisture = Math.round(quantizedMoisture * 4 / sum);
            quantizedTemperature = Math.round(quantizedTemperature * 4 / sum);
        }

        return this.MOISTURE_TEMPERATURE_MATRIX[quantizedMoisture][quantizedTemperature];
    };

    Biomes.prototype.INTERPOLATORS = {
        "elevation": {
            "color": d3.rgb(0, 0, 0),
            "weight": 0.5
        },
        "moisture": {
            "color": d3.rgb(16, 96, 96),
            "weight": 0.5
        },
        "temperature": {
            "color": d3.rgb(128, 128, 16),
            "weight": 0.4
        }
    };

    Biomes.prototype.COLORS = {
        "sea": d3.rgb(0, 51, 119),
        "lake": d3.rgb(17, 68, 136),
        "tundra": d3.rgb(144, 180, 180),
        "taiga": d3.rgb(17, 85, 51),
        "forest": d3.rgb(42, 92, 42),
        "tropical_forest": d3.rgb(34, 85, 34),
        "temperate_rainforest": d3.rgb(17, 85, 34),
        "tropical_rainforest": d3.rgb(17, 68, 34),
        "prairie": d3.rgb(34, 85, 17),
        "savanna": d3.rgb(51, 102, 17),
        "desert": d3.rgb(128, 102, 17),
        "deepwater": d3.rgb(0, 17, 85),
        "ocean": d3.rgb(0, 28, 88)
    };

    Biomes.prototype.getStyle = function(biome, elevation, moisture, temperature) {
        var color = this.COLORS[biome];
        if (this.WATER_BIOMES.indexOf(biome) == -1) {
            var interpolators = this.INTERPOLATORS;
            var values = {
                "elevation": elevation, "moisture": moisture, "temperature": temperature
            };
            var interpolate = function(property, color) {
                var interpolator = interpolators[property];
                var value = values[property];
                return d3.interpolateRgb(color, interpolator.color)(value * interpolator.weight);
            };
            
            for (var property in values) {
                color = interpolate(property, color);
            }
        }

        return "fill: " + color + "; stroke: " + color;
    };

    function Biomes() {}

    return Biomes;

})();

var Cells = (function() {

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

    Cells.prototype.setCentroids = function() {
        this.centroids = [];
        this.temperatures = [];
        this.vertices = {};
        var setCentroid = function(polygon, index) {
            var centroid = Util.Geom.polygonCentroid(polygon);
            this.centroids.push(centroid);
            this.temperatures.push(this.getTemperature(centroid));
            this.setVertices(polygon, index, this.vertices);

            var continentIndex = this.continents.getContainingContinent(centroid);
            this.setParentContinent(index, this.continents.plates[continentIndex]);
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
        var yCentrality = 1 - (Math.abs(yMidpoint - centroid[1]) / yMidpoint);
        var getTropicalTemperature = function(yCentrality) {
            return 0.8 + (yCentrality - 0.6) / 3;
        };
        return yCentrality > 0.6 ? getTropicalTemperature(yCentrality) : yCentrality;
    };

    Cells.prototype.parentContinents = [];
    Cells.prototype.continentCentralities = [];

    Cells.prototype.setParentContinent = function(index, continent) {
        var centroid = this.centroids[index];
        this.parentContinents[index] = continent;
        this.continentCentralities[index] = continent.getPointCentrality(centroid);
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
        var getRiverMoisture = function(polygon) {
            return polygon.reduce(countRiverVertices, 0) / polygon.length;
        };
        return this.polygons.map(getRiverMoisture, this);
    };

    Cells.prototype.getMoistures = function() {
        var moistureScale = d3.scale.linear().clamp(true);
        var moistureVariator = new Stochator({ min: -0.3, max: 0 });
        var moistureSeeds = moistureVariator.next(this.count);
        var properties = [moistureSeeds, this.riverMoistures, this.oceanNeighbors];
        var getMoisture = function(values, index) {
            var moistureSeed = values[0], riverMoisture = values[1], oceanNeighbors = values[2];
            var moisture = Math.max(oceanNeighbors, riverMoisture);
            return moistureScale(moistureSeed + moisture);
        };
        return Util.Array.multiMap(properties, getMoisture, this);
    };

    Cells.prototype.getElevations = function() {
        var elevationScale = d3.scale.linear().clamp(true);
        var elevationVariator = new Stochator({ min: 0, max: 0.3 });
        var elevationSeeds = elevationVariator.next(this.count);
        var properties = [elevationSeeds, this.types, this.centroids, this.continentCentralities,
            this.containingClusters, this.parentContinents];
        var getElevation = function(values, index) {
            var elevationSeed = values[0], type = values[1], centroid = values[2],
                continentCentrality = values[3], containingCluster = values[4],
                parentContinents = values[5];
            if (type == "ocean") return 0.1;

            var clusterEdges = this.clusterEdges[containingCluster];
            var coastDistance = Util.Geom.distanceToPolygon(centroid, clusterEdges[0]);
            var elevationValue = coastDistance / parentContinents.vertexDistance + continentCentrality;
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

        var getRiverVertices = function(vertex, elevation) {
            var seedValues = riverGenerator.next();
            if (elevation > seedValues[0] && seedValues[1] < 0.25 && !isExteriorVertex(vertex)) {
                return vertex;
            }
        };

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
            if (!lowestNeighborEdge) return null;
            if (lowestNeighborEdge.exterior) {
                var type = _this.types[lowestNeighborEdge.index];
                if (type != 'sea' && type != 'lake') return null;
            }

            return lowestElevationVertex;
        };

        var getRiver = function(vertex) {
            var riverPoints = [];
            while (vertex) {
                riverPoints.push(vertex);
                vertex = getLowestNeighborVertex(vertex, riverPoints);
            }
            return riverPoints;
        };

        var getUniqueRivers = function(rivers, river) {
            var riverOrigin = river[0];
            var isRedundant = function(river) {
                return river.indexOf(riverOrigin) != -1;
            };
            if (!rivers.filter(isRedundant)[0]) rivers.push(river);
            return rivers;
        };

        return Util.Obj.map(vertexElevations, getRiverVertices)
            .filter(Boolean).map(getRiver).reduce(getUniqueRivers, []);
    };

    Cells.prototype.getRiverSlopes = function() {
        var vertexElevations = this.vertexElevations;
        var getRiverSlope = function(river) {
            return vertexElevations[river[0]] - vertexElevations[river[river.length - 1]];
        };
        return this.rivers.map(getRiverSlope);
    };

    Cells.prototype.getWatersheds = function() {
        var sortByLongest = function(river1, river2) {
            return river2.length - river1.length;
        };
        var riversByLength = this.rivers.sort(sortByLongest);

        return riversByLength.reduce(function(watersheds, river) {
            var watershed = [river];
            for (var i = 0; i < river.length; i++) {
                var vertex = river[i];
                var parentWatershed = watersheds.filter(function(otherWatershed) {
                    return otherWatershed.filter(function(otherRiver) {
                        return otherRiver.indexOf(vertex) != -1;
                    })[0];
                })[0];
                if (parentWatershed) {
                    var tributaryRiver = river.slice(0, i + 1);
                    if (tributaryRiver.length) {
                        parentWatershed.push(tributaryRiver);
                    }
                    break;
                }
            }
            if (!tributaryRiver) watersheds.push(watershed);
            return watersheds;
        }, []);

    };

    Cells.prototype.getRiverVertices = function() {
        var riverVertices = {};
        var setRiverVertices = function(river) {
            river.forEach(setRiverVertex);
        };
        var setRiverVertex = function(vertex) {
            riverVertices[vertex] = true;
        };
        this.rivers.forEach(setRiverVertices);
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

    Cells.prototype.getBiomeClassifications = function(biomes) {
        var properties = [this.types, this.oceanNeighbors, this.elevations, this.temperatures,
            this.moistures];
        var temperatureScale = d3.scale.linear().clamp(true);
        var moistureScale = d3.scale.linear().clamp(true);
        var getBiome = function(values, index) {
            var type = values[0], oceanNeighbors = values[1], elevation = values[2],
                temperature = values[3], moisture = values[4];
            if (type != "land") {
                if (type == "ocean" && oceanNeighbors > 0.75) return "deepwater";
                return type;
            }

            return biomes.classify(moisture, temperature, elevation);
        };

        return Util.Array.multiMap(properties, getBiome, this);
    };

    Cells.prototype.adjustClassesByCluster = function() {
        var majorContinentCells = Math.sqrt(this.count / this.continents.continentCount);
        var minimumLandCells = new Stochator({ kind: "integer", min: 0, max: majorContinentCells });
        var adjustClasses = function(cluster, clusterIndex) {
            if (cluster.cellType == "ocean") {
                if (cluster.cells.length < 3) {
                    this.setClusterCellType(cluster, "lake", 0);
                } else if (cluster.cells.length < 100) {
                    this.setClusterCellType(cluster, "sea", 0);
                }
            } else if (cluster.cellType == "land") {
                if (minimumLandCells.next() > cluster.cells.length) {
                    this.setClusterCellType(cluster, "ocean");
                }
            }
        };
        this.clusters.forEach(adjustClasses, this);
    };

    Cells.prototype.setClusterCellType = function(cluster, type, elevation) {
        var setType = function(index) {
            this.types[index] = type;
            if (elevation != null) this.elevations[index] = elevation;
        };
        cluster.cellType = type;
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

            return polygons.sort(function(polygon1, polygon2) {
                return polygon2.length - polygon1.length;
            });

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

    Cells.prototype.getMaskRadius = function() {
        return Util.Geom.distance([0, 0], [this.mask.width, this.mask.height]) / 2;;
    };

    Cells.prototype.getAverageRadius = function() {
        return this.maskRadius / Math.sqrt(this.count);
    };

    function Cells(count, mask, continents, biomes) {
        this.count = count;
        this.mask = mask;
        this.continents = continents;
        this.maskRadius = this.getMaskRadius();
        this.averageArea = this.mask.area() / this.count;
        this.averageRadius = this.getAverageRadius();
        this.isEdgePoint = Util.Geom.edgeTester(this.mask.width, this.mask.height);
        this.isEdgePolygon = Util.Geom.polygonEdgeTester(this.mask.width, this.mask.height);
        this.getRandomPoints = this.getPointGenerator();
        this.polygons = this.getPolygons();
        this.setCentroids();
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
        this.adjustClassesByCluster();
        this.vertexElevations = this.getVertexElevations();
        this.rivers = this.getRivers();
        this.watersheds = this.getWatersheds();
        this.riverSlopes = this.getRiverSlopes();
        this.riverVertices = this.getRiverVertices();
        this.riverMoistures = this.getRiverMoistures();
        this.moistures = this.getMoistures();
        this.biomeClassifications = this.getBiomeClassifications(biomes);
    }

    return Cells;

})();
