class Prisoner extends Backbone.Model
	act: ->
		if Math.random() < 0.5 then @cooperate() else @defect()

	cooperate: ->
		@trigger("act", "cooperate")
		"cooperate"

	defect: ->
		@trigger("act", "defect")
		"defect"
	
	learn: ->

class HawkPrisoner extends Prisoner
	act: ->
		@defect()

class DovePrisoner extends Prisoner
	act: ->
		@cooperate()

class LearningPrisoner extends Prisoner
	constructor: ->
		@bind("act", (action) => @actionMemory.mine.push(action))
		
	actionMemory:
		mine: [], others: []

	learn: (actions) ->
		@actionMemory.others.push(actions)

	remember: (turnsAgo = 1) ->
		turnIndex = @actionMemory.mine.length - turnsAgo
		mine: @actionMemory.mine[turnIndex], others: @actionMemory.others[turnIndex]

class TitForTatPrisoner extends LearningPrisoner
	act: ->
		lastTurn = @remember().others or ["cooperate"]
		if lastTurn.filter((action) -> action is "defect").length > lastTurn.length / 2
			@defect()
		else
			@cooperate()

class Dilemma extends Backbone.Model
	constructor: (@prisoners, @payoffs) ->
		@bind("actions", @updateScores)
		@bind("actions", @informPrisoners)
		@bind("act")

	play: (turns) ->
		@resetScores()
		@playTurns(turns)
		@trigger("end", @scores)
		
	playTurns: (turns) ->
		@trigger("actions", (prisoner.act() for prisoner in @prisoners), turn) for turn in [0...turns]

	informPrisoners: (actions) ->
		for prisoner in @prisoners
			prisoner.learn(actions.slice(0, prisonerIndex).concat(actions.slice(prisonerIndex + 1, actions.length))) for prisoner, prisonerIndex in @prisoners
			
	resetScores: ->
		@scores = (0 for prisoner in @prisoners)

	updateScores: (actions) ->
		defections = actions.filter((action) -> action is "defect")
		if defections.length is 0
			updater = (score) => score + @payoffs.reward * (@prisoners.length - 1)
		else if defections.length is @prisoners.length
			updater = (score) => score + @payoffs.punishment * (@prisoners.length - 1)
		else
			updater = (score, index) => score + if actions[index] is "defect" then @payoffs.temptation * (@prisoners.length - defections.length) else @payoffs.sucker * defections.length

		@scores = @scores.map(updater)


players = [new TitForTatPrisoner, new TitForTatPrisoner, new DovePrisoner, new HawkPrisoner, new Prisoner]
payoffs =
	reward: 1
	punishment: -1
	temptation: 2
	sucker: -2

container = $("#container")
	
game = new Dilemma(players, payoffs)
game.bind("actions", (actions, turn) ->
	container.prepend(row = $("<div />", { class: "action-row", text: "Turn #{ turn }" }))
	for action in actions
		row.append($("<div />", { class: "action-col action-col-#{action}", text: action }))
)
game.bind("end", (scores) ->
	container.prepend(row = $("<div />", { class: "score-row", text: "Final scores" }))
	for score in scores
		row.append($("<div />", { class: "score-col score-col-#{ if score > 0 then "positive" else "negative" }", text: score }))
)
game.play(100)
console.log game.scores