const boundedRandom = (prng, min = 0, max = 1) => {
    const spread = 1 + max - min;
    return Math.floor(prng() * spread) + min;
};

const randomByte = (prng) => {
    return boundedRandom(prng, 0, 255);
};

export default {boundedRandom, randomByte};
