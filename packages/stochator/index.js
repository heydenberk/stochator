import seedrandom from "seedrandom";
import {randomBoundedFloat} from "./float";
import {randomBoundedInteger} from "./integer";
import {
    randomSetMember,
    randomSetMemberWithoutReplacement,
    randomWeightedSetMember,
    shuffleSet
} from "./set";
import {randomCharacter} from "./string";

const isType = (type) => {
    return (arg) => Object.prototype.toString.call(arg) == `[object ${ type }]`
};

const isFunc = isType("Function");

const isObject = isType("Object");

const isString = isType("String");


const range = (start, end) => [for (i of Array(end - start).keys()) i + start];

const randomColor = (prng) => {
    const byte = {kind: "integer", min: 0, max: 255, prng};
    const mutator = (bytes) => {
        const [red, green, blue] = bytes;
        return { red, green, blue };
    };

    return new Stochator(byte, byte, byte, mutator).next;
};

const randomNormallyDistributedFloat = (prng, mean, stdev, min, max) => {
    const seed = randomBoundedFloat(prng);
    const float = inverseNormalCumulativeDistribution(seed) * stdev + mean;
    return min != null && max != null ?
        Math.min(max, Math.max(min, float)) : float;
};



const inverseNormalCumulativeDistribution = (probability) => {
    const high = probability > 0.97575;
    const low = probability < 0.02425;
    let numCoefficients, denomCoeffcients, numMaxExponent, denomMaxExponent, coefficient, base;

    if (low || high) {
        numCoefficients = [
            -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
            -2.549732539343734, 4.374664141464968
        ];
        denomCoeffcients = [
            7.784695709041462e-3, 3.224671290700398e-1,
            2.445134137142996, 3.754408661907416
        ];

        [numMaxExponent, denomMaxExponent] = [5, 4];
        coefficient = low ? 1 : -1;
        base = Math.sqrt(
            -2 * Math.log(low ? probability : 1 - probability)
        );
    } else {
        numCoefficients = [
            -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
            1.383577518672690e2, -3.066479806614716e1, 2.506628277459239
        ];
        denomCoeffcients = [
            -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
            6.680131188771972e1, -1.328068155288572e1
        ];

        [numMaxExponent, denomMaxExponent] = [5, 5];
        coefficient = probability - 0.5;
        base = Math.pow(coefficient, 2);
    }

    const mapMaxExp = (maxExp) => {
        return (value, index) => value * Math.pow(base, maxExp - index);
    };

    const sum = (arr) => arr.reduce((result, value) => result + value, 0);

    const numerator = sum(numCoefficients.map(mapMaxExp(numMaxExponent)));
    const denominator = sum(denomCoeffcients.map(mapMaxExp(denomMaxExponent))) + 1;

    return coefficient * numerator / denominator;
};

const floatGenerator = (prng, min, max, mean, stdev) => {
    if (mean && stdev) {
        return () => randomNormallyDistributedFloat(prng, mean, stdev, min, max);
    } else {
        return () => randomBoundedFloat(prng, min, max);
    }
};

const integerGenerator = (prng, min = 0, max = 1) => {
    return () => randomBoundedInteger(prng, min, max);
};

const setGenerator = (prng, values, replacement = true, shuffle = false, weights = null) => {
    if (!values || !values.length) {
        throw Error("Must provide a 'values' array for a set generator.")
    }

    if (shuffle) {
        return () => shuffleSet(prng, values);
    } else if (replacement) {
        if (weights) {
            return () => randomWeightedSetMember(prng, values, weights);
        } else {
            return () => randomSetMember(prng, values);
        }
    } else {
        return () => randomSetMemberWithoutReplacement(prng, values);
    }
};

const createGenerator = (config) => {
    const kind = config.kind || "float";

    const defaultPrng = config.seed ? seedrandom : Math.random;
    const basePrng = config.prng || defaultPrng;
    const prng = config.seed ? basePrng(config.seed) : basePrng;

    let generator = null;
    switch (kind) {
        case "float":
            let { min, max, mean, stdev } = config;
            generator = floatGenerator(prng, min, max, mean, stdev);
            break;
        case "integer":
            generator = integerGenerator(prng, config.min, config.max);
            break;
        case "set":
            let { values, replacement, shuffle, weights } = config;
            generator = setGenerator(prng, values, replacement, shuffle, weights);
            break;
        case "color":
        case "rgb":
            generator = randomColor(prng);
            break;
        case "a-z":
        case "A-Z":
            generator = randomCharacter(prng, kind === "a-z");
            break;
        default:
            break;
    }

    if (!generator) {
        throw Error("#{ kind } not a recognized kind.");
    } else {
        return generator;
    }
};

const getNextValueGenerator = (configs) => {
    configs[0] = configs[0] ? configs[0] : {};
    const generators = [for (config of configs) createGenerator(config)];
    if (generators.length === 1) {
        return () => generators[0]();
    } else {
        return () => [for (generator of generators) generator()];
    }
};


const parseArgs = (args) => {
    const defaults = {configs: [], mutator: null, name: null};
    return args.reduce((result, arg) => {
        if (result.mutator || isString(arg)) {
            result.name = arg;
        } else if (isFunc(arg)) {
            result.mutator = arg;
        } else {
            result.configs.push(arg);
        }
        return result;
    }, defaults);
};


export default class Stochator {

    VERSION = "0.4"

    constructor(...args) {
        const {configs, mutator, name} = parseArgs(args);

        // If the mutator is provided, override the default identity func.
        if (mutator) {
            this.mutate = (nextValue) => mutator(nextValue, this.getValue());
        }

        // Transform the configs to a func to get the next value.
        const getNext = getNextValueGenerator(configs);

        // Assign `name` to the next mutated value(s), after `times` iterations.
        // If `times` is 1, just return the value, otherwise return an array.
        this.next = (times=1) => {
            const values = [
                for (time of range(1, times + 1))
                this.setValue(this.mutate(getNext()))
            ];
            return times == 1 ? values[0] : values;
        };

        if (name) {
            this[name] = (...args) => this.next(...args);
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
