(function() {
  var Dilemma, DovePrisoner, HawkPrisoner, LearningPrisoner, Prisoner, TitForTatPrisoner, container, game, payoffs, players,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Prisoner = (function(_super) {

    __extends(Prisoner, _super);

    function Prisoner() {
      Prisoner.__super__.constructor.apply(this, arguments);
    }

    Prisoner.prototype.act = function() {
      if (Math.random() < 0.5) {
        return this.cooperate();
      } else {
        return this.defect();
      }
    };

    Prisoner.prototype.cooperate = function() {
      this.trigger("act", "cooperate");
      return "cooperate";
    };

    Prisoner.prototype.defect = function() {
      this.trigger("act", "defect");
      return "defect";
    };

    Prisoner.prototype.learn = function() {};

    return Prisoner;

  })(Backbone.Model);

  HawkPrisoner = (function(_super) {

    __extends(HawkPrisoner, _super);

    function HawkPrisoner() {
      HawkPrisoner.__super__.constructor.apply(this, arguments);
    }

    HawkPrisoner.prototype.act = function() {
      return this.defect();
    };

    return HawkPrisoner;

  })(Prisoner);

  DovePrisoner = (function(_super) {

    __extends(DovePrisoner, _super);

    function DovePrisoner() {
      DovePrisoner.__super__.constructor.apply(this, arguments);
    }

    DovePrisoner.prototype.act = function() {
      return this.cooperate();
    };

    return DovePrisoner;

  })(Prisoner);

  LearningPrisoner = (function(_super) {

    __extends(LearningPrisoner, _super);

    function LearningPrisoner() {
      var _this = this;
      this.bind("act", function(action) {
        return _this.actionMemory.mine.push(action);
      });
    }

    LearningPrisoner.prototype.actionMemory = {
      mine: [],
      others: []
    };

    LearningPrisoner.prototype.learn = function(actions) {
      return this.actionMemory.others.push(actions);
    };

    LearningPrisoner.prototype.remember = function(turnsAgo) {
      var turnIndex;
      if (turnsAgo == null) turnsAgo = 1;
      turnIndex = this.actionMemory.mine.length - turnsAgo;
      return {
        mine: this.actionMemory.mine[turnIndex],
        others: this.actionMemory.others[turnIndex]
      };
    };

    return LearningPrisoner;

  })(Prisoner);

  TitForTatPrisoner = (function(_super) {

    __extends(TitForTatPrisoner, _super);

    function TitForTatPrisoner() {
      TitForTatPrisoner.__super__.constructor.apply(this, arguments);
    }

    TitForTatPrisoner.prototype.act = function() {
      var lastTurn;
      lastTurn = this.remember().others || ["cooperate"];
      if (lastTurn.filter(function(action) {
        return action === "defect";
      }).length > lastTurn.length / 2) {
        return this.defect();
      } else {
        return this.cooperate();
      }
    };

    return TitForTatPrisoner;

  })(LearningPrisoner);

  Dilemma = (function(_super) {

    __extends(Dilemma, _super);

    function Dilemma(prisoners, payoffs) {
      this.prisoners = prisoners;
      this.payoffs = payoffs;
      this.bind("actions", this.updateScores);
      this.bind("actions", this.informPrisoners);
      this.bind("act");
    }

    Dilemma.prototype.play = function(turns) {
      this.resetScores();
      this.playTurns(turns);
      return this.trigger("end", this.scores);
    };

    Dilemma.prototype.playTurns = function(turns) {
      var prisoner, turn, _results;
      _results = [];
      for (turn = 0; 0 <= turns ? turn < turns : turn > turns; 0 <= turns ? turn++ : turn--) {
        _results.push(this.trigger("actions", (function() {
          var _i, _len, _ref, _results2;
          _ref = this.prisoners;
          _results2 = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            prisoner = _ref[_i];
            _results2.push(prisoner.act());
          }
          return _results2;
        }).call(this), turn));
      }
      return _results;
    };

    Dilemma.prototype.informPrisoners = function(actions) {
      var prisoner, prisonerIndex, _i, _len, _ref, _results;
      _ref = this.prisoners;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        prisoner = _ref[_i];
        _results.push((function() {
          var _len2, _ref2, _results2;
          _ref2 = this.prisoners;
          _results2 = [];
          for (prisonerIndex = 0, _len2 = _ref2.length; prisonerIndex < _len2; prisonerIndex++) {
            prisoner = _ref2[prisonerIndex];
            _results2.push(prisoner.learn(actions.slice(0, prisonerIndex).concat(actions.slice(prisonerIndex + 1, actions.length))));
          }
          return _results2;
        }).call(this));
      }
      return _results;
    };

    Dilemma.prototype.resetScores = function() {
      var prisoner;
      return this.scores = (function() {
        var _i, _len, _ref, _results;
        _ref = this.prisoners;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          prisoner = _ref[_i];
          _results.push(0);
        }
        return _results;
      }).call(this);
    };

    Dilemma.prototype.updateScores = function(actions) {
      var defections, updater,
        _this = this;
      defections = actions.filter(function(action) {
        return action === "defect";
      });
      if (defections.length === 0) {
        updater = function(score) {
          return score + _this.payoffs.reward * (_this.prisoners.length - 1);
        };
      } else if (defections.length === this.prisoners.length) {
        updater = function(score) {
          return score + _this.payoffs.punishment * (_this.prisoners.length - 1);
        };
      } else {
        updater = function(score, index) {
          return score + (actions[index] === "defect" ? _this.payoffs.temptation * (_this.prisoners.length - defections.length) : _this.payoffs.sucker * defections.length);
        };
      }
      return this.scores = this.scores.map(updater);
    };

    return Dilemma;

  })(Backbone.Model);

  players = [new TitForTatPrisoner, new TitForTatPrisoner, new DovePrisoner, new HawkPrisoner, new Prisoner];

  payoffs = {
    reward: 1,
    punishment: -1,
    temptation: 2,
    sucker: -2
  };

  container = $("#container");

  game = new Dilemma(players, payoffs);

  game.bind("actions", function(actions, turn) {
    var action, row, _i, _len, _results;
    container.prepend(row = $("<div />", {
      "class": "action-row",
      text: "Turn " + turn
    }));
    _results = [];
    for (_i = 0, _len = actions.length; _i < _len; _i++) {
      action = actions[_i];
      _results.push(row.append($("<div />", {
        "class": "action-col action-col-" + action,
        text: action
      })));
    }
    return _results;
  });

  game.bind("end", function(scores) {
    var row, score, _i, _len, _results;
    container.prepend(row = $("<div />", {
      "class": "score-row",
      text: "Final scores"
    }));
    _results = [];
    for (_i = 0, _len = scores.length; _i < _len; _i++) {
      score = scores[_i];
      _results.push(row.append($("<div />", {
        "class": "score-col score-col-" + (score > 0 ? "positive" : "negative"),
        text: score
      })));
    }
    return _results;
  });

  game.play(100);

  console.log(game.scores);

}).call(this);
