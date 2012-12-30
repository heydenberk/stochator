
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
