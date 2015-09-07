import _ from "lodash";
import color from "./color";
import distribution from "./distribution";
import float from "./float";
import integer from "./integer";
import seedrandom from "seedrandom";
import set from "./set";
import string from "./string";

const floatGenerator = (prng, min, max, mean, stdev) => {
    if (mean && stdev) {
        return () => distribution.randomNormallyDistributedFloat(prng, mean, stdev, min, max);
    } else {
        return () => float.boundedRandom(prng, min, max);
    }
};

const integerGenerator = (prng, min = 0, max = 1) => {
    return () => integer.boundedRandom(prng, min, max);
};

const setGenerator = (prng, values, replacement = true, shuffle = false, weights = null) => {
    if (!values || !values.length) {
        throw Error("Must provide a 'values' array for a set generator.")
    }

    if (shuffle) {
        return () => set.shuffle(prng, values);
    } else if (replacement) {
        if (weights) {
            return () => set.weightedRandomMember(prng, values, weights);
        } else {
            return () => set.randomMember(prng, values);
        }
    } else {
        return () => set.randomMemberWithoutReplacement(prng, values);
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
            generator = color.randomColor(prng);
            break;
        case "a-z":
        case "A-Z":
            generator = kind === "a-z" ?
                string.randomLowercaseCharacter(prng)
                : string.randomUppercaseCharacter(prng);
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
        if (result.mutator || _.isString(arg)) {
            result.name = arg;
        } else if (_.isFunction(arg)) {
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
                for (time of _.range(1, times + 1))
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
