seedrandom = require("seedrandom")

isType = (type) ->
    (arg) -> Object::toString.call(arg) == "[object #{ type }]"

isFunc = isType("Function")

isObject = isType("Object")

randomBoundedFloat = (prng, min = 0, max = 1) ->
    spread = max - min
    prng() * spread + min

randomBoundedInteger = (prng, min = 0, max = 1) ->
    spread = 1 + max - min
    Math.floor(prng() * spread) + min

randomColor = (prng) ->
    byte = kind: "integer", min: 0, max: 255, prng: prng
    mutator = (bytes) ->
        [red, green, blue] = bytes
        { red, green, blue }

    new Stochator(byte, byte, byte, mutator).next

randomNormallyDistributedFloat = (prng, mean, stdev, min, max) ->
    seed = randomBoundedFloat(prng)
    float = inverseNormalCumulativeDistribution(seed) * stdev + mean
    if min? and max?
        Math.min(max, Math.max(min, float))
    else
        float

randomCharacter = (prng, lowercase) ->
    [min, max] = if lowercase then [97, 122] else [65, 90]
    mutator = (charCode) -> String.fromCharCode(charCode)
    new Stochator({ kind: "integer", min, max, prng }, mutator).next

randomSetMember = (prng, set) ->
    max = set.length - 1
    set.get(randomBoundedInteger(prng, 0, max))

randomSetMemberWithoutReplacement = (prng, set) ->
    return undefined unless set.get(0)
    set.length -= 1
    set.pop(randomBoundedInteger(prng, 0, set.length))

randomWeightedSetMember = (prng, set, weights) ->
    [member, weightSum, float] = [undefined, 0, randomBoundedFloat(prng)]
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

shuffleSet = (prng, set) ->
    values = set.copy()
    for index in [values.length - 1...0]
        randomIndex = randomBoundedInteger(prng, 0, index)

        tmp = values[index]
        values[index] = values[randomIndex]
        values[randomIndex] = tmp

    values

floatGenerator = (prng, min, max, mean, stdev) ->
    if mean and stdev
        -> randomNormallyDistributedFloat(prng, mean, stdev, min, max)
    else
        -> randomBoundedFloat(prng, min, max)

integerGenerator = (prng, min = 0, max = 1) ->
    -> randomBoundedInteger(prng, min, max)

setGenerator = (prng, values, replacement = true, shuffle = false, weights = null) ->
    if not values or not values.length
        throw Error("Must provide a 'values' array for a set generator.")

    set = new Set(values)
    if shuffle
        -> shuffleSet(prng, set)
    else if replacement
        if weights
            weightsSet = new Set(weights)
            -> randomWeightedSetMember(prng, set, weightsSet)
        else
            -> randomSetMember(prng, set)
    else
        -> randomSetMemberWithoutReplacement(prng, set)

createGenerator = (config) ->
    kind = config.kind or "float"

    defaultPrng = if config.seed then seedrandom else Math.random
    basePrng = config.prng or defaultPrng
    prng = if config.seed then basePrng(config.seed) else basePrng

    generator = switch kind
        when "float"
            { min, max, mean, stdev } = config
            floatGenerator(prng, min, max, mean, stdev)
        when "integer"
            integerGenerator(prng, config.min, config.max)
        when "set"
            { values, replacement, shuffle, weights } = config
            setGenerator(prng, values, replacement, shuffle, weights)
        when "color", "rgb" then randomColor(prng)
        when "a-z", "A-Z" then randomCharacter(prng, kind is "a-z")
    if not generator
        throw Error("#{ kind } not a recognized kind.")
    else
        generator

getNextValueGenerator = (configs) ->
    configs[0] ?= {}
    generators = (createGenerator(config) for config in configs)
    if generators.length is 1
        -> generators[0]()
    else
        -> (generator() for generator in generators)


class Stochator

    VERSION = "0.4"

    constructor: (configs..., mutator=null, name="next") ->
        # If the last arg is an object, all args are config args.
        # If the penultimate arg is an object, check whether the last arg
        # is a string (hence, the name) or a function (hence, the mutator).
        if isObject(name)
            configs[configs.length..configs.length + 2] = [mutator, name]
            [mutator, name] = [null, "next"]
        else if isObject(mutator)
            configs[configs.length] = mutator
            [mutator, name] = if isFunc(name)
                [name, "next"]
            else
                [null, name]

        # If the mutator is provided, override the default identity func.
        if mutator
            @mutate = (nextValue) => mutator(nextValue, @getValue())

        # Transform the configs to a func to get the next value.
        getNext = getNextValueGenerator(configs)

        # Assign `name` to the next mutated value(s), after `times` iterations.
        # If `times` is 1, just return the value, otherwise return an array.
        @[name] = (times=1) =>
            values = (@setValue(@mutate(getNext())) for time in [1..times])
            if times == 1 then values[0] else values

    getValue: (value) -> @_value

    mutate: (value) -> value

    setValue: (value) -> @_value = value

    toString: -> "[object Stochator]"

    _value: 0

if module?.exports
    module.exports = Stochator
else
    this.Stochator = Stochator

