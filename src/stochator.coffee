class Stochator
	constructor: (options) ->
		options.name ?= "next"
		@next = @_generator(options)
		if options.name
			@[options.name] = @next

	toString: ->
		"[object Stochator]"

	_randomBoundedFloat: (min, max, spread) ->
		Math.random() * spread + min

	_randomBoundedInteger: (min, max, spread) ->
		Math.floor(@_randomBoundedFloat(min, max, spread))

	_randomColor: ->
		int = @_randomBoundedInteger(0, 16777215, 16777215)

		{ red: (int & 16777215) >> 16, green: (int & 65535) >> 8, blue: int & 255 }

	_randomNormallyDistributedFloat: (mean, stdev, min, max) ->
		float = @_inverseNormalCumulativeDistribution(Math.random()) * stdev + mean
		if min? and max?
			Math.min(max, Math.max(min, float))
		else
			float

	_randomCharacter: (lowercase) ->
		[min, max] = if lowercase then [97, 122] else [65, 90]
		String.fromCharCode(@_randomBoundedInteger(min, max, 25))

	_randomSetMember: (set) ->
		max = set.length - 1
		set.get(@_randomBoundedInteger(0, max, max))

	_randomSetMemberWithoutReplacement: (set) ->
		return undefined unless set.get(0)
		set.length -= 1
		index = @_randomBoundedInteger(0, set.length, set.length)
		set.values.splice(index, 1)[0]

	_randomWeightedSetMember: (set, weights) ->
		[member, weightSum, float] = [undefined, 0, @_randomBoundedFloat(0, 1, 1)]
		set.each((value, index) ->
			return if member
			weight = weights.get(index)
			if float <= weightSum + weight and float >= weightSum
				member = value
			weightSum += weight
		)

		member

	_inverseNormalCumulativeDistribution: (probability) ->
		high = probability > 0.97575
		low = probability < 0.02425

		if low or high
			numCoefficients = new Set([-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968])
			denomCoeffcients = new Set([7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416])

			[numMaxExponent, denomMaxExponent] = [5, 4]
			coefficient = if low then 1 else -1
			base = Math.sqrt(-2 * Math.log(if low then probability else 1 - probability))
		else
			numCoefficients = new Set([-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239])
			denomCoeffcients = new Set([-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1])

			[numMaxExponent, denomMaxExponent] = [5, 5]
			coefficient = probability - 0.5
			base = Math.pow(coefficient, 2)

		numerator = numCoefficients.map((value, index) -> value * Math.pow(base, numMaxExponent - index)).sum()
		denominator = denomCoeffcients.map((value, index) -> value * Math.pow(base, denomMaxExponent - index)).sum() + 1

		coefficient * numerator / denominator

	_shuffleSet: (set) ->
		@_randomSetMember(set.enumerate())

	_floatGenerator: (min, max, mean, stdev) ->
		if mean and stdev
			=> @_randomNormallyDistributedFloat(mean, stdev, min, max)
		else
			spread = (max ?= 1) - (min ?= 0)
			=> @_randomBoundedFloat(min, max, spread)

	_integerGenerator: (min = 0, max = 1) ->
		max += 1
		spread = max - min
		=> @_randomBoundedInteger(min, max, spread)

	_mutatorGenerator: (initialValue, stochator) ->
		@_value = initialValue
		stochator.next

	_setGenerator: (values, replacement = true, shuffle = false, weights = null) ->
		set = new Set(values)
		if shuffle
			=> @_shuffleSet(set)
		else if replacement
			if weights
				weights = new Set(weights)
				=> @_randomWeightedSetMember(set, weights)
			else
				=> @_randomSetMember(set)
		else
			=> @_randomSetMemberWithoutReplacement(set)


	_generator: ({ combine, format, kind, min, max, mean, mutator, replacement, shuffle, stdev, value, values, stochator, weights }) ->
		kind ?= "float"
		generator = switch kind
			when "float" then @_floatGenerator(min, max, mean, stdev)
			when "integer" then @_integerGenerator(min, max)
			when "set" then @_setGenerator(values, replacement, shuffle, weights)
			when "mutator" then @_mutatorGenerator(value, stochator, combine)
			when "color" then => @_randomColor()
			when "a-z", "A-Z" then => @_randomCharacter(kind is "a-z")

		if mutator
			@_value = value
			(times) =>
				if times
					(@_value = mutator(@_value, generator()) for [0...times])
				else
				 	mutator(@_value, generator())
		else
			(times) -> if times then (generator() for [0...times]) else generator()

console.log((new Stochator({})).next())