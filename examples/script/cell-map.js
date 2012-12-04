var ContinentalPlates = (function() {

    ContinentalPlates.prototype.getPlateEdges = function() {
        var edges = d3.map();
        var _this = this;
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
        this.continentCount = Math.pow(cellCount, 1/3);
        this.mask = mask;
        var pointGenerator = new Stochator(
            { min: 0, max: this.mask.width, kind: 'integer' },
            { min: 0, max: this.mask.height, kind: 'integer' }
        );
        this.getRandomPoints = pointGenerator.next;
        var plateTypeGenerator = new Stochator({
            kind: 'set',
            values: ['land', 'ocean'],
            weights: [0.8, 0.2]
        });
        var plates = this.getPlates();
        var plateTypes = plateTypeGenerator.next(plates.length);
        this.setPlates(plates, plateTypes);
    }

    return ContinentalPlates;

})();

var Cells = (function() {

    Cells.prototype.getPolygons = function() {
        var initialPoints = Util.Geom.relaxPoints(this.getRandomPoints(this.count), this.mask, 2);
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
        this.polygons.forEach(function(polygon, polygonIndex) {
            this.areas.push(d3.geom.polygon(polygon).area() / this.averageArea);
            polygon.forEach(function(vertex) {
                var value = vertices.get(vertex) || [];
                value.push(polygonIndex);
                vertices.set(vertex, value);
            });
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
                    if (connections.indexOf(otherPolygonIndex + '') == -1) {
                        connections.push(otherPolygonIndex + '');
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
        this.continentEdgeDistances[cellIndex] = Util.Geom.distanceToPolygon(centroid, continent.cell);
    };

    Cells.prototype.getContinentCentrality = function(cellIndex) {
        return this.continentCentralities[cellIndex];
    };

    Cells.prototype.isEdgeCell = function(index) {
        return this.isEdgePolygon(this.polygons[index]);
    };

    Cells.prototype.getInititalTypes = function() {
        var landProbability = { min: 0.2, max: 0.8, kind: 'float' };
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
        var moistureVariation = new Stochator({ min: -0.1, max: 0.3 });
        this.altitudes = [];
        this.moistures = [];
        this.oceanNeighbors = [];
        this.types.forEach(function(cellType, index) {
            var continentEdgeDistance = this.continentEdgeDistances[index];
            var altitude = 1 - Math.min(1, continentEdgeDistance / (this.averageRadius * 2));
            var neighborCellTypes = this.getNeighborTypes(index);
            var oceanNeighbors = neighborCellTypes.filter(function(neighborCellType) {
                return neighborCellType == 'ocean';
            }).length;

            var moisture = Math.max(0, Math.min(1, moistureVariation.next() + oceanNeighbors / 3));
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
                var clusterIndex = clusters.getClusterIndex(neighborCellIndex + '');
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
            if (cellType != 'land') {
                if (this.oceanNeighbors[cellIndex] == 1) return 'deepwater';
                return cellType;
            }
            var moisture = this.moistures[cellIndex];
            var cellClass = cellType;
            var temperature = this.temperatures[cellIndex];
            var altitude = this.altitudes[cellIndex];
            var adjustedTemperature = Math.min(1, Math.max(0, temperature - altitude + 0.1));
            if (altitude > 0.75) {
                cellClass = 'mountain';
            } else if (moisture < 0.075) {
                cellClass = 'desert';
            } else if (adjustedTemperature < 0.25) {
                if (altitude > 0.5) {
                    cellClass = 'mountain';
                } else if (moisture > 0.5) {
                    cellClass = 'snow';
                } else {
                    cellClass = 'tundra';
                }
            } else if (adjustedTemperature < 0.5) {
                if (moisture > 0.75) {
                    cellClass = 'forest';
                } else if (moisture > 0.5) {
                    cellClass = 'prairie';
                } else {
                    cellClass = 'taiga';
                }
            } else if (adjustedTemperature < 0.75) {
                if (moisture > 0.5) {
                    cellClass = 'forest';
                } else {
                    cellClass = 'prairie';
                }
            } else {
                if (moisture > 0.75) {
                    cellClass = 'rainforest';
                } else if (moisture > 0.25) {
                    cellClass = 'savannah';
                } else {
                    cellClass = 'desert';
                }
            }
            return cellClass;
        }, this);
    };

    Cells.prototype.adjustClassesByCluster = function() {
        var oceanClusterIndex = this.getOceanClusterIndex();
        this.clusters.each(function(cluster, clusterIndex) {
            if (cluster.cellType == 'ocean') {
                if (clusterIndex != oceanClusterIndex) {
                    if (cluster.cells.length < 3) {
                        this.setClusterCellType(cluster, 'lake');
                    } else {
                        this.setClusterCellType(cluster, 'sea');
                    }
                } else {
                    cluster.interiorCells.forEach(function(cellIndex) {
                        this.classes[cellIndex] = 'deepwater';
                    }, this);
                }
            }
        }, this);
    };

    Cells.prototype.getOceanClusterIndex = function() {
        var mostOceanCells = null, mostOceanClusterIndex = null;
        this.clusters.each(function(cluster, clusterIndex) {
            if (cluster.cellType == 'ocean') {
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
                return _this.types[cellIndex] == 'land';;
            });
            if (landNeighbors.length) {
                landVertices.push(key.split(','));
            }
        });
        console.log(landVertices.length, this.vertices.keys().length)
        return landVertices;
    }

    Cells.prototype.setClusterCellType = function(cluster, cellType) {        
        cluster.cellType = cellType;
        cluster.cells.forEach(function(cellIndex) {
            this.classes[cellIndex] = cellType;
        }, this)
    };

    Cells.prototype.setGeometry = function(count, mask) {
        this.count = count;
        this.mask = mask;
        this.maskRadius = Util.Geom.distance([0, 0], [this.mask.width, this.mask.height]) / 2;
        this.averageArea = mask.area() / count;
        this.averageRadius = this.maskRadius / Math.sqrt(this.count);
        this.isEdgePoint = Util.Geom.edgeTester(this.mask.width, this.mask.height);
        this.isEdgePolygon = Util.Geom.polygonEdgeTester(this.mask.width, this.mask.height);

        var pointGenerator = new Stochator(
            { min: 0, max: this.mask.width, kind: 'integer' },
            { min: 0, max: this.mask.height, kind: 'integer' }
        );
        this.getRandomPoints = pointGenerator.next;
    };

    Cells.prototype.TYPES = {
        'ocean': 'ocean',
        'land': 'land'
    };

    function Cells(count, mask, continents) {
        this.setGeometry(count, mask);
        this.polygons = this.getPolygons();
        this.setCentroids(continents);
        this.edges = this.getEdges();
        this.polygons = this.relaxVertices();
        this.vertices = this.getVertices();
        this.types = this.getInititalTypes();
        this.setCellGeography();
        this.classes = this.getClasses();
        this.clusters = this.getClusters();
        this.adjustClassesByCluster();
        this.landVertices = this.getLandVertices();
    }

    return Cells;

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

var CellMap = (function() {
    CellMap.prototype.drawCells = function() {

        var polygons = this.cells.polygons, cellClasses = this.cells.classes;
        var _this = this;
        this.cellNodes.data(this.cells.centroids).enter().append("svg:path").attr("class", "cell")
            .attr("d", function(d, i) { return Util.SVG.polygonString(polygons[i]); })
            .attr("class", function(d, i) { return "cell " + cellClasses[i]; });
    };

    CellMap.prototype.drawVertices = function() {
        var _this = this;
        var callback = function(nodes) {
            var setCircleX = function(d, i) { return _this.cells.landVertices[i][0]; };
            var setCircleY = function(d, i) { return _this.cells.landVertices[i][1]; };
            nodes.attr("class", "vertex")
                .attr("r", 5)
                .attr("cx", setCircleX)
                .attr("cy", setCircleY);
        };
        this.bindData(this.vertexNodes, this.cells.landVertices, "svg:circle", callback);
    };

    CellMap.prototype.hideVertices = function() {
        this.vertexNodes.style('display', 'none');
    };

    CellMap.prototype.showVertices = function() {
        this.vertexNodes.style('display', '');
    };

    CellMap.prototype.drawCellValues = function() {
        var _this = this;
        var cellOutputs = this.cells.classes.map(function(cellClass, index) {
            var area = this.cells.areas[index];
            var outputs = this.CELL_CLASS_OUTPUTS[cellClass];
            return {
                food: Math.ceil(outputs.food * area),
                energy: Math.ceil(outputs.energy * area),
                mineral: Math.ceil(outputs.food * area)
            };
        }, this);

        var callback = function(nodes) {
            nodes.attr("class", "cell-value")
                .style("left", function(d, i) { return _this.cells.centroids[i][0] - 15 + 'px'; })
                .style("top", function(d, i) { return _this.cells.centroids[i][1] - 6  + 'px'; })
                .html(function(d, i) {
                    var cellValue = cellOutputs[i];
                    if (cellValue.food || cellValue.mineral || cellValue.energy) {
                        return cellValue.food + ', ' + cellValue.mineral + ', ' + cellValue.energy;
                    }
                });
        };
        this.bindData(this.cellValueNodes, cellOutputs, "div", callback);
            
    };

    CellMap.prototype.getCellNodes = function() {
        return this.svg.selectAll('path.cell');
    };

    CellMap.prototype.getVertexNodes = function() {
        return this.svg.selectAll('circle.vertex');
    };

    CellMap.prototype.getCellValueNodes = function() {
        return d3.select('#mask').selectAll('div.cell-value');
    };

    CellMap.prototype.getContinentBoundaryNodes = function() {
        return this.svg.selectAll("path.continent");
    };

    CellMap.prototype.getNodes = function() {
        this.svg = this.initializeSvg();
        this.cellNodes = this.getCellNodes();
        this.vertexNodes = this.getVertexNodes();
        this.cellValueNodes = this.getCellValueNodes();
        this.continentBoundaryNodes = this.getContinentBoundaryNodes();
    };

    CellMap.prototype.draw = function() {
        this.getNodes();
        this.drawCells();
        // this.drawVertices();
        // this.drawCellValues();
        // this.drawContinentBoundaries();
    };

    CellMap.prototype.bindData = function(nodes, data, element, callback) {
        callback(nodes.data(data).enter().append(element));
    };

    CellMap.prototype.drawContinentBoundaries = function() {
        var _this = this;
        var callback = function(nodes) {
            var setContinentPolygonData = function(d, i) {
                return Util.SVG.polygonString(_this.continents.plates[i].cell);
            };
            nodes.attr("class", "continent").attr("d", setContinentPolygonData);
        };

        this.bindData(this.continentBoundaryNodes, this.continents.plates, "svg:path", callback);
    };

    CellMap.prototype.CELL_CLASS_OUTPUTS = {
        'lake': { mineral: 0, food: 5, energy: 0 },
        'ocean': { mineral: 0, food: 5, energy: 1 },
        'deepwater': { mineral: 0, food: 0, energy: 0 },
        'sea': { mineral: 0, food: 6, energy: 1 },
        'mountain': { mineral: 8, food: 1, energy: 2 },
        'snow': { mineral: 2, food: 0, energy: 2 },
        'tundra': { mineral: 1, food: 1, energy: 1 },
        'forest': { mineral: 2, food: 4, energy: 4 },
        'prairie': { mineral: 1, food: 5, energy: 2 },
        'taiga': { mineral: 1, food: 2, energy: 2 },
        'rainforest': { mineral: 1, food: 6, energy: 2 },
        'savannah': { mineral: 2, food: 5, energy: 3 },
        'desert': { mineral: 3, food: 0, energy: 3 }
    };

    CellMap.prototype.initializeSvg = function() {
        return d3.select("div#container").insert("svg:svg", "h2")
            .attr("id", "diagram")
            .attr("width", this.mask.width)
            .attr("height", this.mask.height);
    };

    CellMap.prototype.setMapGeometry = function(width, height) {
        this.mask = Util.Geom.createRectangle([0, 0], [width, height]);
        this.mask.width = width, this.mask.height = height;
        
        var pointGenerator = new Stochator(
            { min: 0, max: width, kind: 'integer' },
            { min: 0, max: height, kind: 'integer' }
        );
        this.getRandomPoints = pointGenerator.next;
    };

    function CellMap(cellCount, width, height) {
        this.setMapGeometry(width, height);
        this.continents = new ContinentalPlates(cellCount, this.mask);
        this.cells = new Cells(cellCount, this.mask, this.continents);
    }
    return CellMap;
})();

var CellClusters = (function() {

    CellClusters.prototype.has = function(cellIndex) {
        return this.indexes[cellIndex];
    };

    CellClusters.prototype.each = function(iterator, context) {
        this.clusters.forEach(iterator, context || this);
    };

    CellClusters.prototype.addCluster = function(cluster) {
        this.clusters.push(cluster);
    };

    CellClusters.prototype.getCluster = function(clusterIndex) {
        return this.clusters[clusterIndex];
    };

    CellClusters.prototype.addToNewCluster = function(cellIndex, cellType, isInteriorCell) {
        this.indexes[cellIndex] = true;
        this.addCluster(new CellCluster(cellIndex, cellType, isInteriorCell))
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

    CellCluster.prototype.add = function(cellIndex, isInteriorCell) {
        this.indexes[cellIndex] = true;
        this.cells.push(cellIndex + '');
        if (isInteriorCell) {
            this.interiorCells.push(cellIndex + '');
        }
    };

    CellCluster.prototype.join = function(cluster, isInteriorCell) {
        cluster.cells.forEach(function(cellIndex) {
            if (!this.has(cellIndex)) {
                this.add(cellIndex, isInteriorCell);
            }
        }, this);
    };

    CellCluster.prototype.getExteriorCells = function() {
        return this.cells.filter(function(cellIndex) {
            return this.interiorCells.indexOf(cellIndex) == -1;
        }, this);
    };

    function CellCluster(cellIndex, cellType, isInteriorCell) {
        this.indexes = {};
        this.cells = [];
        this.interiorCells = [];
        this.add(cellIndex, isInteriorCell);
        this.cellType = cellType;
    }

    return CellCluster;
})();
