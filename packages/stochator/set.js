import {randomBoundedFloat} from "./float";
import {randomBoundedInteger} from "./integer";

const randomSetMember = (prng, values) => {
    const max = values.length - 1;
    return values[randomBoundedInteger(prng, 0, max)];
};

const randomSetMemberWithoutReplacement = (prng, values) => {
    if (values.length > 0) {
        const index = randomBoundedInteger(prng, 0, values.length - 1);
        const value = values[index];
        values.splice(index, 1);
        return value;
    }
};

const randomWeightedSetMember = (prng, values, weights) => {
    let [member, weightSum, float] = [undefined, 0, randomBoundedFloat(prng)];
    values.forEach((value, index) => {
        if (member) {
            return;
        }
        const weight = weights[index];
        if (float <= weightSum + weight && float >= weightSum) {
            member = value;
        }
        weightSum += weight;
    });

    return member;
};

const shuffleSet = (prng, values) => {
    let valuesRef = [...values];
    for (index of range(0, valuesRef.length)) {
        randomIndex = randomBoundedInteger(prng, 0, index);

        tmp = valuesRef[index];
        valuesRef[index] = valuesRef[randomIndex];
        valuesRef[randomIndex] = tmp;
    }
    return valuesRef;
};

export default {
    randomSetMember,
    randomSetMemberWithoutReplacement,
    randomWeightedSetMember,
    shuffleSet
};
