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

Util.Obj.map = function(obj, iterator, context) {
    var values = [];
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            values.push(iterator.call(context || this, prop, obj[prop]));
        }
    }
    return values;
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

