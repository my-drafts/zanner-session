
var sessionStore = require('../');

var s = new sessionStore();

var errorHandler = function(error){
	console.log('error: %j', error);
};

s.init()
	.then(function(id){
		console.log('id: %j', id);
		s.init()
			.then(function(id){
				console.log('id: %j', id);
			})
			.catch(function(error){
				console.log('error: %j', error);
			});
	})
	.catch(function(error){
		console.log('error: %j', error);
	});


/*
s.init()
	.then(function(id){
		console.log('new id: %s', id);
		s.get(id)
			.then(function(value){
				console.log('get value: %j', value);

				setTimeout(function(){
					s.get(id)
						.then(function(value){
							console.log('get value5: %j', value);
						})
						.catch(errorHandler);
				}, 5000);

				s.set(id, 'value1', 'key1', 1)
					.then(function(){
						console.log('set value');
					})
					.catch(function(error){
						console.log('set value error: %j', error);
					});

			})
			.catch(errorHandler);
	})
	.catch(errorHandler);
*/