var Game = (function() {

    var TURN_PHASES = {
        "PLACEMENT": "placement",
        "INITIAL_PLACEMENT": "initial_placement"
    };

    var PLACEMENT_PHASES = [TURN_PHASES.PLACEMENT, TURN_PHASES.INITIAL_PLACEMENT];

    Game.prototype.TURN_PHASES = TURN_PHASES;

    Game.prototype.PLACEMENT_PHASES = PLACEMENT_PHASES;

    Game.prototype.getMap = function() {
        var map = new CellMap(1000);
        return map;
    };

    Game.prototype.drawMap = function() {
        this.map.draw();
        this.map.logData();
    };

    Game.prototype.bindRedraw = function() {
        var isRKey = function(evt) {
            return evt.keyCode == 82 && !evt.metaKey;
        };
        var reinit = Util.Function.when(isRKey, this.map.reinit, this.map);
        document.addEventListener('keydown', reinit);
    };

    Game.prototype.getOverlay = function() {
        return new Overlay();
    };

    Game.prototype.zoomLevel = 1;

    Game.prototype.setMapCenter = function(x, y) {
        var maskMidpoint = [this.map.mask.width * 0.5, this.map.mask.height * 0.5];
        var currentMidpoint = [maskMidpoint[0] * 0.9, maskMidpoint[1] * 0.9];
        if (!x || !y) {
            x = currentMidpoint[0], y = currentMidpoint[1];
        } else {
                var offset = [x * 2 - currentMidpoint[0], y * 2 - currentMidpoint[1]];
            x = Util.Math.clamp(offset[0], maskMidpoint[0] * -1, maskMidpoint[0] * 5);
            y = Util.Math.clamp(offset[1], maskMidpoint[1] * -1, maskMidpoint[1] * 5);
        }

        this.setScrollTop(x, y);
    };

    Game.prototype.setScrollTop = function(x, y) {
        document.body.scrollLeft = x, document.body.scrollTop = y;
    };

    Game.prototype.zoom = function() {
        var container = this.map.container, svg = this.map.svg;
        var scaleCoefficient = 1;
        var x, y;
        if (this.zoomLevel === 1) {
            scaleCoefficient = 2, x = d3.event.x, y = d3.event.y;
        }

        var padding = "0", className = "zoom-" + this.zoomLevel, removeClass = true;
        if (x && y) {
            padding = "10%", className = "zoom-" + scaleCoefficient, removeClass = false;
        }

        container.style({ "zoom": scaleCoefficient, "padding": padding });
        svg.classed(className, !removeClass);
        this.setMapCenter(x, y);

        this.zoomLevel = scaleCoefficient;
    };

    Game.prototype.bindZoom = function() {
        var _this = this;
        var zoom = function() { 
            _this.zoom();
        };
        this.map.container.on("dblclick", zoom);
    };

    Game.prototype.getPlayers = function(names) {
        return names.map(function(name, index) {
            return new Player(name, index);
        });
    };

    Game.prototype.startTurns = function() {
        this.currentPlayer = 0;
        this.turnPhase = TURN_PHASES.INITIAL_PLACEMENT;
    };

    Game.prototype.nextTurn = function() {
        this.currentPlayer = (this.currentPlayer + 1) % (this.players.length - 1);
    };

    Game.prototype.getCurrentPlayer = function() {
        return this.players[this.currentPlayer];
    };

    Game.prototype.inPlacementPhase = function() {
        return PLACEMENT_PHASES.indexOf(this.turnPhase) != -1;
    };

    Game.prototype.placements = {};

    Game.prototype.drawPlacement = function(vertexNode) {
        vertexNode.style("fill", "#0F0");
        vertexNode.classed("placement", true);
    };

    Game.prototype.makePlacement = function(vertexNode) {
        var vertex = vertexNode.data()[0];
        var currentPlayer = this.getCurrentPlayer();
        this.placements[vertex] = currentPlayer;
        if (this.turnPhase !== TURN_PHASES.INITIAL_PLACEMENT) {
            currentPlayer.updateResources([-1, -1, -1]);
        }
        this.drawPlacement(vertexNode);
        this.nextTurn();
    };

    Game.prototype.bindPlacement = function() {
        var _this = this;
        this.map.vertexNodes.on("click", function() {
            var currentPlayer = _this.getCurrentPlayer();
            if (_this.inPlacementPhase() && currentPlayer.canMakeSettlement()) {
                _this.makePlacement(d3.select(this));
            }
        });
    };

    Game.prototype.bindEvents = function() {
        this.bindRedraw();
        this.bindZoom();
        this.bindPlacement();
    };

    function Game() {
        this.overlay = this.getOverlay();
        this.map = this.getMap();
        this.drawMap();
        this.bindEvents();

        this.players = this.getPlayers(["Megan", "Eric"]);
        this.startTurns();
    }

    return Game;

})();

var Player = (function() {

    Player.prototype.resources = [0, 0, 0];

    Player.prototype.canMakeSettlement = function() {
        return true;
    };

    function Player(name, index) {
        this.name = name;
        this.index = index;
    }

    return Player;

})();

var Overlay = (function() {

    function Overlay() {
        this.mask = d3.select("#mask");
    }

    return Overlay;

})();
