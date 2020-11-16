var socket = io();
var playerId = null;

const MIN_PLAYERS = 3;
const PLAYER_TIC = 1000/10;
var players_list = document.getElementById('player_list').getElementsByTagName('ul')[0];
var class_list = document.getElementById('player_list').getElementsByTagName('ul')[1];

var current_power = document.getElementById('c_power');
var act_power = document.getElementById('act_power');
var avg_power = document.getElementById('avg_power');

var aero_bar = document.getElementById('aero');
var anaero_bar = document.getElementById('anaero');

var act_speed = document.getElementById('act_speed');
var avg_speed = document.getElementById('avg_speed');
var act_ramp = document.getElementById('act_ramp');
var race_time = document.getElementById('race_time');
var km_total = document.getElementById('km_total');
var km_finish = document.getElementById('km_finish');

var start_button = document.getElementById('start_button');

var players = {};



socket.on('connect', function() {
    const sessionID = socket.id; //
    playerId = sessionID;
    console.log("Player ID: " + playerId + "connected");
  });

//io.on('connection', function(socket) {
    // other handlers ...
socket.on('disconnect', function() {
// remove disconnected player
    const sessionID = socket.id; //
    playerId = sessionID;
    //TODO: Reassign master
    //if (players[playerId].master == true){
        
    //}
    delete players [playerId];
    console.log("Player ID: " + playerId + "disconnected");
});
//});

socket.on('new player', function(data){
    if (data[playerId].master == true && Object.keys(players).length >= MIN_PLAYERS){
        start_button.style = "display:block";
        start_button.disabled = false;
    }
});

var strategy = current_power.value;

current_power.addEventListener('input', function () {
    act_power.innerHTML = current_power.value;
    strategy = current_power.value;
  }, false);

socket.emit('new player');
setInterval(function() {
  socket.emit('strategy', strategy);
  console.log(strategy);
}, PLAYER_TIC);


formatTime = function(seconds){
//    return new Date(seconds).toISOString().substr(11, 8);
}

start_button.addEventListener('click', function(){
    if (data[playerId].master == true && players.length >= MIN_PLAYERS){
        socket.emit('game_start', true);
    }
})


socket.on('state', function(game) {
    console.log(game);
    race = game.race;
    km_total.innerHTML = race.km_total;
    race_time.innerHTML = formatTime(race.race_time);

    groups = game.groups;
    players = game.players;
    
    players_list.innerHTML = "";
    
    //console.log(players)
    for (var id in players) {
        var player = players[id];
        // context.fillStyle = player.color;  
        // context.beginPath();
        // context.arc(player.x, player.y, 10, 0, 2 * Math.PI);
        // context.fill();
        
         if(id == playerId){
        //     if(player.power != null){
        //         current_power.value = player.power.toFixed(2);
        //         act_power.innerHTML = player.power.toFixed(2);
        //         avg_power.innerHTML = player.avg_power.toFixed(2);
        //         aero_bar.value = Math.floor(player.aero/100).toFixed(2);
        //         anaero_bar.value = Math.floor(player.anaero/100).toFixed(2);
        //         act_speed.innerHTML = player.speed.toFixed(2);
        //         avg_speed.innerHTML = player.avg_speed.toFixed(2);
        //         act_ramp.innerHTML = Math.floor(player.ramp).toFixed(2);

        //         km_finish.innerHTML = (race.km_total- player.stage_pos).toFixed(2);

        //         prof_context.fillStyle = player.color;
        //         prof_context.beginPath();
        //         prof_context.arc(Math.floor(player.stage_pos*profile_canvas.width/race.km_total), 25, 10, 0, 2 * Math.PI);
        //         prof_context.fill();
        //     }
             players_list.innerHTML += "<li class='active'>"+player.name +"</li>";
         }else{
             players_list.innerHTML += "<li >"+player.name+"</li>";
        //     prof_context.fillStyle = player.color;
        //     prof_context.beginPath();
        //     prof_context.arc(Math.floor(player.stage_pos*profile_canvas.width/race.km_total), 25, 5, 0, 2 * Math.PI);
        //     prof_context.fill();
         }
  }

  class_list.innerHTML = "";
  for(var id in race?.classification){
    class_list.innerHTML += "<li >" + race.classification[id].name + " - " + formatTime(race.classification[id].race_time) + "</li>";
  }
});


//Create separate scripts and classes:
//Game.js
//Player.js
//Drawing.js
//Input.js
//Util.js
//Sound.js?