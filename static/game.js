var socket = io();
var playerId = null;

var canvas = document.getElementById('canvas');
var profile_canvas = document.getElementById('profile_canvas');
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
    delete players ["id"];
    console.log("Player ID: " + playerId + "connected");
});
//});

socket.on('new player', function(data){
    if (data[playerId].master == true){
        start_button.style = "display:block";
    }
});

var movement = {
    up: false,
    down: false,
    left: false,
    right: false
  }

document.addEventListener('keydown', function(event) {
    switch (event.keyCode) {
        case 65: // A
        movement.left = true;
        break
        case 37: // ArrowLeft
        movement.left = true;
        break;
        case 87: // W
        movement.up = true;
        break
        case 38: // ArrowUp
        movement.up = true;
        break;
        case 68: // D
        movement.right = true;
        break
        case 39: // ArroRight
        movement.right = true;  
        break;
        case 83: // S
        movement.down = true;
        break;
        case 40: // ArroDown
        movement.down = true;
        break;
    }
});
document.addEventListener('keyup', function(event) {
    switch (event.keyCode) {
        case 65: // A
        movement.left = false;
        break
        case 37: // ArrowLeft
        movement.left = false;
        break;
        case 87: // W
        movement.up = false;
        break
        case 38: // ArrowUp
        movement.up = false;
        break;
        case 68: // D
        movement.right = false;
        break
        case 39: // ArroRight
        movement.right = false;  
        break;
        case 83: // S
        movement.down = false;
        break;
        case 40: // ArroDown
        movement.down = false;
        break;
    }
});

socket.emit('new player');
setInterval(function() {
  socket.emit('movement', movement);
}, 1000 / 60);


formatTime = function(seconds){
    return new Date(seconds).toISOString().substr(11, 8);
}



start_button.addEventListener('click', function(){
    socket.emit('game_start', true);
})

canvas.width = 1200;
canvas.height = 400;
profile_canvas.width = 1200;
profile_canvas.height = 50;

var context = canvas.getContext('2d');
var prof_context = profile_canvas.getContext('2d');
socket.on('state', function(game) {
  race = game.race;
  km_total.innerHTML = race.km_total;
  race_time.innerHTML = formatTime(race.race_time);

  groups = game.groups;
  players = game.players;
   
  players_list.innerHTML = "";
  context.clearRect(0, 0, canvas.width, canvas.height);
  prof_context.clearRect(0, 0, profile_canvas.width, profile_canvas.height);
  
  //console.log(players)
  for (var id in players) {
    var player = players[id];
    context.fillStyle = player.color;  
    context.beginPath();
    context.arc(player.x, player.y, 10, 0, 2 * Math.PI);
    context.fill();
    
    if(id == playerId){
        if(player.power != null){
            current_power.value = player.power.toFixed(2);
            act_power.innerHTML = player.power.toFixed(2);
            avg_power.innerHTML = player.avg_power.toFixed(2);
            aero_bar.value = Math.floor(player.aero/100).toFixed(2);
            anaero_bar.value = Math.floor(player.anaero/100).toFixed(2);
            act_speed.innerHTML = player.speed.toFixed(2);
            avg_speed.innerHTML = player.avg_speed.toFixed(2);
            act_ramp.innerHTML = Math.floor(player.ramp).toFixed(2);

            km_finish.innerHTML = (race.km_total- player.stage_pos).toFixed(2);

            prof_context.fillStyle = player.color;
            prof_context.beginPath();
            prof_context.arc(Math.floor(player.stage_pos*profile_canvas.width/race.km_total), 25, 10, 0, 2 * Math.PI);
            prof_context.fill();
        }
        players_list.innerHTML += "<li class='active'>"+player.name + "(" + Math.floor(player.aero/100).toFixed(2) + "," + Math.floor(player.anaero/100).toFixed(2) + ") - [" + (player.power/player.weight).toFixed(2) + "]" +"</li>";
    }else{
        players_list.innerHTML += "<li >"+player.name+"</li>";
        prof_context.fillStyle = player.color;
        prof_context.beginPath();
        prof_context.arc(Math.floor(player.stage_pos*profile_canvas.width/race.km_total), 25, 5, 0, 2 * Math.PI);
        prof_context.fill();
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