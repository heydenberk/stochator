Download the latest compiled version of stochator.js (0.5):
- [development](https://github.com/heydenberk/stochator/releases/download/0.5/stochator.js) (unminified, 60Kb).
- [production](https://github.com/heydenberk/stochator/releases/download/0.5/stochator.min.js) (minified, 24Kb).

# Stochator

`Stochator` is a tiny library providing for creating a variety of random value generators.

- [Floating-point decimals](#floating-point-decimals)
- [Floats from an interval](#floats-from-an-interval)
- [Floats from a normal distribution](#floats-from-a-normal-distribution)
- [Integers](#integers)
- [Multiple results](#multiple-results)
- [From sets](#from-sets)
- [From sets with weights](#from-sets-with-weights)
- [From sets without replacement](#from-sets-without-replacement)
- [From predefined sets](#from-predefined-sets)
- [Mutators](#mutators)
- [Multiple generators](#multiple-generators)
- [Changelog](#changelog)

To create a `Stochator` object, simply invoke the constructor and pass it an `options` object with a `kind` property. If not provided, kind is 'float'.

Valid kinds include `float`, `integer`, `set`, `color`, `a-z` and `A-Z`.

## Floating-point decimals
*New in 0.5: available as `Stochator.randomFloat(min, max, prng=Math.random)`*

It's very easy generate a float between 0 and 1.

````js
var generator = new Stochator({});
generator.next(); // 0.9854211050551385
generator.next(); // 0.8784450970124453
generator.next(); // 0.1592887439765036
````

This is not very exciting because it simply wraps the built-in `Math.random` method.


## Floats from an interval
*New in 0.5: available as `Stochator.randomFloat(min, max, prng=Math.random)`*

Specifying a min and a max allows us to create random numbers in the interval (min, max), not inclusive.

````js
var radianGenerator = new Stochator({
	min: 0,
	max: Math.PI * 2
});
radianGenerator.next(); // 3.7084574239999655
radianGenerator.next(); // 1.021138034566463
radianGenerator.next(); // 4.012664264853087
````

## Floats from a normal distribution
*New in 0.5: available as: `Stochator.fromDistribution.normal(mean, stdev, min, max, prng=Math.random)`*

We can also generate random floats from a normal distribution. Min and max are optional, and when provided will result in truncation of all results outside of [min, max].

````js
var testScores = new Stochator({
	mean: 75,
	stdev: 14,
	min: 0,
	max: 100
});
testScores.next(); // 59.437160028200125
testScores.next(); // 80.18612670399554
testScores.next(); // 75.81242027226946
````

## Integers
*New in 0.5: available as `Stochator.randomInteger(min, max, prng=Math.random)`*

For integers, the interval [min, max] is inclusive. Notice that the optional argument `name` allows us to alias `next` to a more descriptive method name.

````js
var die = new Stochator({
	kind: "integer",
	min: 1,
	max: 6
}, "roll");
die.roll(); // 6
die.roll(); // 1
die.roll(); // 2
````

## Multiple results

If the `next` method (or a method aliased to it) is passed an integer `n`, it will return an n-length array of results. Using the die instance from the previous example:

````js
die.roll(1); // [5]
die.roll(2); // [5, 3]
die.roll(5); // [6, 3, 6, 6, 5]
````


## From sets
*New in 0.5: available as `Stochator.randomSetMember(values, prng=Math.random)`*

We can generate random values from arbitary sets.

````js
var dayGenerator = new Stochator({
	kind: "set",
	values: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
});
dayGenerator.next(); // friday
dayGenerator.next(); // monday 
dayGenerator.next(); // monday
````
	
## From sets with weights
*New in 0.5: available as `Stochator.weightedRandomSetMember(values, weights, prng=Math.random)`*

What if we favor the weekend? Well, we can pass `weights`, an array of the same length as `values` consisting of probabilities out of 1 that correspond to `values`.

````js
var biasedDayGenerator = new Stochator({
	kind: "set",
	values: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
	weights: [0.1, 0.1, 0.1, 0.1, 0.1, 0.25, 0.25]
});
biasedDayGenerator.next(); // thursday
biasedDayGenerator.next(); // sunday 
biasedDayGenerator.next(); // saturday
````

## From sets without replacement
*New in 0.5: available as `Stochator.randomSetMemberWithoutReplacement(set, prng=Math.random)`*

Passing a `replacement` property with a falsy value will result in each random
value generation to be removed from the set.

````js
var chores = new Stochator({
	kind: "set",
	values: ["floors", "windows", "dishes"],
	replacement: false
});
var myChore = chores.next(); // "windows"
var yourChore = chores.next(); // "floors"
var hisChore = chores.next(); // "dishes"
var noOnesChore = chores.next(); // undefined
````

## From predefined sets
*New in 0.5: available as `Stochator.randomColor(prng=Math.random)`, `Stochator.randomLowercaseCharacter(prng=Math.random)` and `Stochator.randomUppercaseCharacter(prng=Math.random)`*

At present, predefined sets include `"a-z"`, `"A-Z"` and `"color"`.

````js
var colorGenerator = new Stochator({
	kind: "color"
});
colorGenerator.next(); // { red: 122, green: 200, blue: 121 }
colorGenerator.next(); // { red: 129, green: 89, blue: 192 }
colorGenerator.next(); // { red: 125, green: 211, blue: 152 }
````

Note that this example passes an integer argument `n` to `next` which causes
the stochator to return an array with the result of `n` calls to the generator.

````js
var characterGenerator = new Stochator({
	kind: "a-z"
});
characterGenerator.next(25).join(""); // "uktlbkgufzjiztatmqelawfez"
characterGenerator.next(25).join(""); // "wdhygotehcfmrkjyuuovztxla"
characterGenerator.next(25).join(""); // "mbjxkhflycpxgdrtyyyevasga"
````

## Mutators
The constructor accepts an optional final argument which is passed the output
of the random value generator. Its return value becomes the return value of
next or its alias. To generate random boolean values, we can do:

````js
var booleanGenerator = new Stochator({
	kind: "integer",
	min: 0,
	max: 1
}, Boolean);

booleanGenerator.next(); // false
booleanGenerator.next(); // true
booleanGenerator.next(); // true
````

We can map the previously mentioned `radianGenerator` to the cosine of its values.

````js
var radianSineGenerator = new Stochator({
	min: 0,
	max: Math.PI * 2
}, Math.cos);
radianSineGenerator.next(); // -0.31173382958096524
radianSineGenerator.next(); // -0.6424354006937544
radianSineGenerator.next(); // 0.6475980728835664
````

Mutators remember their previous result and, at each generation, apply the results of a specified stochator to create a new result.

 _(This is functionally equivalent to a Markov chain.)_

````js
var drunkardsWalk = new Stochator({
	kind: "integer",
	min: -1,
	max: 1
}, function(a, b) { return a + b; });

drunkardsWalk.next(10); // [-1, -2, -2, -1, -1, -1, 0, 1, 1, 2]
drunkardsWalk.next(10); // [3, 3, 3, 2, 1, 0, -1, 0, 0, 0]
drunkardsWalk.next(10); // [0, 1, 0, -1, 0, 0, 1, 2, 1, 1]
````

Let's model a bank account's balance. How much money might you have after 10 years if you start with $1000, add $1000 every year, and get interest at a random rate between 1% and 5%?

````js
var addInterest = function(interestRate, principal) {
	return (principal + 1000) * interestRate;
};
var savingsAccountBalance = new Stochator({
	kind: "float",
	min: 1.01,
	max: 1.05
}, addInterest);

savingsAccountBalance.setValue(1000); // Sets the initital value
savingsAccountBalance.next(10);
/*
[
	2096.2402432970703,
	3177.3792999428224,
	4339.349049328612,
	5441.863800747634,
	6507.916293297546,
	7669.519280743041,
	9011.783840249629,
	10225.82489660009,
	11630.122217972781,
	12782.667463879243
]
*/
````

## Multiple generators
If the Stochator constructor is passed multiple configuration objects, `next` (or its alias) returns an array of each random generated value.

To generate a random point, we might do:

````js
var x = { kind: 'integer', min: 0, max: 480 };
var y = { kind: 'integer', min: 0, max: 360 };
var mutator = function(values) {
	return {
		x: values[0],
		y: values[1]
	};
};
var randomPoint = new Stochator(x, y, mutator);

randomPoint.next(); // { x: 79, y: 65 }
randomPoint.next(); // { x: 151, y: 283 }
randomPoint.next(); // { x: 5, y: 253 }
````

## Overriding the pseudo-random number generator
*New in 0.4.*

Add a `prng` function to the configuration object to set your own pseudo-random number generator.

````js
var seedrandom = require('seedrandom');
new Stochator({ prng: seedrandom('STOCHATOR') }).next(); // Always 0.4045178783365678
````

## Using a seed
*New in 0.4.*

Rather than requiring seedrandom and passing a PRNG with a seed (as above), you can simply provide a seed value.
````js
new Stochator({ seed: 'STOCHATOR' }).next(); // Still always 0.4045178783365678
````

## Changelog
### 0.5
The entire project has been rewritten to use ES6 features, with translation handled by babel and browserify.
In addition, `Stochator` has been supplemented with static methods to facilitate single-use value generators.
### 0.4
`prng` can be provided on a config object to override `Math.random` as the pseudo-random number generator. `seed` can be provided to seed the PRNG with an initial value. If both are provided, the PRNG will be the function returned by calling `config.prng(config.seed)`; if just `seed` is provided, the PRNG will default to [seedrandom](https://github.com/davidbau/seedrandom) rather than `Math.random`.
