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

CANVAS_HEIGHT = 400;
CANVAS_WIDTH = 1200;

MIN_POWER = 0;
MAX_POWER = 1600;

INITIAL_AERO = 10000;
INITIAL_ANAERO = 10000;

STAGE_DISTANCE = 50; //Stage is 190 km
PIXEL_SIZE = 1*STAGE_DISTANCE/1200; //Canvas has 1200 px, so 1 pixel is that size;
REFRESH_RATE = 60; //The game refreshes 60 times per second
TIME_MULTIPLIER = 25; //Time goes 25x faster than in real life

POWER_RANGE_1 = 0 //from 0-230 recovering aero (+) and anaero (+++) at full pace
POWER_RANGE_2 = 230 //from 230-350 no expenditure, recovery of anaerobic (++)
POWER_RANGE_3 = 350 //350-430 expenditure of aerobic (-)
POWER_RANGE_4 = 430 //430-500 expenditure of aerobic (--) and anaerobic (--)
POWER_RANGE_5 = 500 //500+ expenditure of aerobic (-) and anaerobic (---)

var ramp = 0;

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

var race = {
    'km_total' : STAGE_DISTANCE,
    'race_time' : 0,
    'classification': [],
};

MAX_PLAYERS = riderNames.length;

app.set('port', 8000);
app.use('/static', express.static(__dirname + '/static'));

// Routing
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'index.html'));
  });

  // Starts the server.
server.listen(8000, function() {
    console.log('Starting server on port 8000');
  });

  // Add the WebSocket handlers
// io.on('connection', function(socket) {
// });

// setInterval(function() {
//     io.sockets.emit('message', 'hi!');
//   }, 1000);

randomNum = function(min,max){
    let random = Math.random() * (max - min) + min;
    return random;
}

randomColor = function (){
    colors = ['red', 'yellow', 'blue', 'green', 'violet', 'orange', 'pink', 'brown', 'gray'];
    ran = Math.floor(Math.random() * colors.length);
    return colors[ran];
}

var players = {};
idx = 0;
io.on('connection', function(socket) {
  socket.on('new player', function() {
    if(idx < MAX_PLAYERS){
        players[socket.id] = {
            name: riderNames [idx],
            weight: randomNum(50,90),
            color: randomColor(),
            stage_pos : 0,
            x: 600 - randomNum(5,50),
            y: randomNum(100,300),
            power: 0,
            avg_power: 0,
            speed: 0,
            avg_speed: 0,
            ramp: 0,
            aero: INITIAL_AERO,
            anaero: INITIAL_ANAERO
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
    delete players[socket.id];
  });
  socket.on('game_start', function(data) {
      GAME_PAUSED = !data;
  });
  socket.on('movement', function(data) {
    var player = players[socket.id] || {};
    if (data.left) {
      player.y -= 5;
      if(player.y <= 0){
          player.y = 0;
      }
    }
    if (data.up) {
      player.power += 5;
      if(player.power >= MAX_POWER){
          player.power = MAX_POWER;
      }
    }
    if (data.right) {
      player.y += 5;
      if(player.y >= CANVAS_HEIGHT){
        player.y = CANVAS_HEIGHT;
    }
    }
    if (data.down) {
      player.power -= 5;
      if(player.power <= MIN_POWER){
        player.power = MIN_POWER;
      }
    }
    player.avg_power = (player.power + player.avg_power*race_idx)/(race_idx+1);
  });
});

refreshPlayerValues = function(player){
    params = {
        "units": "metric",
        "rp_wr": 74.843, //rider weight (kg)
        "rp_wb": 7.711,  //bike weight (kg)
        "rp_a": 0.509, //frontal area (m2)
        "rp_cd": 0.63, //drag coefficient
        "rp_dtl": 2, //drivetrain loss (%)
        "ep_crr": 0.005, //coeff of rolling resistance
        "ep_rho": 1.22601, //air density (kg/m3)
        "ep_headwind": 0, //speed of headwind (km/h)
        "ep_g": 0, //grade of the slope (%)
        "p2v": 200, // power
        "v2p": 35.41 // goal speed
    }


//TODO: This is a simplification. Apply this based on the cyclist profile
//TODO: Move x coordinate accordingly to cyclist power + weight == speed.
//to be determined using some "physics" 

//PWR1 from 0-230 recovering aero (+) and anaero (+++) at full pace
//PWR2 from 230-350 no expenditure, recovery of anaerobic (++)
//PWR3 350-430 expenditure of aerobic (-)
//PWR4 430-500 expenditure of aerobic (--) and anaerobic (--)
//PWR5 500+ expenditure of aerobic (-) and anaerobic (---)
    var player = players[player];
    const x = player.power;
    ANAEROBIC_RECOVERY_REDUCER = REFRESH_RATE;
    AEROBIC_RECOVERY_REDUCER = 30*REFRESH_RATE;
    ANAEROBIC_EXPENDITURE_REDUCER = REFRESH_RATE;
    AEROBIC_EXPENDITURE_REDUCER = 30*REFRESH_RATE;
    switch (true) {
        case (x>= POWER_RANGE_1 && x < POWER_RANGE_2):
            //console.log("Player: " + player.name + ", recovery rythm.");
            player.anaero += 3*(POWER_RANGE_3-x)/ANAEROBIC_RECOVERY_REDUCER;
            player.aero += (POWER_RANGE_2-x)/AEROBIC_RECOVERY_REDUCER;
            break;
        case (x>= POWER_RANGE_2 && x < POWER_RANGE_3):
            //console.log("Player: " + player.name + ", aerobic rythm.");
            player.anaero += 2*(POWER_RANGE_3-x)/ANAEROBIC_RECOVERY_REDUCER;
            player.aero -= (x-POWER_RANGE_2)/AEROBIC_EXPENDITURE_REDUCER;
            break;
        case (x>= POWER_RANGE_3 && x < POWER_RANGE_4):
            //console.log("Player: " + player.name + ", ftp rythm.");
            //player.anaero -= (x- POWER_RANGE_3)/ANAEROBIC_EXPENDITURE_REDUCER;
            player.aero -= 2*(x-POWER_RANGE_2)/AEROBIC_EXPENDITURE_REDUCER;
            break;
        case (x>= POWER_RANGE_4 && x < POWER_RANGE_5):
            //console.log("Player: " + player.name + ", vo2max rythm.");
            player.anaero -= (x- POWER_RANGE_3)/ANAEROBIC_EXPENDITURE_REDUCER;
            player.aero -= 2*(x-POWER_RANGE_2)/AEROBIC_EXPENDITURE_REDUCER;
            break;
        case (x>= POWER_RANGE_5 ):
            //console.log("Player: " + player.name + ", fullgas rythm.");
            player.anaero -= 4*(x- POWER_RANGE_3)/ANAEROBIC_EXPENDITURE_REDUCER;
            player.aero -= 2*(x-POWER_RANGE_2)/AEROBIC_EXPENDITURE_REDUCER;
            break;            
        default:    
            console.log("Error with power output of player " + player.name);
            break;
    }
    if(player.aero < 0) {
        player.aero = 0;
    }
    if(player.aero > INITIAL_AERO) {
        player.aero = INITIAL_AERO;
    }
    if(player.anaero < 0) {
        player.anaero = 0;
    }
    if(player.anaero > INITIAL_ANAERO) {
        player.anaero = INITIAL_ANAERO;
    }

    params["rp_wr"] = player.weight;
    params["ep_g"] = ramp;
    speed = powerSpeed.CalculateVelocity(player.power, params);
    player.avg_speed = (player.speed + player.avg_speed*race_idx)/(race_idx+1); 
    player.speed = speed; 
    player.ramp = params["ep_g"];
    distance_covered = TIME_MULTIPLIER * (player.speed/3600) / REFRESH_RATE;
    player.stage_pos +=  distance_covered; //in km

    //FIXME: This is adding up for every rider!!! Wrong
    race.race_time += TIME_MULTIPLIER * 1000 / REFRESH_RATE;

    if(player.stage_pos >= STAGE_DISTANCE){
        player.stage_pos = STAGE_DISTANCE;
        player.finished = true;
        player.race_time = race.race_time;
        race.classification.push(player);
    }
}


//params
// {
//     "units": "metric",
//     "rp_wr": 74.843, //rider weight (kg)
//     "rp_wb": 7.711,  //bike weight (kg)
//     "rp_a": 0.509, //frontal area (m2)
//     "rp_cd": 0.63, //drag coefficient
//     "rp_dtl": 2, //drivetrain loss (%)
//     "ep_crr": 0.005, //coeff of rolling resistance
//     "ep_rho": 1.22601, //air density (kg/m3)
//     "ep_headwind": 0, //speed of headwind (km/h)
//     "ep_g": 0, //grade of the slope (%)
//     "p2v": 200, // power
//     "v2p": 35.41 // goal speed
// }
//function CalculateVelocity(power, params) {


setInterval(function() {
    game = {
        'race': race,
        'groups' : {},
        'players' : players
    };
    if(!GAME_PAUSED && !RACE_FINISHED){
        players_finished = 0;
        for (player in players){
            if (!players[player].finished){
                refreshPlayerValues(player);
            }else{
                players_finished++;
            }
        }
        if(players_finished == Object.keys(players).length){
            RACE_FINISHED = true;
            game.race.finished = true;
        }
        race_idx += 1;
        if(race_idx % (60*60) == 0){
            console.log(players);
        }
    }
    io.sockets.emit('state', game);
    
  }, 1000 / REFRESH_RATE);


//TODO: Remove by really reading race profile at the begining
setInterval(function() {
    ramp = randomNum(-3,8);
}, 5000);


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