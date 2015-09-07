const boundedRandom = (min = 0, max = 1, prng=Math.random) => {
    const spread = 1 + max - min;
    return Math.floor(prng() * spread) + min;
};

const randomByte = (prng=Math.random) => {
    return boundedRandom(0, 255, prng);
};

export default {boundedRandom, randomByte};
