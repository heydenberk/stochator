var Cells = (function() {

    Cells.prototype.CLASSIFICATIONS = [
        ["tropical-rainforest", "temperate-rainforest", null,       null,       null    ],
        ["tropical-rainforest", "temperate-rainforest", "forest",   null,       null    ],
        ["tropical-forest",     "forest",               "forest",   "taiga",    null    ],
        ["tropical-forest",     "forest",               "forest",   "taiga",    "taiga" ],
        ["savanna",             "prairie",              "prairie",  "taiga",    "taiga" ],
        ["desert",              "savanna",              "prairie",  "prairie",  "tundra"]
    ];

    Cells.prototype.TYPES = {
        "ocean": "ocean",
        "land": "land"
    };

    Cells.prototype.getPolygons = function() {
        var randomPoints = this.getRandomPoints(this.count);
        var initialPoints = Util.Geom.relaxPoints(randomPoints, this.mask, 2);
        return Util.Geom.getClippedVoronoi(initialPoints, this.mask);
    }

    Cells.prototype.setCentroids = function(continents) {
        this.centroids = [];
        this.temperatures = [];
        this.vertices = d3.map();
        this.polygons.forEach(function(polygon, polygonIndex) {
            var centroid = Util.Geom.polygonCentroid(polygon);
            this.centroids.push(centroid);
            this.temperatures.push(this.getTemperature(centroid));
            polygon.forEach(function(vertex) {
                var value = this.vertices.get(vertex) || [];
                value.push(polygonIndex);
                this.vertices.set(vertex, value);
            }, this);

            var continentIndex = continents.getContainingContinent(centroid);
            this.setParentContinent(polygonIndex, continents.plates[continentIndex]);
        }, this);
    };

    Cells.prototype.getVertices = function() {
        var vertices = d3.map();
        this.areas = [];
        this.landVertices = [];
        this.polygons.forEach(function(polygon, polygonIndex) {
            this.areas.push(d3.geom.polygon(polygon).area() / this.averageArea);
            var type = this.types[polygonIndex];
            polygon.forEach(function(vertex) {
                var value = vertices.get(vertex) || [];
                value.push(polygonIndex);
                vertices.set(vertex, value);
                if (type == 'land') {
                    this.landVertices.push(vertex);
                }
            }, this);
        }, this);
        return vertices;
    };

    Cells.prototype.getEdges = function() {
        var edges = [];
        this.vertices.forEach(function(point, polygonIndexes) {
            for (var i = 0; i < polygonIndexes.length; i++) {
                var polygonIndex = polygonIndexes[i];
                var connections = edges[polygonIndex] || [];
                for (var j = 0; j < polygonIndexes.length; j++) {
                    if (j == i) continue;

                    var otherPolygonIndex = polygonIndexes[j];
                    if (connections.indexOf(otherPolygonIndex + "") == -1) {
                        connections.push(otherPolygonIndex + "");
                    }
                }
                edges[polygonIndex] = connections;
            }
        });
        return edges;
    };

    Cells.prototype.relaxVertices = function() {
        return this.polygons.map(function(polygon) {
            return polygon.map(function(coord) {
                if (this.isEdgePoint(coord)) return coord;
                var points = this.vertices.get(coord).map(this.getCentroid, this);
                return Util.Geom.roundPoint(Util.Geom.pointMean(points));
            }, this);
        }, this);
    };

    Cells.prototype.getCentroid = function(index) {
        return this.centroids[index];
    };

    Cells.prototype.getTemperature = function(centroid) {
        var yMidpoint = this.mask.height / 2;
        return 1 - (Math.abs(yMidpoint - centroid[1]) / yMidpoint);
    };

    Cells.prototype.parentContinents = [];
    Cells.prototype.continentCentralities = [];
    Cells.prototype.continentEdgeDistances = [];

    Cells.prototype.setParentContinent = function(cellIndex, continent) {
        var centroid = this.getCentroid(cellIndex);
        this.parentContinents[cellIndex] = continent;    
        this.continentCentralities[cellIndex] = continent.getPointCentrality(centroid);
        this.continentEdgeDistances[cellIndex] = Math.min(1,
            Util.Geom.distanceToPolygon(centroid, continent.cell) / (this.averageRadius * 2));
    };

    Cells.prototype.getContinentCentrality = function(cellIndex) {
        return this.continentCentralities[cellIndex];
    };

    Cells.prototype.isEdgeCell = function(index) {
        return this.isEdgePolygon(this.polygons[index]);
    };

    Cells.prototype.getTypes = function() {
        var landProbability = { min: 0.2, max: 0.8, kind: "float" };
        var landProbabilityGenerator = new Stochator(landProbability);
        var landProbabilities = landProbabilityGenerator.next(this.count);
        return landProbabilities.map(function(landProbability, cellIndex) {
            var continent = this.parentContinents[cellIndex];
            var isEdgeCell = this.isEdgeCell(cellIndex);
            var centrality = this.getContinentCentrality(cellIndex);
            if (isEdgeCell) return this.TYPES.ocean;
            return centrality > landProbability ? this.TYPES.land: this.TYPES.ocean;
        }, this);
    };

    Cells.prototype.getNeighborTypes = function(cellIndex) {
        return this.edges[cellIndex].map(function(neighborIndex) {
            return this.types[neighborIndex];
        }, this);
    };

    Cells.prototype.setCellGeography = function() {
        var altitudeVariator = new Stochator({ min: -0.3, max: 0.3 });
        var moistureVariator = new Stochator({ min: -0.3, max: 0.3 });
        this.altitudes = [];
        this.moistures = [];
        this.oceanNeighbors = [];
        this.types.forEach(function(cellType, index) {
            var continentEdgeDistance = this.continentEdgeDistances[index];
            var altitude = Math.max(0, altitudeVariator.next() + 1 - continentEdgeDistance);
            var neighborCellTypes = this.getNeighborTypes(index);
            var oceanNeighbors = neighborCellTypes.filter(function(neighborCellType) {
                return neighborCellType == "ocean";
            }).length;

            var moisture = Math.max(0, Math.min(1, moistureVariator.next() + oceanNeighbors / 3));
            this.oceanNeighbors.push(oceanNeighbors / neighborCellTypes.length);
            this.altitudes.push(altitude);
            this.moistures.push(moisture);
        }, this);
    };

    Cells.prototype.getClusters = function() {
        var clusters = new CellClusters(this.count);
        this.types.forEach(function(cellType, cellIndex) {
            if (clusters.has(cellIndex)) {
                return;
            }
            var addedToCluster = false;
            var neighbors = this.edges[cellIndex];
            var sameTypeNeighbors = [];
            neighbors.forEach(function(neighborCellIndex) {
                var neighborCellType = this.types[neighborCellIndex];
                if (neighborCellType == cellType) {
                    sameTypeNeighbors.push(neighborCellIndex);
                }
            }, this);

            var isInteriorCell = sameTypeNeighbors.length == neighbors.length;
            var addedToCluster = null;
            for (var i = 0; i < sameTypeNeighbors.length; i++) {
                var neighborCellIndex = sameTypeNeighbors[i];
                var clusterIndex = clusters.getClusterIndex(neighborCellIndex + "");
                if (clusterIndex > -1) {
                    var cluster = clusters.getCluster(clusterIndex);
                    if (addedToCluster == null) {
                        addedToCluster = clusterIndex;
                        cluster.add(cellIndex, isInteriorCell);
                    } else {
                        addedToCluster = clusters.getClusterIndex(cellIndex);
                        if (addedToCluster != clusterIndex) {
                            clusters.getCluster(addedToCluster).join(cluster, isInteriorCell);
                            clusters.removeCluster(clusterIndex);
                        }
                        
                    }
                    
                }
            }
            if (addedToCluster == null) {
                clusters.addToNewCluster(cellIndex, cellType, isInteriorCell);
            }
        }, this);
        return clusters;
    };

    Cells.prototype.getClasses = function() {
        return this.types.map(function(cellType, cellIndex) {
            if (cellType != "land") {
                if (this.oceanNeighbors[cellIndex] == 1) return "deepwater";
                return cellType;
            }
            var cellClass = cellType;
            var altitude = this.altitudes[cellIndex];
            var temperature = Util.Number.clamp(this.temperatures[cellIndex] - altitude + 0.1, 0, 1);
            var moisture = Util.Number.clamp(this.moistures[cellIndex], 0.01, temperature + 0.1);
            var quantizedMoisture = 5 - Math.floor(moisture * 5);
            var quantizedTemperature = 4 - Math.floor(temperature * 4);

            return this.CLASSIFICATIONS[quantizedMoisture][quantizedTemperature];
        }, this);
    };

    Cells.prototype.adjustClassesByCluster = function() {
        var oceanClusterIndex = this.getOceanClusterIndex();
        this.clusters.each(function(cluster, clusterIndex) {
            if (cluster.cellType == "ocean") {
                if (clusterIndex != oceanClusterIndex) {
                    if (cluster.cells.length < 3) {
                        this.setClusterCellType(cluster, "lake");
                    } else {
                        this.setClusterCellType(cluster, "sea");
                    }
                } else {
                    cluster.interiorCells.forEach(function(cellIndex) {
                        this.classes[cellIndex] = "deepwater";
                    }, this);
                }
            }
        }, this);
    };

    Cells.prototype.getOceanClusterIndex = function() {
        var mostOceanCells = null, mostOceanClusterIndex = null;
        this.clusters.each(function(cluster, clusterIndex) {
            if (cluster.cellType == "ocean") {
                if (!mostOceanCells || cluster.cells.length > mostOceanCells) {
                    mostOceanCells = cluster.cells.length, mostOceanClusterIndex = clusterIndex;
                }
            }
        });
        return mostOceanClusterIndex;
    };

    Cells.prototype.getLandVertices = function() {
        var _this = this;
        var landVertices = [];
        this.vertices.forEach(function(key, vertex) {
            var landNeighbors = vertex.filter(function(cellIndex) {
                return _this.types[cellIndex] == "land";;
            });
            if (landNeighbors.length) {
                landVertices.push(key.split(","));
            }
        });
        return landVertices;
    }

    Cells.prototype.setClusterCellType = function(cluster, cellType) {        
        cluster.cellType = cellType;
        cluster.cells.forEach(function(cellIndex) {
            this.classes[cellIndex] = cellType;
        }, this)
    };

    Cells.prototype.getPointGenerator = function() {
        var pointGenerator = new Stochator(
            { min: 0, max: this.mask.width, kind: "integer" },
            { min: 0, max: this.mask.height, kind: "integer" }
        );

        return pointGenerator.next;
    };

    Cells.prototype.setGeometry = function(count, mask) {
        this.count = count;
        this.mask = mask;
        this.maskRadius = Util.Geom.distance([0, 0], [this.mask.width, this.mask.height]) / 2;
        this.averageArea = mask.area() / count;
        this.averageRadius = this.maskRadius / Math.sqrt(count);
        this.isEdgePoint = Util.Geom.edgeTester(this.mask.width, this.mask.height);
        this.isEdgePolygon = Util.Geom.polygonEdgeTester(this.mask.width, this.mask.height);
        this.getRandomPoints = this.getPointGenerator();
    };

    Cells.prototype.getClusterCentroids = function() {
        return this.clusters.clusters.map(function(cluster) {
            return Util.Geom.pointMean(cluster.cells.map(this.getCentroid, this));
        }, this)
        
    };

    Cells.prototype.getClosestClusterByCellType = function(clusterIndex, cellType) {
        var clusterCentroid = this.clusterCentroids[clusterIndex]
        var closestCluster = null, closestDistance = null;
        this.clusterCentroids.forEach(function(otherClusterCentroid, otherClusterIndex) {
            var otherCluster = this.clusters.getCluster(otherClusterIndex);
            if (otherCluster.cellType != cellType) return;
            var distance = Util.Geom.distance(clusterCentroid, otherClusterCentroid);
            if (closestCluster == null || distance < closestDistance) {
                closestCluster = otherClusterIndex, closestDistance = distance;
            }
        }, this);
        return closestCluster;
    };

    Cells.prototype.traceClusters = function() {
        this.clusters.each(function(cluster) {
            // console.log(cluster.interiorCells.length);
        });
    };

    function Cells(count, mask, continents) {
        this.setGeometry(count, mask);
        this.polygons = this.getPolygons();
        this.setCentroids(continents);
        this.edges = this.getEdges();
        this.polygons = this.relaxVertices();
        this.types = this.getTypes();
        this.vertices = this.getVertices();
        this.setCellGeography();
        this.classes = this.getClasses();
        this.clusters = this.getClusters();
        this.traceClusters();
        this.clusterCentroids = this.getClusterCentroids();
        this.adjustClassesByCluster();
    }

    return Cells;

})();
