var Cells = (function() {

    Cells.prototype.TYPES = {
        "ocean": "ocean",
        "land": "land"
    };

    Cells.prototype.getInitialPolygons = function() {
        var x = { min: 0, max: this.mask.width, kind: "integer" };
        var y = { min: 0, max: this.mask.height, kind: "integer" };
        var pointGenerator = new Stochator(x, y);
        var randomPoints = pointGenerator.next(this.count);
        var initialPoints = Util.Geom.relaxPoints(randomPoints, this.mask, 2);

        return Util.Geom.getClippedVoronoi(initialPoints, this.mask);
    };

    Cells.prototype.getInitialVertices = function(initialPolygons) {
        var vertices = {};
        initialPolygons.forEach(function(polygon, index) {
            this.setVertices(polygon, index, vertices);
        }, this);
        return vertices;
    };

    Cells.prototype.getCentroids = function(polygons) {
        return polygons.map(Util.Geom.polygonCentroid);
    };

    Cells.prototype.getParentContinents = function() {
        return this.centroids.map(this.continents.getContainingContinent, this.continents);
    };

    Cells.prototype.getContinentCentralities = function() {
        var getContinentCentrality = function(continent, index) {
            return continent.getPointCentrality(this.centroids[index]);
        };
        return this.parentContinents.map(getContinentCentrality, this);
    };

    Cells.prototype.getTemperatures = function() {
        var yMidpoint = this.mask.height / 2;
        var getTemperature = function(centroid) {
            var yCentrality = 1 - (Math.abs(yMidpoint - centroid[1]) / yMidpoint);
            var getTropicalTemperature = function(yCentrality) {
                return 0.8 + (yCentrality - 0.6) / 3;
            };
            return yCentrality > 0.6 ? getTropicalTemperature(yCentrality) : yCentrality;
        };
        return this.centroids.map(getTemperature);
    };

    Cells.prototype.getPolygons = function() {
        var initialPolygons = this.getInitialPolygons();
        this.vertices = this.getInitialVertices(initialPolygons);
        var getCentroid = Util.Array.getter(this.getCentroids(initialPolygons));
        var isEdgePoint = Util.Geom.edgeTester(this.mask.width, this.mask.height);
        var coordMean = function(coord) {
            if (isEdgePoint(coord)) return coord;
            return Util.Geom.roundPoint(Util.Geom.pointMean(this.mapVertex(coord, getCentroid)));
        };
        var relaxPolygon = function(polygon) {
            return Util.Geom.simplifyPolygon(polygon.map(coordMean, this));
        };
        return initialPolygons.map(relaxPolygon, this);
    };

    Cells.prototype.setVertices = function(polygon, index, vertices) {
        var getVertex = Util.Obj.defaultGetter(vertices, []);
        var addVertex = function(vertex) {
            return getVertex(vertex).concat(index);
        };
        var setVertex = function(vertex) {
            vertices[vertex] = addVertex(vertex);
        };
        polygon.forEach(setVertex);
    };

    Cells.prototype.getVertices = function() {
        var vertices = {};
        var averageArea = this.mask.area() / this.count;
        this.areas = [], this.landVertices = [];
        var getVertices = function(values, index) {
            var polygon = values[0], type = values[1];
            this.areas.push(d3.geom.polygon(polygon).area() / averageArea);
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

    Cells.prototype.getTypes = function(edgePolygons) {
        var landProbability = { min: 0.25, max: 0.75, kind: "float" };
        var landProbabilityGenerator = new Stochator(landProbability);
        var landProbabilities = landProbabilityGenerator.next(this.count);
        var properties = [landProbabilities, this.parentContinents, edgePolygons,
            this.continentCentralities];
        var getType = function(values, index) {
            var landProbability = values[0], continent = values[1], edgeCell = values[2],
                centrality = values[3];
            if (edgeCell) return this.TYPES.ocean;
            return centrality > landProbability ? this.TYPES.land: this.TYPES.ocean;
        };
        return Util.Array.multiMap(properties, getType, this);
    };

    Cells.prototype.getNeighborTypes = function() {
        var indexGetter = Util.Obj.attrGetter("index");
        var typeGetter = Util.Array.getter(this.types);
        return this.edges.map(function(edges) {
            return edges.map(indexGetter).map(typeGetter);
        });
    };

    Cells.prototype.getOceanNeighbors = function(neighborTypes) {
        var isOcean = Util.Function.equals("ocean");
        return neighborTypes.map(function(neighborTypes) {
            return neighborTypes.filter(isOcean).length / neighborTypes.length;
        });
    };

    Cells.prototype.getClusterExteriors = function(neighborTypes, edgePolygons) {
        var properties = [edgePolygons, neighborTypes, this.types];
        var getClusterExterior = function(values) {
            var edgePolygon = values[0], neighborTypes = values[1], type = values[2];
            var isSameType = Util.Function.equals(type);
            return edgePolygon ||
                neighborTypes.filter(isSameType).length < neighborTypes.length;
        };
        return Util.Array.multiMap(properties, getClusterExterior);
    };

    Cells.prototype.getRiverMoistures = function(riverVertices) {
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

    Cells.prototype.getMoistures = function(riverMoistures, oceanNeighbors) {
        var moistureScale = d3.scale.linear().clamp(true);
        var moistureVariator = new Stochator({ min: -0.3, max: 0 });
        var moistureSeeds = moistureVariator.next(this.count);
        var properties = [moistureSeeds, riverMoistures, oceanNeighbors];
        var getMoisture = function(values, index) {
            var moistureSeed = values[0], riverMoisture = values[1], oceanNeighbors = values[2];
            var moisture = Math.max(oceanNeighbors, riverMoisture);
            return moistureScale(moistureSeed + moisture);
        };
        return Util.Array.multiMap(properties, getMoisture, this);
    };

    Cells.prototype.getElevations = function(containingClusters, clusterEdges) {
        var elevationScale = d3.scale.linear().clamp(true);
        var elevationVariator = new Stochator({ min: 0, max: 0.3 });
        var elevationSeeds = elevationVariator.next(this.count);
        var properties = [elevationSeeds, this.types, this.centroids, this.continentCentralities,
            containingClusters, this.parentContinents];

        var getElevation = function(values, index) {
            var elevationSeed = values[0], type = values[1], centroid = values[2],
                continentCentrality = values[3], containingCluster = values[4],
                parentContinents = values[5];
            if (type == "ocean") return 0.1;

            var clusterEdge = clusterEdges[containingCluster];
            var coastDistance = Util.Geom.distanceToPolygon(centroid, clusterEdge[0]);
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

    Cells.prototype.getRivers = function(vertexElevations) {
        var riverGenerator = new Stochator({ min: 0.25, max: 1 }, {});
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

        var getRiverOrigins = function(vertex, elevation) {
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

        return Util.Obj.map(vertexElevations, getRiverOrigins).filter(Boolean)
            .map(getRiver).reduce(getUniqueRivers, []);
    };

    Cells.prototype.getWatersheds = function(rivers) {
        var riverRemover = new Stochator({});
        var sortByLongest = function(river1, river2) {
            return river2.length - river1.length;
        };
        var riversByLength = rivers.sort(sortByLongest);

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
        var setRiverVertex = Util.Obj.valueSetter(riverVertices, true);
        var setRiverVertices = function(river) { river.forEach(setRiverVertex); };
        d3.merge(this.watersheds).forEach(setRiverVertices);
        return riverVertices;
    };

    Cells.prototype.getClusters = function(interiorEdges) {
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
                interiorEdges[queue.pop()].map(getIndex).forEach(addToCluster);
            }

            return { cellType: type, cells: cells };
        };
        var properties = [this.edges, this.types];
        return Util.Array.multiMap(properties, getEdgeCluster, this).filter(Boolean);
    };

    Cells.prototype.getInteriorEdges = function(index) {
        var isInteriorEdge = function(edge) { return !edge.exterior && edge.points.length == 2; };
        var getInteriorEdges = Util.Function.filter(isInteriorEdge);
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

    Cells.prototype.getBiomeClassifications = function(biomes, oceanNeighbors) {
        var properties = [this.types, oceanNeighbors, this.elevations, this.temperatures,
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

    Cells.prototype.adjustTypesByCluster = function() {
        var majorContinentCells = Math.sqrt(this.count / this.continents.continentCount);
        var minimumLandCells = new Stochator({ kind: "integer", min: 0, max: majorContinentCells });
        var adjustClasses = function(cluster, clusterIndex) {
            if (cluster.cellType == "ocean") {
                if (cluster.cells.length < 3) {
                    this.setClusterType(cluster, "lake", 0);
                } else if (cluster.cells.length < 100) {
                    this.setClusterType(cluster, "sea", 0);
                }
            }
            //  else if (cluster.cellType == "land") {
            //     if (minimumLandCells.next() > cluster.cells.length) {
            //         this.setClusterType(cluster, "ocean");
            //     }
            // }
        };
        this.clusters.forEach(adjustClasses, this);
    };

    Cells.prototype.setClusterType = function(cluster, type, elevation) {
        var setType = function(index) {
            this.types[index] = type;
            if (elevation != null) this.elevations[index] = elevation;
        };
        cluster.cellType = type;
        cluster.cells.forEach(setType, this);
    };

    Cells.prototype.getClusterEdges = function(clusterExteriors) {
        var getClusterExterior = Util.Array.getter(clusterExteriors);
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

            var points = Util.Geom.stringsToPoints(pointStrings);
            points.push(points[0]);
            points.cellType = this.clusters[index].cellType;
            var polygons = [points];
            newClusters.forEach(function(clusterEdgePoints) {
                var additionalPolygons = getExteriorEdgePolygon.call(this, clusterEdgePoints, index);
                additionalPolygons.forEach(function(points) {
                    polygons.push(points);
                });
            }, this);

            var longestPolygon = function(polygon1, polygon2) {
                return polygon2.length - polygon1.length;
            };
            return polygons.sort(longestPolygon);

        };
        return this.clusters.map(getClusterCells)
            .map(getCellEdgePoints, this)
            .map(d3.merge)
            .map(getExteriorEdgePolygon, this);
    };

    Cells.prototype.getEdgePolygons = function() {
        var isEdgePolygon = Util.Geom.polygonEdgeTester(this.mask.width, this.mask.height);
        return this.polygons.map(isEdgePolygon);
    };

    function Cells(count, mask, continents, biomes) {
        // Initialize instance properties
        this.count = count;
        this.mask = mask;
        this.continents = continents;

        // Initialize cell polygons by relaxing the centroids and vertices of a random voronoi
        // diagram with the dimensions of the browser viewport.
        this.polygons = this.getPolygons();
        this.centroids = this.getCentroids(this.polygons);

        this.parentContinents = this.getParentContinents();
        this.continentCentralities = this.getContinentCentralities();
        this.temperatures = this.getTemperatures();

        var edgePolygons = this.getEdgePolygons();
        this.types = this.getTypes(edgePolygons);
        this.vertices = this.getVertices();
        this.edges = this.getEdges();

        var neighborTypes = this.getNeighborTypes();
        var oceanNeighbors = this.getOceanNeighbors(neighborTypes);

        var interiorEdges = this.getInteriorEdges();
        this.clusters = this.getClusters(interiorEdges);

        var clusterExteriors = this.getClusterExteriors(neighborTypes, edgePolygons);
        var clusterEdges = this.getClusterEdges(clusterExteriors);
        var containingClusters = this.getContainingClusters();
        this.elevations = this.getElevations(containingClusters, clusterEdges);

        this.adjustTypesByCluster();
        var vertexElevations = this.getVertexElevations();
        var rivers = this.getRivers(vertexElevations);
        this.watersheds = this.getWatersheds(rivers);

        var riverVertices = this.getRiverVertices();
        var riverMoistures = this.getRiverMoistures(riverVertices);
        this.moistures = this.getMoistures(riverMoistures, oceanNeighbors);
        this.biomes = this.getBiomeClassifications(biomes, oceanNeighbors);
    }

    return Cells;

})();
