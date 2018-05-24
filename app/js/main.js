var loader;
var online;
var local;
var game;
var ui;
var skillz;
var sounds;

function main()
{
	// Setupc


	// setup();

	Sugar.Array.defineInstanceWithArguments({

		window: function ( arr, [size] ) {
			var result = [];

			for( var i = 0; i < arr.length - (size-1); i++)
				result.push( arr.slice(i, i+size) );

			return result;
		},

		partition: function( arr, [filter] )
		{
			var a = [];
			var b = [];

			for( var i = 0; i < arr.length; i++)
				( filter(arr[i]) ? a : b ).push(arr[i]);

			return [a,b];
		},

		zipObject: function( keys, [values])
		{
			return keys.reduce( (acc, cur, i) => { acc[cur] = values[i]; return acc }, {} );
		},

		tap: function( arr, [callback] )
		{
			arr.forEach( callback );
			return arr;
		}
	});


	Sugar.extend();

	bootstrap();

}


function bootstrap()
{

	let w = new Exercise( {name: "Curls"} );

	console.log( w );


}


function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
	.toString(16)
	.substring(1);
}

function guid() {

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}


function func( f )
{
	return typeof f === "function" ? f() : f;
}
