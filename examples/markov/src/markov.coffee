class LifeGame extends MarkovChain
	constructor: ({ @state, @height, @width }) ->
		@state ?= new Set(new Stochator(binary: true).generate() for b in [0...@height * @width])

	rules: [
		[0, 0, 0, 1, 0, 0, 0, 0, 0, 0]
  		[0, 0, 1, 1, 0, 0, 0, 0, 0, 0]
	]

	iterator: (cells) ->
		getNeighbors = (index) ->
			new Set(
				cells.get(index + offset, 0) for offset in [-@width - 1, -@width, -@width + 1, -1, 1, @width - 1, @width, @width + 1]
			)

		cells.map((value, index) => @rules[value][getNeighbors(index).sum()])

