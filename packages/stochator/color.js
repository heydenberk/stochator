import integer from "./integer";

const randomColor = (prng) => {
    return () => {
        return {
            red: integer.randomByte(prng),
            green: integer.randomByte(prng),
            blue: integer.randomByte(prng)
        };
    };
};

export default {randomColor};
