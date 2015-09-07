import float from "./float";
import integer from "./integer";

const randomMember = (prng, values) => {
    const max = values.length - 1;
    return values[integer.boundedRandom(prng, 0, max)];
};

const randomMemberWithoutReplacement = (prng, values) => {
    if (values.length > 0) {
        const index = integer.boundedRandom(prng, 0, values.length - 1);
        const value = values[index];
        values.splice(index, 1);
        return value;
    }
};

const weightedRandomMember = (prng, values, weights) => {
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

const shuffle = (prng, values) => {
    let valuesRef = [...values];
    for (index of range(0, valuesRef.length)) {
        randomIndex = integer.boundedRandom(prng, 0, index);

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
