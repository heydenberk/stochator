import integer from "./integer";

const random = (prng=Math.random) =>
    Boolean(integer.boundedRandom(0, 1, prng));

export default {random};