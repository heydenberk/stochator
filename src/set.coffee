class Set
    constructor: (@values) ->
        @length = @values.length

    toString: ->
        "[object Set]"

    copy: ->
        @values[0...@length]

    enumerate: (depth = @length) ->
        enumerationsLength = Math.pow(@length, depth)
        enumerations = []
        for enumeration in [0...enumerationsLength]
            e = enumeration
            digits = []
            for i in [0...depth]
                d = e % @length
                e -= d
                e /= @length
                digits.push(@values[d])
            enumerations.push(new Set(digits))

        new Set(enumerations)

    intersection: (set) ->
        new Set(value for value in set.values when value in @values)

    union: (set) ->
        new Set(@values.concat(@difference(set).values))

    difference: (set) ->
        new Set(value for value in set.values when not (value in @values))

    symmetricDifference: (set) ->
        @union(set).difference(@intersection(set))

    reduce: (iterator) ->
        @values.reduce(iterator)

    reverse: ->
        new Set(@copy().reverse())

    sort: (compare) ->
        @copy().sort(compare)

    sum: ->
        @_sum ?= @reduce((a, b) -> a + b)

    mean: ->
        @_mean ?= @sum() / @length
  
    stdev: ->
        @_stdev ?= Math.sqrt(new Set(Math.pow(value - @mean(), 2) for value in @values).mean())
    
    get: (index, dflt) ->
        if @values[index]? then @values[index] else dflt

    each: (iterator) ->
        iterator(value, index) for value, index in @values

    map: (iterator) ->
        new Set(iterator(value, index) for value, index in @values)

    pop: (index = @length - 1) ->
        value = @values[index]
        @values.splice(index, 1)
        value
