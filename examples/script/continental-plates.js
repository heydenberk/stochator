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
        return this.plates[closestIndex];
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
        var continentCountExp = new Stochator({ min: 0.2, max: 0.3 });
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
        var centroid = this.centroid;
        var centroidDistance = function(point) {
            return Util.Geom.distance(point, centroid);
        };
        return Util.Math.mean(this.cell.map(centroidDistance));
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
