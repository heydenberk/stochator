import integer from "./integer";

const LOWERCASE_RANGE = [97, 122];

const UPPERCASE_RANGE = [65, 90];

const randomLowercaseCharacter = (prng) => {
    const [min, max] = LOWERCASE_RANGE;
    return () => String.fromCharCode(integer.boundedRandom(prng, min, max));
};

const randomUppercaseCharacter = (prng) => {
    const [min, max] = UPPERCASE_RANGE;
    return () => String.fromCharCode(integer.boundedRandom(prng, min, max));
};

export default {randomLowercaseCharacter, randomUppercaseCharacter};
