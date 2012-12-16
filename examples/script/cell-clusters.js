
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
        this.cells.push(cellIndex + "");
        if (isInteriorCell) {
            this.interiorCells.push(cellIndex + "");
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
