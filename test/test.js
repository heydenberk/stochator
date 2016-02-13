var _ = require('lodash');
var assert = require('assert');
var seedrandom = require('seedrandom');
var Stochator = require('../build');

var getPrng = function() {
    return seedrandom('STOCHATOR');
};

describe('Stochator (with seed STOCHATOR)', function() {

    it('should fail with an invalid kind', function() {
        assert.throws(function() {
            return new Stochator({kind: 'GARBAGE'}).next();
        });
    });

    describe('the floating-point number generator', function() {

        it('should return a float between 0 and 1', function() {
            var result1 = new Stochator({
                seed: 'STOCHATOR'
            }).next();
            var result2 = Stochator.randomFloat(0, 1, getPrng());

            assert.equal(result1, 0.4045178783365678);
            assert.equal(result2, 0.4045178783365678);
        });

        it('should return a float between given bounds', function() {
            var result1 = new Stochator({
                min: 0,
                max: Math.PI * 2,
                seed: 'STOCHATOR'
            }).next();
            var result2 = Stochator.randomFloat(0, Math.PI * 2, getPrng());

            assert.equal(result1, 2.5416607896557823);
            assert.equal(result2, 2.5416607896557823);
        });

        it('should return a number from a normal distribution', function() {
            var result1 = new Stochator({
                mean: 75,
                stdev: 14,
                min: 0,
                max: 100,
                seed: 'STOCHATOR'
            }).next();
            var result2 = Stochator.fromDistribution.normal(75, 14, 0, 100, getPrng());

            assert.equal(result1, 71.61661782743502);
            assert.equal(result2, 71.61661782743502);
        });
    });

    describe('the integer generator', function() {

        it('should return an integer between given bounds when "roll" is called', function() {
            var result1 = new Stochator({
                kind: "integer",
                min: 1,
                max: 6,
                seed: "STOCHATOR"
            }, "roll").roll();
            var result2 = Stochator.randomInteger(1, 6, getPrng());

            assert.equal(result1, 3);
            assert.equal(result2, 3);
        });

        it('should return an array of six integers between given bounds when "roll" is called', function() {
            var result1 = new Stochator({
                kind: "integer",
                min: 1,
                max: 6,
                seed: "STOCHATOR"
            }, "roll").roll(5);

            var prng = getPrng();
            var result2 = _.range(5).map(function() {
                return Stochator.randomInteger(1, 6, prng);
            });

            assert.deepEqual(result1, [3, 6, 5, 1, 4]);
            assert.deepEqual(result2, [3, 6, 5, 1, 4]);
        });

    });

    describe('the boolean generator', function() {

        it('should return a random boolean value', function() {
            var result1 = new Stochator({kind: "boolean", seed: "STOCHATOR"}).next();
            var result2 = Stochator.randomBoolean(getPrng());

            assert.equal(result1, false);
            assert.equal(result2, false);
        });

    });

    describe('the set generator', function() {

        it('should return an item from a given array', function() {
            var result1 = new Stochator({
                kind: "set",
                values: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                seed: "STOCHATOR"
            }).next();
            var result2 = Stochator.randomSetMember(
                ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                getPrng());

            assert.equal(result1, 'wednesday');
            assert.equal(result2, 'wednesday');
        });

        it("should return 7 items from an array with replacement according to given weights", function() {
            var result1 = new Stochator({
                kind: "set",
                values: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                weights: [0.1, 0.1, 0.1, 0.1, 0.1, 0.25, 0.25],
                seed: 'STOCHATOR'
            }).next(7);

            var prng = getPrng();
            var result2 = _.range(7).map(function() {
                return Stochator.weightedRandomSetMember(
                    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                    [0.1, 0.1, 0.1, 0.1, 0.1, 0.25, 0.25],
                    prng
                );
            });

            assert.deepEqual(result1, ['friday', 'sunday', 'sunday', 'monday', 'saturday', 'monday', 'saturday']);
            assert.deepEqual(result2, ['friday', 'sunday', 'sunday', 'monday', 'saturday', 'monday', 'saturday']);
        });

        it("should return 4 items from a set of 3 without replacement with a final item of undefined", function() {
            var result1 = new Stochator({
                kind: "set",
                values: ["floors", "windows", "dishes"],
                replacement: false,
                seed: 'STOCHATOR'
            }).next(4);

            var prng = getPrng();
            var set = ["floors", "windows", "dishes"];
            var result2 = _.range(4).map(function() {
                return Stochator.randomSetMemberWithoutReplacement(set, prng);
            });

            assert.deepEqual(result1, ['windows', 'dishes', 'floors', undefined]);
            assert.deepEqual(result2, ['windows', 'dishes', 'floors', undefined]);
        });

    });

    describe('the color generator', function() {

        it("should return an object with red, green and blue values", function() {
            var result1 = new Stochator({
                kind: "color",
                seed: 'STOCHATOR'
            }).next();
            var result2 = Stochator.randomColor(getPrng());

            assert.deepEqual(result1, { red: 103, green: 244, blue: 192 });
            assert.deepEqual(result2, { red: 103, green: 244, blue: 192 });
        });

    });

    describe('the lowercase string generator', function() {

        it("should return 25 lowercase characters", function() {
            var result1 = new Stochator({
                kind: "a-z",
                seed: 'STOCHATOR'
            }).next(25).join('');

            var prng = getPrng();
            var result2 = _.range(25).map(function() {
                return Stochator.randomLowercaseCharacter(prng);
            }).join('');

            assert.equal(result1, 'kytapcrgjzwlmbbgxaeqlyspr');
            assert.equal(result2, 'kytapcrgjzwlmbbgxaeqlyspr');
        });

    });

    describe('the string generator', function() {

        it("should return 36 alphanumeric characters", function() {
            var result = new Stochator({
                kind: "string",
                expression: "[a-zA-Z0-9]{36}",
                prng: getPrng()
            }).next();

            assert.equal(result, '7UbLfPow91BEddp4akNC7SLP4F3SxPj8bb6f');
        });

        it("should randomize the case when ignoreCase is true", function() {
            var result = new Stochator({
                kind: "string",
                expression: "Stochator",
                ignoreCase: true,
                prng: getPrng()
            }).next();

            assert.equal(result, 'STOcHaTor');
        });

        it("should randomize the case when the i flag is set on a RegExp", function() {
            var result = new Stochator({
                kind: "string",
                expression: /Stochator/i,
                prng: getPrng()
            }).next();

            assert.equal(result, 'STOcHaTor');
        });

        it("should generate values from within groups", function() {
            var result = new Stochator({
                kind: "string",
                expression: "Hello, (world|Stochator)!",
                prng: getPrng()
            }).next();

            assert.equal(result, 'Hello, world!');
        });

        it("should generate values that don't match negated groups", function() {
            var result = new Stochator({
                kind: "string",
                expression: "[^\\w]{10}",
                prng: getPrng()
            }).next();

            assert.equal(result, '}\\ ="?\'+~`');
        });

        it("should generate values from within groups and with back-references", function() {
            var result = new Stochator({
                kind: "string",
                expression: "Hello, (world|Stochator)! You're a great \\1!",
                prng: getPrng()
            }).next();

            assert.equal(result, "Hello, world! You're a great world!");
        });

        it("should generate values with multiple out-of-order back-references", function() {
            var result = new Stochator({
                kind: "string",
                expression: "Hello, (Alice|Bob)\\. Hello (Carol|Dan)\\. \\2, meet \\1\\. \\1, meet \\2\\.",
                prng: getPrng()
            }).next();

            assert.equal(result, "Hello, Alice. Hello Dan. Dan, meet Alice. Alice, meet Dan.");
        });

        it("should generate values that match positive lookaheads", function() {
            var result = new Stochator({
                kind: "string",
                expression: "Alli(?=gators|son)",
                prng: getPrng()
            }).next();

            assert.equal(result, "Alligators");
        });

        it("should generate values that match negative lookaheads", function() {
            var result = new Stochator({
                kind: "string",
                expression: "Alli(?!son|gators)ance",
                prng: getPrng()
            }).next();

            assert.equal(result, "Alliance");
        });

        it("should generate values from repeated groups", function() {
            var result = new Stochator({
                kind: "string",
                expression: "My favorite color is #([0-9A-F]{2}){3}",
                prng: getPrng()
            }).next();

            assert.equal(result, "My favorite color is #C01A5F");
        });

        it("should generate unicode strings when specified", function() {
            var result = new Stochator({
                kind: "string",
                expression: ".{5}!",
                unicode: true,
                prng: getPrng()
            }).next();

            assert.equal(result, "쁇ڣ馟ᗤ!");
        });

        it("should generate longer wildcard matches when specified", function() {
            var result = new Stochator({
                kind: "string",
                expression: "Look at all this binary: ((0|1){256})",
                maxWildcard: 256,
                prng: getPrng()
            }).next();

            assert.equal(result, [
                'Look at all this binary: ',
                '11010100110000010010111111110101',
                '00100100000110111100010101011100',
                '10100111010001111100110111010100',
                '01001101011111010111110110111101',
                '11110110000000111100101001001001',
                '00010010101001001000101010110110',
                '01011010001111001011111101010011',
                '11001000100111101110001001110100'
            ].join(''));
        });

    })

    describe('the integer generator with a mutator', function() {

        it("should return true or false", function() {
            var result1 = new Stochator({
                kind: "integer",
                min: 0,
                max: 1,
                seed: 'STOCHATOR'
            }, Boolean).next();
            var result2 = Boolean(Stochator.randomInteger(0, 1, getPrng()));

            assert.equal(result1, false);
            assert.equal(result2, false);
        });

    });

    describe('the float generator with mutator', function() {

        it("should return the cosine of a given within given bounds", function() {
            var result1 = new Stochator({
                min: 0,
                max: Math.PI * 2,
                seed: 'STOCHATOR'
            }, Math.cos).next();
            var result2 = Math.cos(Stochator.randomFloat(0, Math.PI * 2, getPrng()));

            assert.equal(result1, -0.8253740855106559);
            assert.equal(result2, -0.8253740855106559);
        });

    });

    describe('the integer generator with mutator that uses previous value', function() {

        it("should return 10 integers that are all equal the previous item +/- 1", function() {
            var result1 = new Stochator({
                kind: "integer",
                min: -1,
                max: 1,
                seed: 'STOCHATOR'
            }, function(a, b) { return a + b; }).next(10);

            var prng = getPrng();
            var sum = 0;
            var result2 = _.range(10).map(function() {
                sum += Stochator.randomInteger(-1, 1, prng);
                return sum;
            });

            assert.deepEqual(result1, [0, 1, 2, 1, 1, 0, 0, -1, -1, 0]);
            assert.deepEqual(result2, [0, 1, 2, 1, 1, 0, 0, -1, -1, 0]);
        });

        it("should return 10 numbers that increase by a given fixed amount and a bounded relative change", function() {
            var addInterest = function(interestRate, principal) {
                return (principal + 1000) * interestRate;
            };
            var result1 = new Stochator({
                kind: "float",
                min: 1.01,
                max: 1.05,
                seed: 'STOCHATOR'
            }, addInterest).next(10);

            var prng = getPrng();
            var principal = 0;
            var result2 = _.range(10).map(function() {
                var interestRate = Stochator.randomFloat(1.01, 1.05, prng);
                principal = addInterest(interestRate, principal);
                return principal;
            });

            assert.deepEqual(result1, [
                1026.1807151334629,
                2123.8934948333995,
                3248.9834498702794,
                4295.874912610078,
                5475.947903284715,
                6562.853629181616,
                7838.825069340333,
                9010.692918061377,
                10256.214835559122,
                11812.764583986824
            ]);
            assert.deepEqual(result2, [
                1026.1807151334629,
                2123.8934948333995,
                3248.9834498702794,
                4295.874912610078,
                5475.947903284715,
                6562.853629181616,
                7838.825069340333,
                9010.692918061377,
                10256.214835559122,
                11812.764583986824
            ]);
        });

    });


    describe('the integer generator with multiple generators', function() {

        it('should return two integers between the given bounds', function() {
            var x = { kind: 'integer', min: 0, max: 480, seed: 'STOCHATOR' };
            var y = { kind: 'integer', min: 0, max: 360, seed: 'STOCHATOR' };
            var result1 = new Stochator(x, y).next();

            var result2 = [
                Stochator.randomInteger(0, 480, getPrng()),
                Stochator.randomInteger(0, 360, getPrng())
            ];

            assert.deepEqual(result1, [194, 146]);
            assert.deepEqual(result2, [194, 146]);
        });

    });


    describe('the integer generator with multiple generators and a mutator', function() {

        it('should return an object with x and y values between the given bounds', function() {
            var x = { kind: 'integer', min: 0, max: 480, seed: 'STOCHATOR' };
            var y = { kind: 'integer', min: 0, max: 360, seed: 'STOCHATOR' };
            var mutator = function(values) {
                return {
                    x: values[0],
                    y: values[1]
                };
            };
            var result1 = new Stochator(x, y, mutator).next();

            var result2 = mutator([
                Stochator.randomInteger(0, 480, getPrng()),
                Stochator.randomInteger(0, 360, getPrng())
            ]);

            assert.deepEqual(result1, {x: 194, y: 146});
            assert.deepEqual(result2, {x: 194, y: 146});
        });

    });

});
