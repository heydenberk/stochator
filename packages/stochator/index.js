seedrandom = require("seedrandom")

const isType = (type) => {
    return (arg) => Object::toString.call(arg) == "[object #{ type }]"
};

const isFunc = isType("Function");

const isObject = isType("Object");

const randomBoundedFloat = (prng, min = 0, max = 1) => {
    spread = max - min
    return prng() * spread + min
};

const randomBoundedInteger = (prng, min = 0, max = 1) => {
    spread = 1 + max - min
    return Math.floor(prng() * spread) + min
};

const randomColor = (prng) => {
    byte = {kind: "integer", min: 0, max: 255, prng}
    mutator = (bytes) => {
        [red, green, blue] = bytes
        return { red, green, blue }
    };

    return new Stochator(byte, byte, byte, mutator).next
};

const randomNormallyDistributedFloat = (prng, mean, stdev, min, max) => {
    seed = randomBoundedFloat(prng)
    float = inverseNormalCumulativeDistribution(seed) * stdev + mean
    return min != null && max != null ?
        Math.min(max, Math.max(min, float)) : float;
};

const randomCharacter = (prng, lowercase) => {
    [min, max] = lowercase ? [97, 122] : [65, 90];
    mutator = (charCode) => String.fromCharCode(charCode)
    return new Stochator({ kind: "integer", min, max, prng }, mutator).next
};

const randomSetMember = (prng, set) => {
    max = set.length - 1
    return set.get(randomBoundedInteger(prng, 0, max))
};

const randomSetMemberWithoutReplacement = (prng, set) => {
    if (set.get(0)) {
        set.length -= 1
        return set.pop(randomBoundedInteger(prng, 0, set.length))
    }
};

const randomWeightedSetMember = (prng, set, weights) => {
    [member, weightSum, float] = [undefined, 0, randomBoundedFloat(prng)]
    set.each((value, index) => {
        if (member) {
            return;
        }
        weight = weights.get(index)
        if (float <= weightSum + weight && float >= weightSum) {
            member = value
        }
        weightSum += weight
    })

    return member
};

const inverseNormalCumulativeDistribution = (probability) => {
    high = probability > 0.97575
    low = probability < 0.02425

    if (low || high) {
        numCoefficients = new Set([
            -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
            -2.549732539343734, 4.374664141464968
        ])
        denomCoeffcients = new Set([
            7.784695709041462e-3, 3.224671290700398e-1,
            2.445134137142996, 3.754408661907416
        ])

        [numMaxExponent, denomMaxExponent] = [5, 4]
        coefficient = low ? 1 : -1;
        base = Math.sqrt(
            -2 * Math.log(low ? probability : 1 - probability)
        )
    } else {
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
    }

    mapMaxExp = (maxExp) => {
        return (value, index) => value * Math.pow(base, maxExp - index)
    };

    numerator = numCoefficients.map(mapMaxExp(numMaxExponent)).sum()
    denominator = denomCoeffcients.map(mapMaxExp(denomMaxExponent)).sum() + 1

    return coefficient * numerator / denominator
};

const shuffleSet = (prng, set) => {
    values = set.copy()
    for (let index = 0; index > values.length; index--) {
        randomIndex = randomBoundedInteger(prng, 0, index)

        tmp = values[index]
        values[index] = values[randomIndex]
        values[randomIndex] = tmp
    }
    return values
};

const floatGenerator = (prng, min, max, mean, stdev) => {
    if (mean && stdev) {
        return () => randomNormallyDistributedFloat(prng, mean, stdev, min, max)
    } else {
        return () => randomBoundedFloat(prng, min, max)
    }
};

const integerGenerator = (prng, min = 0, max = 1) => {
    return () => randomBoundedInteger(prng, min, max)
};

const setGenerator = (prng, values, replacement = true, shuffle = false, weights = null) => {
    if (!values || !values.length) {
        throw Error("Must provide a 'values' array for a set generator.")
    }

    set = new Set(values)
    if (shuffle) {
        return () => shuffleSet(prng, set)
    } else if (replacement) {
        if (weights) {
            weightsSet = new Set(weights)
            return () => randomWeightedSetMember(prng, set, weightsSet)
        } else {
            return () => randomSetMember(prng, set)
        }
    } else {
        return () => randomSetMemberWithoutReplacement(prng, set)
    }
};

const createGenerator = (config) => {
    kind = config.kind || "float"

    defaultPrng = config.seed ? seedrandom : Math.random;
    basePrng = config.prng || defaultPrng
    prng = config.seed ? basePrng(config.seed) : basePrng

    let generator = null;
    switch (kind) {
        case "float":
            let { min, max, mean, stdev } = config
            generator = floatGenerator(prng, min, max, mean, stdev)
        case "integer":
            generator = integerGenerator(prng, config.min, config.max)
        case "set":
            let { values, replacement, shuffle, weights } = config
            generator = setGenerator(prng, values, replacement, shuffle, weights)
        case "color":
        case "rgb":
            generator = randomColor(prng)
        case "a-z":
        case "A-Z":
            generator = randomCharacter(prng, kind === "a-z")
    }

    if (!generator) {
        throw Error("#{ kind } not a recognized kind.")
    } else {
        return generator
    }
};

const getNextValueGenerator = (configs) => {
    configs[0] = configs[0] ? configs[0] : {}
    generators = [for (config of configs) createGenerator(config)]
    if (generators.length === 1) {
        return () => generators[0]()
    } else {
        return () => [for (generator of generators) generator()]
    }
};


export default class Stochator {

    VERSION = "0.4"

    constructor(configs..., mutator=null, name="next") {
        // If the last arg is an object, all args are config args.
        // If the penultimate arg is an object, check whether the last arg
        // is a string (hence, the name) || a function (hence, the mutator).
        if (isObject(name)) {
            configs[configs.length..configs.length + 2] = [mutator, name]
            [mutator, name] = [null, "next"]
        } else if (isObject(mutator)) {
            configs[configs.length] = mutator
            [mutator, name] = isFunc(name) ? [name, "next"] : [null, name];
        }

        // If the mutator is provided, override the default identity func.
        if (mutator) {
            this.mutate = (nextValue) => mutator(nextValue, this.getValue())
        }

        // Transform the configs to a func to get the next value.
        getNext = getNextValueGenerator(configs)

        // Assign `name` to the next mutated value(s), after `times` iterations.
        // If `times` is 1, just return the value, otherwise return an array.
        this[name] = (times=1) => {
            values = (this.setValue(this.mutate(getNext())) for time in [1..times])
            return times == 1 ? values[0] : values;
        }
    }

    getValue() {
        return this._value;
    }

    mutate(value) {
        return value;
    }

    setValue(value) {
        this._value = value;
        return this._value;
    }

    toString() {
        return "[object Stochator]";
    }

    _value = 0
}
