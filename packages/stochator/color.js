import integer from "./integer";

const randomColor = (prng) => {
    const randomOrd = () => integer.boundedRandom(prng, 0, 255);
    return () => {
        return {red: randomOrd(), green: randomOrd(), blue: randomOrd()}
    };
};

export default {randomColor};
