var checkpointer = (function(loader) {
	var watchPropOnce = function(obj, prop, callback, valueChecker) {    	
		var value = undefined;
		var CALLBACKS_QUEUE = "__dsaghyda765asfda5";
		var propDecription;
		var extend = function() {		
			var k, v, l1;
			var obj1 = arguments[0];
			for (l1 = 1; l1 < arguments.length; l1++) {
				for (k in arguments[l1]) {
					obj1[k] = arguments[l1][k];
				}
			}
			return obj1;
		}	
		valueChecker = valueChecker || function(val) { /* console.log(obj,prop, val); */ return typeof(val) != 'undefined'; };
		
		callback = callback || function() {};
		if (valueChecker(obj[prop])) {
			callback();
			return;
		}
		if (!Object.defineProperty) {
			// throw 'Object.defineProperty is not defined';
			console.log('Object.defineProperty is not defined');
			return;
		}
		if (!!obj[prop + CALLBACKS_QUEUE]) {
			obj[prop + CALLBACKS_QUEUE].push(callback);
			return;
		}
		
		value = obj[prop];		
		propDecription = Object.getOwnPropertyDescriptor(obj, prop) || {};
		delete(propDecription['value']);	
		/* jesli wlasciwosc nie jest writable to i tak nigdy sie nie zmieni, dodatkowo:
		   https://bugzilla.mozilla.org/show_bug.cgi?id=647484
		   wiec przy przywracaniu wlasciowsci(defineProperty w setterze) ustawiamy writable na true
		*/
		delete(propDecription['writable']);	
		Object.defineProperty(obj, prop, extend({ 
				configurable: true, 
				enumerable: true	
			},
			propDecription, 
			{                
				'set': function(val){                    				
					var callbacksQueue;
					value = val;
					if (valueChecker(val)) {				
						callbacksQueue = obj[prop + CALLBACKS_QUEUE];
						delete(obj[prop]);
						delete(obj[prop + CALLBACKS_QUEUE]);
						Object.defineProperty(obj, prop, extend({configurable: true, enumerable: true }, propDecription, {writable: true}));
						obj[prop] = value;
						callbacksQueue.forEach(function(callback) {
							callback();
						});				
					}
					// delete(callbacksQueue);
					
				},
				'get' : function() {
					return value;
				}
			})
		);			
		Object.defineProperty(obj, prop + CALLBACKS_QUEUE, { 
			configurable: true, 
			enumerable: false, 			
			writable: false,
			value: []
		});
		obj[prop + CALLBACKS_QUEUE].push(callback);	
		// console.log('Added queue: ', prop + CALLBACKS_QUEUE, obj[prop + CALLBACKS_QUEUE])
	}

	var onceLoaded  = function(required, callback, callbackThis) {
		var name;		
		var callbacks;
		var required = required || [];		
		var counter = required.length;				
		var checkCounter = function() {
			var requiredModules = [];
			if (counter == 0) {
				requiredModules = required.map(function(name) {
					if (typeof(name) == 'string') {/*named module*/
						return loader.modules[name].module;
					} else if (typeof(name) == 'function') { /*condition check*/
						return undefined;
					} else {/*property watcher*/
						return name[0][name[1]];
					}
				});
				return callback.apply(callbackThis, requiredModules);
			}
		}
		
		callbackThis = callbackThis || this;
		//name = options.name || 'tmp' + (this.__uniqId++);		
		
		required.forEach(function(moduleName) {
			if (typeof(moduleName)  == 'string') {
				loader.watchModuleOnce(moduleName, function() {					
					counter--;
					checkCounter();
				})
			} else if (typeof(moduleName) == 'function') { 
				loader.watchConditionOnce(moduleName, function() {
					counter--;
					checkCounter();
				});
			} else {
				watchPropOnce(moduleName[0], moduleName[1], function() {
					counter--;
					checkCounter();
				}, moduleName[2])
			}
		});
		if (required.length == 0) {
			return callback.apply(callbackThis);
		}
	}
	
	loader = onceLoaded;	
	loader.modules = {};
	loader.__uniqId = 0;
	loader.clock = {};
	loader.clock.callbacks = [];
	loader.clock.addConditionCheck = function(condition, callback) {
		var checkConditions = (function() {			
			this.callbacks.forEach(function(el, k) {
				var condition = el[0], callback = el[1];
				if (condition()) {
					this.callbacks.splice(k, 1);
					if (typeof(callback) == 'function') { 
						callback();
					}					
				}			
			}, this);			
			if (this.callbacks.length > 0) {
				setTimeout(checkConditions.bind(this), 50);
			}
		}).bind(this);
		this.callbacks.push([condition, callback]);
		setTimeout(checkConditions.bind(this), 50);
	}
	loader.watchPropOnce = watchPropOnce;
	loader.onceLoaded = onceLoaded;
	loader.setModuleOnce = function(name, required, module/* object or function returning object */, options) {
		var callbacks;
		var required = required || [];		
		var counter = required.length;		
		var setModule = function(requiredModules) {
			var callbacks = loader.modules[name].callbacksQueue || [];		
			loader.modules[name] = {
				'loaded' : true,
				'module' : typeof(module) == 'function' ? module.apply(this, requiredModules) : module
			};
			callbacks.forEach(function(callback) {
				callback.apply(this, [loader.modules[name].module]);
			});
		}
		var checkCounter = function() {
			var requiredModules = [];			
			if (counter == 0) {
				requiredModules = required.map(function(name) {
					if (typeof(name) == 'string') {
						return loader.modules[name].module;
					} else if (typeof(name) == 'function') { /*condition check*/
						return undefined;
					} else {
						return name[0][name[1]];
					}
				});
				setModule(requiredModules);
			}
		}
		
		loader.modules[name] = loader.modules[name] || {};
		callbacks = loader.modules[name].callbacksQueue || [];		
		
		// if module is not defined, check module existence and, optionally, fire callback queue
		if (!!loader.modules[name].loaded) {			
			callbacks.forEach(function(callback) {
				callback.apply(this, [loader.modules[name].module]);
			});			
			if (!!module) {
				console.log("Module(" + name + ") already set");
			}
			return;
		}
		if (!module) {			
			return;
		}
		
		required.forEach(function(moduleName) {
			if (typeof(moduleName)  == 'string') {
				loader.watchModuleOnce(moduleName, function() {					
					counter--;
					checkCounter();
				})
			} else if (typeof(moduleName) == 'function') { 
				loader.watchConditionOnce(moduleName, function() {
					counter--;
					checkCounter();
				});
			} else {
				watchPropOnce(moduleName[0], moduleName[1], function() {
					counter--;
					checkCounter();
				}, moduleName[2])
			}
		});
		if (required.length == 0) {
			setModule([]);
		}
	},
	loader.watchModuleOnce = function(name, callback /* w parametrze dostaje modul */) {	
		loader.modules[name] = loader.modules[name] || {};
		var callbackThis = this;
		if (typeof(callback) == 'function') {			
			loader.modules[name].callbacksQueue = loader.modules[name].callbacksQueue || [];
			loader.modules[name].callbacksQueue.push(callback);
		} else {
			console.log('watchModuleOnce: callback is not a function');
		}
		this.setModuleOnce(name);
	}
	loader.watchConditionOnce = function(condition, callback) {					
		if (condition()) {
			!(typeof(callback) == "function") || callback();
		} else {
			this.clock.addConditionCheck(condition, callback);
		}		
	}
	return loader;
})();
