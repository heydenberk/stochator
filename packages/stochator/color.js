import integer from "./integer";

const randomRgb = (prng=Math.random) => {
    return () => {
        return {
            red: integer.randomByte(prng),
            green: integer.randomByte(prng),
            blue: integer.randomByte(prng)
        };
    };
};

export default {randomRgb};
