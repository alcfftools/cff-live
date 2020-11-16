var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var powerSpeed = require('./static/power_v_speed')
//import { CalculateVelocity } from './static/power_v_speed.js';

var app = express();
var server = http.Server(app);
var io = socketIO(server);
var race_idx = 0;

var GAME_PAUSED = true;
var RACE_FINISHED = false;

var STATE = 0; // 0-LOBBY, 1-GANE, 2-END
const INITIAL_TURN_TIME = 120*1000;
NUM_SECTORS = 5

REFRESH_RATE = 60; //The game refreshes 60 times per second

riderNames = [
    "Eddy Merckx",	
	"Bernard Hinault",	
	"Fausto Coppi",	
	"Jacques Anquetil",	
	"Gino Bartali",	
	"Sean Kelly",	
	"Francesco Moser",	
	"Roger De Vlaeminck",	
    "Rik Van Looy",	
	"Felice Gimondi",	
	"Miguel Indurain",	
	"Alfredo Binda",	
	"Alejandro Valverde",
	"Costante Girardengo",	
	"Laurent Jalabert",	
	"Freddy Maertens",	
	"Tony Rominger",	
    "Louison Bobet",	
	"Ferdi Kübler",	
	"Giuseppe Saronni",	
	"Alberto Contador",	
	"Joop Zoetemelk",	
	"Erik Zabel",	
	"Tom Boonen",	
	"Fabian Cancellara",	
	"Raymond Poulidor",	
	"Rik Van Steenbergen",	
	"Fiorenzo Magni",	
	"Johan Museeuw",	
	"Gianni Bugno",	
	"Paolo Bettini",	
	"Vincenzo Nibali",	
	"Jan Raas",
	"Herman Van Springel",	
	"Learco Guerra",	
	"Greg LeMond",	
	"Henri Pelissier",	
	"Joaquim Rodríguez",	
	"Laurent Fignon",	
	"Briek Schotte",	
	"Moreno Argentin",	
	"Franco Bitossi",	
	"Nicolas Frantz",	
	"Jan Janssen",	
	"Stephen Roche",	
	"Philippe Gilbert",	
	"Jan Ullrich",	
    "Mario Cipollini",
	"Walter Godefroot",
	"Luis Ocaña"
]

MAX_PLAYERS = riderNames.length;
const PORT = process.env.PORT || 22000;

game = {
    'race': {
        'state': STATE,
        'sector': 0,
        'remain_t': INITIAL_TURN_TIME,
        'used_t': 0
    },
    'players' : {}
};

app.set('port', PORT);
app.use('/static', express.static(__dirname + '/static'));

// Routing
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'index.html'));
  });

  // Starts the server.
server.listen(PORT, function() {
    console.log('Starting server on port ' + PORT);
  });

// Add the WebSocket handlers


randomNum = function(min,max){
    let random = Math.random() * (max - min) + min;
    return random;
}

randomColor = function (){
    colors = ['red', 'yellow', 'blue', 'green', 'violet', 'orange', 'pink', 'brown', 'gray'];
    ran = Math.floor(Math.random() * colors.length);
    return colors[ran];
}

var players = game.players;
idx = 0;
io.on('connection', function(socket) {
  socket.on('new player', function() {
    if(idx < MAX_PLAYERS){
        players[socket.id] = {
            name: riderNames [idx],
            aero: 100,
            anaero: 100
        };
        if(idx==0){
            players[socket.id]['master'] = true;
        }else {
            players[socket.id]['master'] = false;
        }
        idx +=1;
    }
    io.sockets.emit('new player', players);
  });
  socket.on('disconnect', () => {
    if(players[socket.id]){
        if(players[socket.id].master == true){
        //Reassign master
            let playerIDs = Object.keys(players);
            let master_idx = playerIDs.findIndex(el => el == socket.id);
            if(playerIDs.length <= 1){
                idx=0;
            }else{
                let new_master = playerIDs[master_idx+1];
                players[new_master].master = true;
            }
        }
        delete players[socket.id];
        io.sockets.emit('disconnect','');
    }
  });
  socket.on('game_start', function(data) {
      GAME_PAUSED = !data;
      STATE = 1;
  });
});

setInterval(function() {
    if(STATE == 1){
        refreshGameTimer();
        refreshPlayerValues(player);
        if(checkEndSector()){
            refreshPlayerValues();
            game.race.sector++;
        }
        if(checkEndRace()){
            RACE_FINISHED = true;
            STATE = 2;
            game.race.STATE = 2;
        }
    }
    io.sockets.emit('state', game);
    
  }, 1000 / REFRESH_RATE);

  refreshPlayerValues = function(player){

  }
  refreshGameTimer = function(){
    game.race.used_t += 1000/REFRESH_RATE;
    game.race.remain_t -= 1000/REFRESH_RATE;
  }
  checkEndSector = function(){
    if(game.race.remain_t <= 0 ){
        
    }
  }
  checkEndRace = function(){
    if(game.sector >= NUM_SECTORS){
        return true;
    }
  }

//TODO:
//Create separate scripts and classes:
//Game.js
//Player.js
//Group.js
//Cyclist.js
//Stage.js
//Input.js
//Util.js

//TODO: Might be a better idea to think about something like this 
// var lastUpdateTime = (new Date()).getTime();
// setInterval(function() {
//   // code ...
//   var currentTime = (new Date()).getTime();
//   var timeDifference = currentTime - lastUpdateTime;
//   player.x += 5 * timeDifference;
//   lastUpdateTime = currentTime;
// }, 1000 / 60);