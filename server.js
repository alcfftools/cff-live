var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var powerSpeed = require('./static/power_v_speed')
var fs = require('fs');
//import { CalculateVelocity } from './static/power_v_speed.js';

var app = express();
var server = http.Server(app);
var io = socketIO(server);
var race_idx = 0;

REFRESH_RATE = 60; //The game refreshes 60 times per second

var STATE = 0; // 0-LOBBY, 1-GANE, 2-END

const INITIAL_TURN_TIME = 60*1000; //ca. 60 SECS per turn
NUM_SECTORS = 10

INITIAL_AERO = 100;
INITIAL_ANAERO = 100;

POWER_RANGE_1 = 0 //from 0-60% recovering aero (+) and anaero (+++) at full pace
POWER_RANGE_2 = 60 //from 60-70 no expenditure, recovery of anaerobic (++)
POWER_RANGE_3 = 70 //70-80 expenditure of aerobic (-)
POWER_RANGE_4 = 80 //80-90 expenditure of aerobic (--) and anaerobic (--)
POWER_RANGE_5 = 90 //90+ expenditure of aerobic (-) and anaerobic (---)

AEROBIC_RECOVERY_BASE = 5;
ANAEROBIC_RECOVERY_BASE = 2*AEROBIC_RECOVERY_BASE;
AEROBIC_EXPENDITURE_BASE = 15;
ANAEROBIC_EXPENDITURE_BASE = 1.5*AEROBIC_EXPENDITURE_BASE;

var riders = JSON.parse(fs.readFileSync('static/riders.json', 'utf8'));

MAX_PLAYERS = riders.length;
const PORT = process.env.PORT || 22000;

game = {
    'race': {
        'state': STATE,
        'sector': 1,
        'remain_t': INITIAL_TURN_TIME,
        'used_t': 0, 
        'classification': {}
    },
    'players' : {}
};

let race_sector_splitters = [0.10, 0.05, 0.25, 0.3, 0.2, 0.2, 0.05, 0.2, 0.1, 0.2];
//let race_sector_splitters = [0.20, 0.20, 0.20, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2];

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
        players[socket.id] = initPlayer(riders[idx]);
        if(idx==0){
            players[socket.id].master = true;
        }else {
            players[socket.id].master = false;
        }
        idx +=1;
    }
    io.sockets.emit('new player', players);
  });
  // New player

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
  // Disconnect player

  socket.on('game_start', function(data) {
      STATE = 1;
      let startIndex = Object.keys(players).length;
      let nrBots = riders.length - startIndex;
      
      for(let i = 0; i< nrBots;i++){
          let botPlayer = initPlayer(riders[startIndex + i])
          botPlayer.bot = true;
          players["bot_"+i] = botPlayer;
      }
  });
  socket.on('game_reset', function(data) {
      if(STATE == 2){
        STATE = 0;
        resetGame();
      }
});
  // Game start

  socket.on('strategy', function(data) {
    var player = players[socket.id] || {};
    player.strategy = data;
  });
});

setInterval(function() {
    if(STATE == 1){
        refreshGameTimer();
        
        if(checkEndSector()){
            forceBotsDecision();
            for (player in game.players){
                refreshPlayerValues(player);
                game.players[player].value = calculatePlayerValueForSector(game.race.sector, game.players[player])
                game.players[player].tot_value += game.players[player].value;
            }
            let orderedPlayers = orderPlayersByValue();
            groups = makeGroups(orderedPlayers, race_sector_splitters[game.race.sector - 1]);
            game.race.classification[game.race.sector] = groups;
            game.race.sector++;
            game.race.remain_t = INITIAL_TURN_TIME;
        }
        if(checkEndRace()){
            RACE_FINISHED = true;
            STATE = 2;
            game.race.state = 2;
        }
    }
    io.sockets.emit('state', game);
  }, 1000 / REFRESH_RATE);

  refreshPlayerValues = function(playerid){
    console.log(players[playerid]);
    let player = players[playerid];
    let x = player.strategy;
    x = x !== undefined ? x : 0;
    switch (true) {
        case (x>= POWER_RANGE_1 && x < POWER_RANGE_2):
            //console.log("Player: " + player.name + ", recovery rythm.");
            player.anaero += 3*(ANAEROBIC_RECOVERY_BASE);
            player.aero += AEROBIC_RECOVERY_BASE;
            break;
        case (x>= POWER_RANGE_2 && x < POWER_RANGE_3):
            //console.log("Player: " + player.name + ", aerobic rythm.");
            player.anaero += 2*(ANAEROBIC_RECOVERY_BASE);
            player.aero -= AEROBIC_EXPENDITURE_BASE;
            break;
        case (x>= POWER_RANGE_3 && x < POWER_RANGE_4):
            //console.log("Player: " + player.name + ", ftp rythm.");
            //player.anaero -= (x- POWER_RANGE_3)/ANAEROBIC_EXPENDITURE_REDUCER;
            player.aero -= 2*AEROBIC_EXPENDITURE_BASE;
            break;
        case (x>= POWER_RANGE_4 && x < POWER_RANGE_5):
            //console.log("Player: " + player.name + ", vo2max rythm.");
            player.anaero -= ANAEROBIC_EXPENDITURE_BASE;
            player.aero -= 2*AEROBIC_EXPENDITURE_BASE;
            break;
        case (x>= POWER_RANGE_5 ):
            //console.log("Player: " + player.name + ", fullgas rythm.");
            player.anaero -= 4*ANAEROBIC_EXPENDITURE_BASE;
            player.aero -= 2*AEROBIC_EXPENDITURE_BASE;
            break;            
        default:    
            console.log("Error with power output of player " + player.name);
            break;
    }
    if(player.aero < 0) {
        player.aero = 0;
        player.max_aero = player.max_aero/2;
    }
    if(player.aero > player.max_aero) {
        player.aero = player.max_aero;
    }
    if(player.anaero < 0) {
        player.anaero = 0;
        player.max_anaero = player.max_anaero*0.8;
    }
    if(player.anaero > player.max_anaero) {
        player.anaero = player.max_anaero;
    }
  }

  forceBotsDecision = function(player){
      // TODO: Choose wisely the strategy of the bots
      playerArray = Object.entries(players);
      playerArray.map(el => players[el[0]].strategy = randomNum(55,93));
  }

  calculatePlayerValueForSector = function(sector, player){
      //TODO: Based on the sector, and player data, get the value 
        return randomNum(60,90);
    }

  orderPlayersByValue = function(){
    // TODO: Order array of players by value
    playerArray = Object.entries(players);
    let orderedPlayerArray = playerArray.sort((a,b) => {
        return (a[1].tot_value < b[1].tot_value) ? 1 : -1;
    });
    return orderedPlayerArray;
  }
  makeGroups = function(orderedPlayerArray, split_grade){
      //TODO: group players of the sorted array
      let max = orderedPlayerArray[0][1].value;
      let tot_max = orderedPlayerArray[0][1].tot_value;
      let min = orderedPlayerArray[orderedPlayerArray.length-1][1].value
      let margin_val = max*split_grade;
      let group_cut = tot_max - margin_val;
      let groups = [];
      let group = []; 
      for(id in orderedPlayerArray){
          if(orderedPlayerArray[id][1].tot_value >= group_cut){
            let p = {};
            p[orderedPlayerArray[id][0]]=orderedPlayerArray[id][1];
            group.push(p);
          }else{
            groups.push(group);
            group = [];
            let p = {};
            p[orderedPlayerArray[id][0]]=orderedPlayerArray[id][1];
            group.push(p);
            group.push(p);
            group_cut = orderedPlayerArray[id][1].tot_value-margin_val;
          }
      }
      groups.push(group);
    return groups;
  }

  refreshGameTimer = function(){
    game.race.used_t += 1000/REFRESH_RATE;
    game.race.remain_t -= 1000/REFRESH_RATE;
  }
  checkEndSector = function(){
    if(game.race.remain_t <= 0 ){
        return true;
    }
  }
  checkEndRace = function(){
    if(game.race.sector > NUM_SECTORS){
        return true;
    }
  }

  resetGame = function(){
    for (player in players){
        players[player].max_aero = INITIAL_AERO;
        players[player].max_anaero = INITIAL_AERO;
        players[player].aero = INITIAL_AERO;
        players[player].anaero = INITIAL_AERO;
    }
    game.players = players;
    game.race.state = STATE;
    game.race.sector = 1;
    game.race.remain_t = INITIAL_TURN_TIME;
    game.race.used_t = 0; 
    game.race.classification = [];
  }

  initPlayer = function(rider){
      return {
        name : rider.Name,
        skills: rider,
        max_aero: INITIAL_AERO,
        max_anaero: INITIAL_AERO,
        aero: INITIAL_AERO,
        anaero: INITIAL_AERO,
        tot_value: 0
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