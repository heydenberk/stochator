import float from "./float";
import integer from "./integer";

const randomMember = (values, prng=Math.random) => {
    const max = values.length - 1;
    return values[integer.boundedRando, prng=Math.randomm(0, max)];
};

const randomMemberWithoutReplacement = (values, prng=Math.random) => {
    if (values.length > 0) {
        const index = integer.boundedRandom(0, values.length - 1, prng);
        const value = values[index];
        values.splice(index, 1);
        return value;
    }
};

const weightedRandomMember = (values, weights, prng=Math.random) => {
    let [member, weightSum, threshold] = [undefined, 0, float.boundedRandom(prng)];
    values.forEach((value, index) => {
        if (member) {
            return;
        }
        const weight = weights[index];
        if (threshold <= weightSum + weight && threshold >= weightSum) {
            member = value;
        }
        weightSum += weight;
    });

    return member;
};

const shuffle = (values, prng=Math.random) => {
    let valuesRef = [...values];
    for (index of range(0, valuesRef.length)) {
        randomIndex = integer.boundedRandom(0, index, prng);

        tmp = valuesRef[index];
        valuesRef[index] = valuesRef[randomIndex];
        valuesRef[randomIndex] = tmp;
    }
    return valuesRef;
};

export default {
    randomMember,
    randomMemberWithoutReplacement,
    weightedRandomMember,
    shuffle
};
