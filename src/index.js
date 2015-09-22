import identity from "lodash.identity";
import isFunction from "lodash.isFunction";
import isRegExp from "lodash.isregexp";
import isString from "lodash.isString";
import range from "lodash.range";
import boolean from "./boolean";
import color from "./color";
import distribution from "./distribution";
import float from "./float";
import integer from "./integer";
import seedrandom from "seedrandom";
import set from "./set";
import string from "./string";

const booleanGenerator = ({prng}) => () => boolean.random(prng);

const colorGenerator = ({prng}) => () => color.randomRgb(prng);

const floatGenerator = ({min, max, mean, prng, stdev}) => {
    if (mean && stdev) {
        return () => distribution.randomNormallyDistributedFloat(mean, stdev, min, max, prng);
    } else {
        return () => float.boundedRandom(min, max, prng);
    }
};

const integerGenerator = ({min, max, prng}) => {
    return () => integer.boundedRandom(min, max, prng);
};

const setGenerator = ({values, prng, replacement=true, shuffle=false, weights=null}) => {
    if (!values || !values.length) {
        throw Error("Must provide a 'values' array for a set generator.")
    }

    if (shuffle) {
        return () => set.shuffleSet(values, prng);
    } else if (replacement) {
        if (weights) {
            return () => set.weightedRandomMember(values, weights, prng);
        } else {
            return () => set.randomMember(values, prng);
        }
    } else {
        return () => set.randomMemberWithoutReplacement(values, prng);
    }
};

const stringGenerator = ({kind, expression=`[${kind}]`, ignoreCase=false, maxWildcard=100, prng, unicode=false}) => {
    const isRe = isRegExp(expression);
    const exprSource = isRe ? expression.source : expression;
    const options = {
        ignoreCase: ignoreCase || (isRe && expression.ignoreCase),
        maxWildcard,
        prng
    };
    return string.generateString(unicode, exprSource, options);
};

const KIND_GENERATORS = {
    "boolean": booleanGenerator,
    "float": floatGenerator,
    "integer": integerGenerator,
    "set": setGenerator,
    "color": colorGenerator,
    "rgb": colorGenerator,
    "string": stringGenerator,
    "a-z": stringGenerator,
    "A-Z": stringGenerator
};

const VALID_KINDS = Object.keys(KIND_GENERATORS);

const validateKind = (kind) => {
    if (VALID_KINDS.indexOf(kind) !== -1) {
        return true;
    }
    throw Error(`${kind} is in invalid kind. Valid kinds include:
    ${VALID_KINDS.join(', ')}`);
};

const getConfigWithDefaults = (rawConfig) => {
    return {kind: "float", ...rawConfig, prng: getPrng(rawConfig)};
};

const createGenerator = (rawConfig) => {
    const config = getConfigWithDefaults(rawConfig);
    validateKind(config.kind);
    return KIND_GENERATORS[config.kind](config);
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

const getPrng = ({seed, prng}) => {
    const defaultPrng = seed ? seedrandom : Math.random;
    const basePrng = prng ? prng : defaultPrng;
    return seed ? basePrng(seed) : basePrng;
};

const parseArgs = (args) => {
    const defaults = {configs: [], mutator: null, name: null};
    return args.reduce((result, arg) => {
        if (result.mutator || isString(arg)) {
            result.name = arg;
        } else if (isFunction(arg)) {
            result.mutator = arg;
        } else {
            result.configs.push(arg);
        }
        return result;
    }, defaults);
};


export default class Stochator {

    VERSION = "0.5"

    static fromDistribution = {
        normal: distribution.randomNormallyDistributedFloat
    };

    static randomBoolean = boolean.random;

    static randomColor = color.randomRgb;

    static randomFloat = float.boundedRandom;

    static randomInteger = integer.boundedRandom;

    static randomLowercaseCharacter = string.randomLowercaseCharacter;

    static randomUppercaseCharacter = string.randomUppercaseCharacter;

    static randomSetMember = set.randomMember;

    static randomSetMemberWithoutReplacement = set.randomMemberWithoutReplacement;

    static weightedRandomSetMember = set.weightedRandomMember;

    static shuffleSet = set.shuffleSet;


    constructor(...args) {
        const {configs, mutator, name} = parseArgs(args);

        // If the mutator is provided, override the default identity func.
        this.mutate = mutator ?
            (nextValue) => mutator(nextValue, this.getValue()) : identity;

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

    setValue(value) {
        this._value = value;
        return this._value;
    }

    toString() {
        return "[object Stochator]";
    }

    _value = 0
}

if (global) {
    global.Stochator = Stochator;
}
