import boolean from "./boolean";
import integer from "./integer";
import set from "./set";

import ret from "ret";
import DRange from "discontinuous-range";
import _range from "lodash.range";

const LOWERCASE_RANGE = [97, 122];

const UPPERCASE_RANGE = [65, 90];

const ASCII_RANGE = [32, 126];

const UNICODE_RANGE = [0, 65535];

const AsciiDRange = DRange(...ASCII_RANGE);

const UnicodeDRange = DRange(...UNICODE_RANGE);

const inRange = ([min, max], n) => n >= min && n <= max;

const changeCase = (code) => {
    const lowercase = inRange(LOWERCASE_RANGE, code);
    const uppercase = inRange(UPPERCASE_RANGE, code);
    return lowercase || uppercase ? code + (lowercase ? -32 : 32) : code;
};

const createChar = (code, ignoreCase, prng) =>
    code === null ? '' : String.fromCharCode(
        ignoreCase && boolean.random(prng) ? changeCase(code) : code);

const expandCharacter = ({value}) => DRange(value);

const expandRange = ({from, to}) => DRange(from, to);

const expandSet = (token, range) => {
    let drange = DRange();
    let setRanges = token.set.map((code) => expand(code, range));
    setRanges.forEach((setRange) => drange.add(setRange));
    return token.not ? range.clone().subtract(drange) : drange;
};

const expanders = {
  [ret.types.SET]: expandSet,
  [ret.types.RANGE]: expandRange,
  [ret.types.CHAR]: expandCharacter
};

const expand = (token, ...args) => expanders[token.type](token, ...args);

// These generators accept a token and the options object and return a character
// code.

const generateCharFromSet = (token, {range, prng}) => {
    const set = expand(token, range);
    return set.index(integer.boundedRandom(0, set.length - 1, prng));
};

const generateCharFromRange = ({from, to}, {prng}) =>
    integer.boundedRandom(from, to, prng);

const generateChar = ({value}) => value;

const createCharGenerator = (func) =>
    (token, _, {range, ignoreCase, prng}) =>
        createChar(func(token, {range, ignoreCase, prng}), ignoreCase, prng);

// These generators accept a token, the groups and the options and return a
// sequence of tokens, which are then in turn passed to generator functions.

const generateFromGroup = ({notFollowedBy, options, stack}, _, {prng}) =>
    notFollowedBy ? [] : options ? set.randomMember(options, prng) : stack;

const generateRepeat = (token, _, options) => {
    const max = token.max === Infinity ? token.min + options.max : token.max;
    return _range(integer.boundedRandom(token.min, max, options.prng))
        .map(() => token.value);
};

const createSequenceGenerator = (func) =>
    (token, groups, options) =>
        func(token, groups, options)
            .map((value) => generateFromToken(value, groups, options)).join('');

// Generator dispatch table based upon the token type.

const generators = {
    [ret.types.ROOT]: createSequenceGenerator(generateFromGroup),
    [ret.types.GROUP]: createSequenceGenerator(generateFromGroup),
    [ret.types.POSITION]: () => '',
    [ret.types.REPETITION]: createSequenceGenerator(generateRepeat),
    [ret.types.REFERENCE]: ({value}, groups) => groups[value - 1],
    [ret.types.CHAR]: createCharGenerator(generateChar),
    [ret.types.SET]: createCharGenerator(generateCharFromSet),
    [ret.types.RANGE]: createCharGenerator(generateCharFromRange)
};

const generateFromToken = (token, groups, options) => {
    const result = generators[token.type](token, groups, options);
    if (token.type === ret.types.GROUP && token.remember) {
        groups.push(result);
    }
    return result;
};

const generateStringFromRange = (range, expression, options) =>
    () => generateFromToken(ret(expression), [], {range, ...options});

// Exported public functions.

const generateCharacterFromRange = ([min, max], {prng}) =>
    generateStringFromRange(DRange(min, max), '.', {prng});

const generateString = (unicode, expression, options) =>
    generateStringFromRange(
        unicode ? UnicodeDRange : AsciiDRange, expression, options);

const randomCharacterFromRange = (range, prng=Math.random) =>
    generateCharacterFromRange(range, {prng})();

const randomAsciiString = (expression, ignoreCase, prng=Math.random) =>
    generateStringFromRange(AsciiDRange, expression, {ignoreCase, prng});

const randomUnicodeString = (expression, ignoreCase, prng=Math.random) =>
    generateStringFromRange(UnicodeDRange, expression, {ignoreCase, prng});

const randomAsciiCharacter = (prng=Math.random) =>
    generateCharacterFromRange(ASCII_RANGE, {prng})();

const randomLowercaseCharacter = (prng=Math.random) =>
    generateCharacterFromRange(LOWERCASE_RANGE, {prng})();

const randomUnicodeCharacter = (prng=Math.random) =>
    generateCharacterFromRange(UNICODE_RANGE, {prng})();

const randomUppercaseCharacter = (prng=Math.random) =>
    generateCharacterFromRange(UPPERCASE_RANGE, {prng})();

export default {
    generateString,
    randomCharacterFromRange,
    randomAsciiString,
    randomUnicodeString,
    randomAsciiCharacter,
    randomLowercaseCharacter,
    randomUnicodeCharacter,
    randomUppercaseCharacter
};
