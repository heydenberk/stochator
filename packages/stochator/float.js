const randomBoundedFloat = (prng, min = 0, max = 1) => {
    const spread = max - min;
    return prng() * spread + min;
};

export default {randomBoundedFloat};
