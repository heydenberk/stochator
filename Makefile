build/stochator.js: src/set.coffee src/stochator.coffee
	@coffee -cj build/stochator.js src/set.coffee src/stochator.coffee

publish: build/stochator.js
	@cp build/stochator.js index.js
