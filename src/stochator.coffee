isType = (type) ->
    (arg) -> Object::toString.call(arg) == "[object #{ type }]"

callFunctions = (fns) -> (fn() for fn in fns)

randomBoundedFloat = (min = 0, max = 1) ->
    spread = max - min
    Math.random() * spread + min

randomBoundedInteger = (min = 0, max = 1) ->
    spread = 1 + max - min
    Math.floor(Math.random() * spread) + min

randomColor = ->
    byte = kind: "integer", min: 0, max: 255
    mutator = (bytes) ->
        [red, green, blue] = bytes
        { red, green, blue }

    new Stochator(byte, byte, byte, mutator).next

randomNormallyDistributedFloat = (mean, stdev, min, max) ->
    seed = randomBoundedFloat()
    float = inverseNormalCumulativeDistribution(seed) * stdev + mean
    if min? and max?
        Math.min(max, Math.max(min, float))
    else
        float

randomCharacter = (lowercase) ->
    [min, max] = if lowercase then [97, 122] else [65, 90]
    mutator = (charCode) -> String.fromCharCode(charCode)
    new Stochator({ kind: "integer", min, max }, mutator).next

randomSetMember = (set) ->
    max = set.length - 1
    set.get(randomBoundedInteger(0, max))

randomSetMemberWithoutReplacement = (set) ->
    return undefined unless set.get(0)
    set.length -= 1
    set.pop(randomBoundedInteger(0, set.length))

randomWeightedSetMember = (set, weights) ->
    [member, weightSum, float] = [undefined, 0, randomBoundedFloat()]
    set.each((value, index) ->
        return if member
        weight = weights.get(index)
        if float <= weightSum + weight and float >= weightSum
            member = value
        weightSum += weight
    )

    member

inverseNormalCumulativeDistribution = (probability) ->
    high = probability > 0.97575
    low = probability < 0.02425

    if low or high
        numCoefficients = new Set([
            -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
            -2.549732539343734, 4.374664141464968
        ])
        denomCoeffcients = new Set([
            7.784695709041462e-3, 3.224671290700398e-1,
            2.445134137142996, 3.754408661907416
        ])

        [numMaxExponent, denomMaxExponent] = [5, 4]
        coefficient = if low then 1 else -1
        base = Math.sqrt(
            -2 * Math.log(if low then probability else 1 - probability)
        )
    else
        numCoefficients = new Set([
            -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
            1.383577518672690e2, -3.066479806614716e1, 2.506628277459239
        ])
        denomCoeffcients = new Set([
            -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
            6.680131188771972e1, -1.328068155288572e1
        ])

        [numMaxExponent, denomMaxExponent] = [5, 5]
        coefficient = probability - 0.5
        base = Math.pow(coefficient, 2)

    mapMaxExp = (maxExp) ->
        (value, index) -> value * Math.pow(base, maxExp - index)

    numerator = numCoefficients.map(mapMaxExp(numMaxExponent)).sum()
    denominator = denomCoeffcients.map(mapMaxExp(denomMaxExponent)).sum() + 1

    coefficient * numerator / denominator

shuffleSet = (set) ->
    values = set.copy()
    for index in [values.length - 1...0]
        randomIndex = randomBoundedInteger(0, index)

        tmp = values[index]
        values[index] = values[randomIndex]
        values[randomIndex] = tmp

    values

floatGenerator = (min, max, mean, stdev) ->
    if mean and stdev
        -> randomNormallyDistributedFloat(mean, stdev, min, max)
    else
        -> randomBoundedFloat(min, max)

integerGenerator = (min = 0, max = 1) ->
    -> randomBoundedInteger(min, max)

setGenerator = (values, replacement = true, shuffle = false, weights = null) ->
    if not values or not values.length
        throw Error("Must provide a 'values' array for a set generator.")

    set = new Set(values)
    if shuffle
        -> shuffleSet(set)
    else if replacement
        if weights
            weightsSet = new Set(weights)
            -> randomWeightedSetMember(set, weightsSet)
        else
            -> randomSetMember(set)
    else
        -> randomSetMemberWithoutReplacement(set)

class Stochator

    VERSION = "0.3.1"

    constructor: (configs...) ->
        @setGenerator(configs)

    createGenerator: (config) ->
        config.kind ?= "float"
        generator = switch config.kind
            when "float"
                { min, max, mean, stdev } = config
                floatGenerator(min, max, mean, stdev)
            when "integer"
                integerGenerator(config.min, config.max)
            when "set"
                { values, replacement, shuffle, weights } = config
                setGenerator(values, replacement, shuffle, weights)
            when "color", "rgb" then randomColor(config.kind)
            when "a-z", "A-Z" then randomCharacter(config.kind is "a-z")
        if not generator
            throw Error("#{ config.kind } not a recognized kind.")
        else
            generator

    createGenerators: (configs, mutator) ->
        configs[0] ?= {}
        generators = (@createGenerator(config) for config in configs)

        if not mutator
            callGenerators = if generators.length is 1
                -> callFunctions(generators)[0]
            else
                -> callFunctions(generators)
        else
            caller = if generators.length is 1
                -> callFunctions(generators)[0]
            else
                -> callFunctions(generators)

            callGenerators = => @value = mutator.call(@, caller(), @value)

        (times) ->
            if times
                (callGenerators() for time in [1..times])
            else
                callGenerators()

    setGenerator: (configs) ->
        generatorConfigs = []
        for config in configs
            if isType("Object")(config)
                generatorConfigs.push(config)
            else
                break

        [name, mutator] = configs[generatorConfigs.length..]
        name or= "next"
        if isType("Function")(name)
            [name, mutator] = ["next", name]

        @[name] = @createGenerators(generatorConfigs, mutator)

    toString: ->
        "[object Stochator]"

if module?.exports
    module.exports = Stochator
else
    this.Stochator = Stochator

