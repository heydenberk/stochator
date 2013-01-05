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
