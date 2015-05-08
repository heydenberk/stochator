var assert = require('assert');
var Stochator = require('stochator');

describe('Stochator (with seed STOCHATOR)', function() {

    describe('the floating-point number generator', function() {

        it('should return a float between 0 and 1', function() {
            var result = new Stochator({
                seed: 'STOCHATOR'
            }).next();
            assert.equal(result, 0.4045178783365678);
        });

        it('should return a float between given bounds', function() {
            var result = new Stochator({
                min: 0,
                max: Math.PI * 2,
                seed: 'STOCHATOR'
            }).next();
            assert.equal(result, 2.5416607896557823);
        });

        it('should return a number from a normal distribution', function() {
            var result = new Stochator({
                mean: 75,
                stdev: 14,
                min: 0,
                max: 100,
                seed: 'STOCHATOR'
            }).next();
            assert.equal(result, 71.61661782743502);
        });
    });

    describe('the integer generator', function() {

        it('should return an integer between given bounds when "roll" is called', function() {
            var result = new Stochator({
                kind: "integer",
                min: 1,
                max: 6,
                seed: "STOCHATOR"
            }, "roll").roll();
            assert.equal(result, 3);
        });

        it('should return an array of six integers between given bounds when "roll" is called', function() {
            var result = new Stochator({
                kind: "integer",
                min: 1,
                max: 6,
                seed: "STOCHATOR"
            }, "roll").roll(5);
            assert.deepEqual(result, [3, 6, 5, 1, 4]);
        });

    });

    describe('the set generator', function() {

        it('should return an item from a given array', function() {
            var result = new Stochator({
                kind: "set",
                values: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                seed: "STOCHATOR"
            }).next();
            assert.equal(result, 'wednesday');
        });

        it("should return 7 items from an array with replacement according to given weights", function() {
            var result = new Stochator({
                kind: "set",
                values: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                weights: [0.1, 0.1, 0.1, 0.1, 0.1, 0.25, 0.25],
                seed: 'STOCHATOR'
            }).next(7);
            assert.deepEqual(result, ['friday', 'sunday', 'sunday', 'monday', 'saturday', 'monday', 'saturday']);
        });

        it("should return 4 items from a set of 3 without replacement with a final item of undefined", function() {

            var result = new Stochator({
                kind: "set",
                values: ["floors", "windows", "dishes"],
                replacement: false,
                seed: 'STOCHATOR'
            }).next(4);
            assert.deepEqual(result, ['windows', 'dishes', 'floors', undefined]);

        });

    });

    describe('the color generator', function() {

        it("should return an object with red, green and blue values", function() {
            var result = new Stochator({
                kind: "color",
                seed: 'STOCHATOR'
            }).next();
            assert.deepEqual(result, { red: 103, green: 244, blue: 192 });
        });

    });

    describe('the lowercase string generator', function() {

        it("should return 25 lowercase characters", function() {
            var result = new Stochator({
                kind: "a-z",
                seed: 'STOCHATOR'
            }).next(25).join('');
            assert.equal(result, 'kytapcrgjzwlmbbgxaeqlyspr');
        });

    });

    describe('the integer generator with a mutator', function() {

        it("should return true or false", function() {
            var result = new Stochator({
                kind: "integer",
                min: 0,
                max: 1,
                seed: 'STOCHATOR'
            }, Boolean).next();
            assert.equal(result, false);
        });

    });

    describe('the float generator with mutator', function() {

        it("should return the cosine of a given within given bounds", function() {
            var result = new Stochator({
                min: 0,
                max: Math.PI * 2,
                seed: 'STOCHATOR'
            }, Math.cos).next();
            assert.equal(result, -0.8253740855106559);
        });

    });

    describe('the integer generator with mutator that uses previous value', function() {

        it("should return 10 integers that are all equal the previous item +/- 1", function() {
            var result = new Stochator({
                kind: "integer",
                min: -1,
                max: 1,
                seed: 'STOCHATOR'
            }, function(a, b) { return a + b; }).next(10);
            assert.deepEqual(result, [0, 1, 2, 1, 1, 0, 0, -1, -1, 0]);
        });

        it("should return 10 numbers that increase by a given fixed amount and a bounded relative change", function() {
            var addInterest = function(interestRate, principal) {
                return (principal + 1000) * interestRate;
            };
            var result = new Stochator({
                kind: "float",
                min: 1.01,
                max: 1.05,
                seed: 'STOCHATOR',
                value: 1000
            }, addInterest).next(10);
            assert.deepEqual(result, [
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
            var result = new Stochator(x, y).next();
            assert.deepEqual(result, [194, 146]);
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
            var result = new Stochator(x, y, mutator).next();
            assert.deepEqual(result, {x: 194, y: 146});
        });

    });

});
