}).call(moduleScope);

if (typeof exports !== 'undefined') {
	module.exports = moduleScope.Module;
} else {
	root.enetModule = moduleScope.Module;
}

}).call(this);
