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
Util.Geom.pointMean = function(points) {
    var transposedPoints = d3.transpose(points);
    return [d3.mean(transposedPoints[0]), d3.mean(transposedPoints[1])];
};

Util.Geom.roundPoint = function(point) {
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

Util.Geom.getClippedVoronoi = function(points, mask) {
    return d3.geom.voronoi(points)
        .map(mask.clip)
        .map(Util.Geom.roundPoints);
};

Util.Geom.relaxPoints = function(points, mask, times) {
    d3.range(times).forEach(function() {
        points = Util.Geom.getClippedVoronoi(points, mask).map(Util.Geom.polygonCentroid);
    });
    return points;
};

Util.Obj = {};

Util.Obj.countValues = function(objs, attribute) {    
    var count = {};
    return objs.reduce(function(count, obj) {
        count[obj[attribute]] = (count[obj[attribute]] || 0) + 1;
        return count;
    }, {});
};

Util.SVG = {};

Util.SVG.polygonString = function(points) {
    return "M" + points.join("L") + "Z";
};

Util.Function = {};

Util.Function.compose = function(fn1, fn2) {
    return function() { fn2(fn1()); };
};

Util.Array = {};

Util.Array.indexGetter = function(index) {
    return function(array) {
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

Util.Number = {};

Util.Number.clamp = function(number, min, max) {
    return Math.min(max, Math.max(min, number));
};

