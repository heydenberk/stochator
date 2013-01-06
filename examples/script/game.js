var Game = (function() {

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

    function Game() {
        this.overlay = this.getOverlay();
        this.map = this.getMap();
        this.drawMap();
        this.bindRedraw();
    }

    return Game;

})();

var Overlay = (function() {

    function Overlay() {
        this.mask = d3.select("#mask");
    }

    return Overlay;

})();
