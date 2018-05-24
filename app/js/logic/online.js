function Online( game )
{
    Bus.apply(this, arguments);
    this.game = game;
    this.loginStream = new Rx.Subject();
    this.createListeners();
    this.initFirebase();
}

createjs.extend( Online, Dispatcher )
createjs.extend( Online, Bus )


Online.prototype.routeGame = function( game )
{
    this.route( game, "requestNewRound", this.requestNewRound );

    this.route( game, "moveCardToDeck", this.pushAction,
        (card, deck) => [{action: "moveCardToDeck", card: card.id, deck: deck.name}],
        data => [ game.getCardById( data.card ),  game.getDeckByName( data.deck ) ]
     );

    this.route( game, "knock", this.pushAction,
        player => [{action: "knock", player: player.uid}],
        data => [ game.getPlayerByUid( data.player )]
    );

    this.route( game, "deal", this.pushAction,
        shuffle => [{action: "deal", shuffle: shuffle}],
        data => [data.shuffle]
    );

    this.route( game, "forfeitTurn", this.pushAction,
        shuffle => [{action: "forfeitTurn"}],
        data => []
    );

}

Online.prototype.enable = function()
{
    // console.log( "ONLINE ENABLE" );
    this.routeGame( this.game );
    this.checkMatchStatus();
}

Online.prototype.disable = function()
{
    // console.log( "ONLINE DISABLE" );

    this.unrouteAll();

    this.currentActionRef.off( "child_added", this.listeners.action );
    this.rounds.off( "child_added", this.listeners.round );

    this.game.cleanup();
}




Online.prototype.pushAction = function( data )
{
    this.currentActionRef.push( data );
}

Online.prototype.processAction = function( snapshot )
{
    var action = snapshot.val();
    this.fulfill( action.action, action );
}

Online.prototype.createListeners = function()
{
    this.listeners = {};
    this.listeners.auth = this.onAuthStateChanged.bind(this);
    this.listeners.action = this.processAction.bind(this);
    this.listeners.round = this.newRound.bind(this);
}

Online.prototype.initFirebase = function()
{
	// Shortcuts to Firebase SDK features.
	this.auth = firebase.auth();
	this.database = firebase.database();
	this.storage = firebase.storage();

	// References
	this.matchesRef = null;
    this.statesRef = null;

	this.currentMatchRef = null;
	this.currentConnectionRef = null;

    this.auth.onAuthStateChanged( this.listeners.auth );
};

Online.prototype.onAuthStateChanged = function( user )
{
    if (user) // User is signed in!
        console.log("logged in as:", user.uid);
	else // User is signed out!
		this.signIn();
}

Online.prototype.signIn = function()
{
	return this.auth.signInAnonymously();
}


Online.prototype.checkMatchStatus = function()
{
    if( !this.checkSignedIn() )
		return this.signIn().then( this.createSession.bind(this) );

    this.matches = this.database.ref("matches");

    var query = this.matches
 	 	 .orderByChild("player_2")
         .equalTo( null )
         .limitToLast(1);

    return query.once("value")
        .then( results => results.val() || null  )
        .then( this.validateMatch.bind(this) )
        .then( () => console.log( "READY TO START PLAYING" ) )
        .then( () => {
            if( this.isHost() )
                this.requestNewRound();
        });
}

Online.prototype.isHost = function()
{
    return this.currentMatchInfo.player_1 == this.auth.currentUser.uid;
}

Online.prototype.requestNewRound = function( data )
{
    this.rounds.push({ round: "new" });
}

Online.prototype.validateMatch = function( match )
{
    if( match == null )
        return this.createMatch();
    else {
        var key = Object.keys( match ).first();
        var matchInfo = match[key];
        console.log( match );
        if( matchInfo.player_1 == this.auth.currentUser.uid )
            return this.reconnectToMatch( key );
        else
            return this.joinExistingMatch( key );

    }
}


Online.prototype.newRound = function( round )
{
    this.currentActionRef = this.database.ref( "actions/" + this.currentMatchRef.key + "/" + round.key );
    this.currentActionRef.on( "child_added", this.listeners.action );

    if( !this.isHost() )
        return;

    this.fulfill( "requestNewRound" );
}

Online.prototype.waitForOpponent = function( key )
{
    this.rounds = this.database.ref("rounds/" + key);
    this.rounds.on( "child_added", this.listeners.round );

    return new Promise( function(resolve, reject)
	{
        var listenForPartner = function(snapshot)
        {
            var value = snapshot.val();

    		if( value && value.player_2 )
    		{
    			this.currentMatchRef.off("value", listenForPartner);
    			//pull out
    			this.currentMatchInfo = value;

                this.game.updatePlayers( [
                    {
                        displayName: Player.getNameFromUid( value.player_1 ) ,
                        id: value.player_1,
                        isCurrentPlayer: value.player_1 == this.auth.currentUser.uid
                    },

                    {
                        displayName:  Player.getNameFromUid( value.player_2 ),
                        id: value.player_2,
                        isCurrentPlayer: value.player_2 == this.auth.currentUser.uid
                    }
                ], this.auth.currentUser.uid );

                resolve();
    		}
        }.bind(this);

		this.currentMatchRef.on("value", listenForPartner);

	}.bind(this) );
}

Online.prototype.joinExistingMatch = function( key )
{
    console.log( "join match" );

    this.currentMatchRef = this.database.ref("matches/" + key);
    this.currentMatchRef.update( {player_2: this.auth.currentUser.uid } );

    return this.waitForOpponent( key );
};



Online.prototype.createMatch = function()
{
    console.log( "create" );

    this.currentMatchRef = this.matches.push({
		player_1: this.auth.currentUser.uid
	});

    return this.waitForOpponent( this.currentMatchRef.key );
};


Online.prototype.reconnectToMatch = function( key )
{
    console.log( "reconnect" );
    this.currentMatchRef = this.database.ref("matches/" + key);

    return this.waitForOpponent( this.currentMatchRef.key );
};


Online.prototype.getLoggedInPlayer = function()
{
	if( !this.checkSignedIn() )
		return null;

	return this.game.players
		.filter( player => player.uid == this.auth.currentUser.uid )
		.first();
}

Online.prototype.checkSignedIn = function() {
	return this.auth.currentUser != null;
}
