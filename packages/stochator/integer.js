const randomBoundedInteger = (prng, min = 0, max = 1) => {
    const spread = 1 + max - min;
    return Math.floor(prng() * spread) + min;
};

export default {randomBoundedInteger};
