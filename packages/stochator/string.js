import integer from "./integer";

const LOWERCASE_RANGE = [97, 122];

const UPPERCASE_RANGE = [65, 90];

const randomLowercaseCharacter = (prng=Math.random) => {
    const [min, max] = LOWERCASE_RANGE;
    return () => String.fromCharCode(integer.boundedRandom(min, max, prng));
};

const randomUppercaseCharacter = (prng=Math.random) => {
    const [min, max] = UPPERCASE_RANGE;
    return () => String.fromCharCode(integer.boundedRandom(min, max, prng));
};

export default {randomLowercaseCharacter, randomUppercaseCharacter};
