
var cluster_store = require('strong-store-cluster');
var collectionSessionName = 'sessions';
//cluster_store.collection(collectionSessionName).configure({ expireKeys: 600 });

var sessionSorage = module.exports = function(expires){
	cluster_store.collection(collectionSessionName).configure({ expireKeys: Math.max(expires, 600) });

	this.init = function(length, alphabet, safe){
		return (safe===false ? init : initSafe)(function(){ return generate(length, alphabet); });
	};

	this.get = function(id, key){
		return (key ? getKey : getData)(id, key);
	};

	this.set = function(id, value, key, safe){
		return (key ? (safe===false ? setKey : setKeySafe) : setData)(id, value, key);
	};
};

var generate = function(_length, _alphabet){
	if(!_alphabet) _alphabet = 'abcdefghijklmnopqrstuvwxyz1234567890';
	if(!_length) _length = 32;
	return generateWithAlphabet(_length, _alphabet);
};

var generateWithAlphabet = function(_length, _alphabet){
	var result = [];
	for(var i=_length; i>0 && _alphabet.length>0; i--) result.push(_alphabet[parseInt(Math.random()*_alphabet.length)]);
	return result.length>0 ? result.join('') : undefined;
};

var init = function(_generate){
	// resolve(id) reject(error)
	var promise = new Promise(function(resolve, reject){
		if(typeof _generate!=='function') reject('id generator not valid');
		var id = _generate();
		if(!id) reject('generated id not valid');
		getData(id)
			.then(function(value){
				init(_generate)
					.then(resolve)
					.catch(reject);
			})
			.catch(function(error){
				if(error===undefined){
					setData(id, {})
						.then(function(){
							resolve(id);
						})
						.catch(reject);
				}
				else reject(error);
			});
	});
	return promise;
};

var initSafe = function(_generate){
	// resolve(id) reject(error)
	var promise = new Promise(function(resolve, reject){
		if(typeof _generate!=='function') reject('id generator not valid');
		var id = _generate();
		if(!id) reject('generated id not valid');
		cluster_store.collection(collectionSessionName).acquire(id, function(error, keylock, value){
			if(!error && keylock){
				if(value===undefined){
					keylock.set({});
					keylock.release(function(error){ error ? reject(error) : resolve(id); });
				}
				else keylock.release(function(error){ error ? reject(error) : init2(_generate).then(resolve).catch(reject); });
			}
			else if(error) reject(error);
			else reject(undefined);

		});
	});
	return promise;
};

var getData = function(_id){
	// resolve(value) reject(error)
	var promise = new Promise(function(resolve, reject){
		cluster_store.collection(collectionSessionName).get(_id, function(error, value){
			if(error) reject(error);
			else if(value===undefined) reject(undefined);
			else resolve(value);
		});
	});
	return promise;
};

var getKey = function(_id, _key){
	// resolve(value[key]) reject(error)
	var promise = new Promise(function(resolve, reject){
		getData(_id)
			.then(function(value){ (_key in value) ? resolve(value[_key]) : reject(undefined); })
			.catch(reject);
	});
	return promise;
};

var setData = function(_id, _value){
	// resolve() reject(error)
	var promise = new Promise(function(resolve, reject){
		cluster_store.collection(collectionSessionName).set(_id, _value, function(error){
			error ? reject(error) : resolve();
		});
	});
	return promise;
};

var setKey = function(_id, _value, _key){
	var keyValue = {};
	keyValue[_key] = _value;
	// resolve() reject(error)
	var promise = new Promise(function(resolve, reject){
		getData(_id)
			.then(function(value){
				setData(_id, Object.assign({}, value, keyValue)).then(resolve).catch(reject);
			})
			.catch(function(error){
				(error===undefined) ? setData(_id, keyValue).then(resolve).catch(reject) : reject(error);
			});
	});
	return promise;
};

var setKeySafe = function(_id, _value, _key){
	var keyValue = {};
	keyValue[_key] = _value;
	// resolve() reject(error)
	var promise = new Promise(function(resolve, reject){
		cluster_store.collection(collectionSessionName).acquire(_id, function(error, keylock, value){
			if(!error && keylock){
				keylock.set(Object.assign({}, value, keyValue));
				keylock.release(function(error){ error ? reject(error) : resolve(); });
			}
			else if(error) reject(error);
			else reject(undefined);
		});
	});
	return promise;
};
