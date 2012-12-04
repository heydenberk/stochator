
class Nucleotide
	constructor: (@value) ->

	complement: ->
		switch @value
			when "A" then "T"
			when "T" then "A"
			when "C" then "G"
			when "G" then "C"

class NucleotideWord extends Set
	complement: ->
		@map((nucleotide) -> nucleotide.complement())
		
	map: (iterator) ->
		new NucleotideWord(iterator(value, index) for value, index in @values)

class NucleotideDictionary extends Set
	constructor: (@length) ->
		@values = @enumerate(length).values

	values: (new Nucleotide(l) for l in ["A", "C", "G", "T"])

	enumerate: (depth) ->
