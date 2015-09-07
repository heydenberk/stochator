import integer from "./integer";

const LOWERCASE_RANGE = [97, 122];

const UPPERCASE_RANGE = [65, 90];

const randomCharacter = (prng, lowercase) => {
    const [min, max] = lowercase ? LOWERCASE_RANGE : UPPERCASE_RANGE;
    return () => String.fromCharCode(integer.boundedRandom(prng, min, max));
};

export default {randomCharacter};
