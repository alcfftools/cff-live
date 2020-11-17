var socket = io();
var playerId = null;

const MIN_PLAYERS = 1;
const PLAYER_TIC = 1000/10;
var players_list = document.getElementById('player_list').getElementsByTagName('ul')[0];
var class_list = document.getElementById('results_list').getElementsByTagName('ul')[0];

var race_sector = document.getElementById('race_sector');

var current_power = document.getElementById('c_power');
var act_power = document.getElementById('act_power');
var avg_power = document.getElementById('avg_power');

var aero_bar = document.getElementById('aero');
var anaero_bar = document.getElementById('anaero');

var act_speed = document.getElementById('act_speed');
var avg_speed = document.getElementById('avg_speed');
var act_ramp = document.getElementById('act_ramp');
var race_time = document.getElementById('race_time');
//var km_total = document.getElementById('km_total');
var km_finish = document.getElementById('km_finish');

var start_button = document.getElementById('start_button');
var reset_button = document.getElementById('reset_button');

var players = {};



socket.on('connect', function() {
    const sessionID = socket.id; //
    playerId = sessionID;
    //console.log("Player ID: " + playerId + "connected");
  });

//io.on('connection', function(socket) {
    // other handlers ...
socket.on('disconnect', function() {
// remove disconnected player
    const sessionID = socket.id; //
    playerId = sessionID;
    delete players [playerId];
});
//});

socket.on('new player', function(data){
    if (data[playerId].master == true && Object.keys(data).length >= MIN_PLAYERS){
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
  //console.log(strategy);
}, PLAYER_TIC);


formatTime = function(millis){
        var minutes = Math.floor(millis / 60000);
        var seconds = ((millis % 60000) / 1000).toFixed(0);
        return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

start_button.addEventListener('click', function(){
    if (players[playerId].master == true && Object.keys(players).length >= MIN_PLAYERS){
        socket.emit('game_start', true);
    }
});

reset_button.addEventListener('click', function(){
    socket.emit('game_reset', true);
})


socket.on('state', function(game) {
    //console.log(game);
    race = game.race;
    //km_total.innerHTML = race.km_total;
    race_time.innerHTML = formatTime(race.used_t);
    turn_time.innerHTML = formatTime(race.remain_t);
    race_sector.innerHTML = game.race.sector;

    players = game.players;
    
    players_list.innerHTML = "";
    
    //console.log(players)
    for (var id in players) {
        var player = players[id];
        
        if(id == playerId){
            aero_bar.value = Math.floor(player.aero).toFixed(2);
            anaero_bar.value = Math.floor(player.anaero).toFixed(2);
            players_list.innerHTML += "<li class='active'>"+player.name +"(You)";
            players_list.innerHTML += Object.entries(player.skills).map((el) => el[0] +": " + el[1]).join(",") + "</li>";
        }else{
            players_list.innerHTML += "<li >"+player.name+(player.bot == true ? " <i>(bot)</i>"  : " <i>(human)</i>")+"</li>";
        }
    }

    class_list.innerHTML = "";
    let sectors = Object.keys(race.classification);
    if(sectors !== undefined && sectors.length > 0){
        let classif = race?.classification[sectors[sectors.length-1]];
        for(var group in classif){
            for(var id in classif[group]){
                class_list.innerHTML += "<li >" + Object.values(classif[group][id])[0].name + " - m.t.</li>"; //+ formatTime(race.classification[id].race_time) + "</li>";
            }
            class_list.innerHTML += "<br></br>" + " - XX seg </li>"; //+ formatTime(race.classification[id].race_time) + "</li>";

        }
    }
    if(race.state ==2){
        reset_button.disabled = false;
    }
});


//Create separate scripts and classes:
//Game.js
//Player.js
//Drawing.js
//Input.js
//Util.js
//Sound.js?