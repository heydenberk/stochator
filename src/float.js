const boundedRandom = (min = 0, max = 1, prng=Math.random) => {
    const spread = max - min;
    return prng() * spread + min;
};

export default {boundedRandom};
