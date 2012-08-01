var irc = require('irc');

/*
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.setRawMode(true);
*/

var currentChannel = '#Node.js';
var init = false;

var botMaster = new irc.Client('irc.freenode.net', 'IRCbot_Master', {
  channels: [currentChannel],
  userName: 'IRCbot_Master',
  realName: 'The Master IRC',
  port: 6667,
  debug: false,
  showErrors: false,
  autoRejoin: true,
  autoConnect: true,
  secure: false,
  selfSigned: false,
  certExpired: false,
  floodProtection: false,
  floodProtectionDelay: 1000,
  stripColors: false
});

var botSlave = new irc.Client('irc.freenode.net', 'IRCbot_Slave', {
  channels: [currentChannel],
  userName: 'IRCbot_Slave',
  realName: 'A slave IRC',
  port: 6667,
  debug: false,
  showErrors: false,
  autoRejoin: true,
  autoConnect: true,
  secure: false,
  selfSigned: false,
  certExpired: false,
  floodProtection: false,
  floodProtectionDelay: 1000,
  stripColors: false
});

botMaster.addListener('pm', function(sender, message) {
  var args = message.split(" ");
  if(message == "init"){
    if(!init) {
      init = true;
      console.log(sender + ": initialising");
      botMaster.say(currentChannel, sender + ": Enabling IRCbot...");
      op("IRCbot_Slave", "master");
      return;
	} else {
      botMaster.send('MSG', sender, 'Already initialised');
      return;
	}
  }
  if(message == "shutdown"){
    stop(sender);
  }
  
  if(!init){ return; }
  
  if(message == "deinit") {
    botMaster.say(currentChannel, sender  + ": disabling IRCbot...");
	init = false;
  }
  if(message == "opme"){
    console.log(sender + ": Opping " + sender);
    op(sender, "master", sender);
	return;
  }
  if(message == "opslaves"){
    console.log(sender + ": Opping all slaves");
    op("IRCbot_Slave", "master", sender);
	return;
  }
  if(startsWith(message, "op ")){
    console.log(sender + ": opping " + args[1]);
    op(args[1], "master", sender);
	return;
  }
  if(startsWith(message, "say ")){
    var fmessage;
    for(var i = 1; i < args.length; i++){
      fmessage += i + " ";
    }
    console.log(sender + ": saying " + fmessage);
    botMaster.say(currentChannel, fmessage);
    return;
  }
  if(startsWith(message, "deop ")){
    console.log(sender + ": deopping " + args[1]);
    deop(args[1], "master");
	return;
  }
  if(startsWith(message, "switchto ")){
    var newChannel = '#' + message.split(" ")[1];
    console.log(sender + ": Switching to channel " + newChannel);
    botMaster.part(currentChannel);
	botSlave.part(currentChannel);
	botMaster.join(newChannel);
	botSlave.join(newChannel);
	currentChannel = newChannel;
	return;
  }
  if(startsWith(message, "kick ")){
    console.log(sender + ": Kicking " + args[1]);
    kick(args[1], args[2], "master", sender);
	return;
  }
});
/*
botMaster.addListener('join', function(channel, nick, message) {
  if((nick != "IRCbot_Master") && (nick != "IRCbot_Slave")){ botMaster.say(channel, "Welcome, " + nick + " to the Node.JS IRC"); }
});
*/
botMaster.addListener('message', function (from, to, message) {
  if(message == "opme" && init) { op(from, "master"); } 
});

////////////////////////////
////////////////////////////

botMaster.addListener('-mode', function(channel, by, mode, argument, message) {
  if(argument == "IRCbot_Slave"){ 
    botMaster.send('MODE', channel, '+' + mode, "IRCbot_Slave");
	kick(by, "Disconnected by admin.", "master","IRCbot_Master");
	botMaster.say(channel, by + " has been kicked for deopping IRC bots!");
  } 
});
botSlave.addListener('-mode', function(channel, by, mode, argument, message) {
  if(argument == "IRCbot_Master") {
    botSlave.send('MODE', channel, '+o', "IRCbot_Master");
	kick(by, "Disconnected by admin.", "slave", "IRCbot_Slave");
	botMaster.say(channel, by + " has been kicked for deopping IRC bots!");
  }  
});
////
botMaster.addListener('+mode', function(channel, by, mode, argument, message) {
  if(mode == 'b' && argument == "IRCbot_Slave") {
    botMaster.send('MODE', channel, '-b', "IRCbot_Slave");
	kick(by, "Disconnected by admin.", "master", "IRCbot_Master");
	botSlave.say(channel, by + " has been kicked for attempting to ban IRC bots!");
  }
  if(mode == 'o' && by != "IRCbot_Slave"){
      op("IRCbot_Slave", "master", "IRCbot_Master"); 
  }
});
botSlave.addListener('+mode', function(channel, by, mode, argument, message) {
  if(mode == 'b' && argument == "IRCbot_Master") {
    botSlave.send('MODE', channel, '-b', "IRCbot_Master");
	kick(by, "Disconnected by admin.", "slave", "IRCbot_Slave");
	botSlave.say(channel, by + " has been kicked for attempting to ban IRC bots!");
  }
  if(mode == 'o' && by != "IRCbot_Master"){
      op('IRCbot_Master', 'slave', "IRCbot_Slave");
  }
});
////
botMaster.addListener('kick', function(channel, nick, by, reason, message) {
  if(nick == "IRCbot_Slave") {
	kick(by, "Kicking IRC bots.", "master", "IRCbot_Master");
	botSlave.say(channel, by + " has been kicked for kicking IRC bots!");
	setTimeout(function(){ botMaster.send('MODE', channel, '+o', "IRCbot_Slave"); }, 1200);
  }  
});
botSlave.addListener('kick', function(channel, nick, by, reason, message) {
  if(nick == "IRCbot_Master") {
	kick(by, "Kicking IRC bots.", "slave", "IRCbot_Slave");
	setTimeout(function(){ botSlave.send('MODE', channel, '+o', "IRCbot_Master"); }, 1200);
  }  
});
botMaster.addListener('message', function(channel, nick, message){
});



botMaster.addListener('error', function(message) {
  console.log(message);
});
botSlave.addListener('error', function(message) {
  console.log(message);
});


//////////////////////////////
//////////////////////////////

process.stdin.on('data', function(key) {
// listen for Ctrl + C
  if(key == '\3') {
    process.exit();
  }

});

var startsWith = function (superstr, str) {
  return !superstr.indexOf(str);
};

var kick = function (player, reason, bot, sender) {
if(!bot) { bot = "master"; }
if(!reason) { reason = "Disconnected by admin"; }

if(bot == "master"){
  botMaster.send('KICK', currentChannel, player, reason);
} else {
  botSlave.send('KICK', currentChannel, player, reason);
}
botSlave.say(currentChannel, " by + " + "has been kicked for kicking IRC bots!");
console.log(sender + ": kicking " + player + " for kicking IRC bots!");
};

var deop = function (player, bot, sender) {
if(!bot){ bot = "master"; }
if(bot == "master") {
  botMaster.send('MODE', currentChannel, '-o', player);
} else {
  botSlave.send('MODE', currentChannel, '-o', player);
}
console.log(sender + ": kicking " + player);
};

var op = function (player, bot, sender) {
if(!bot){ bot = "master"; }
if(bot == "master") {
  botMaster.send('MODE', currentChannel, '+o', player);
} else {
  botSlave.send('MODE', currentChannel, '+o', player);
}
console.log(sender + ": opping " + player);
};

var ban = function (player, reason, bot, sender) {
if(!bot) { bot = "master"; }
if(!reason) { reason = "Banned by admin."; }
if(bot == "master") {
  botMaster.send('MODE', currentChannel, '+b', player);
} else {
  botSlave.send('MODE', currentChannel, '+b', player);
}
console.log(sender + ": banning " + player);
};

var unban = function (player, bot, sender) {
if(!bot) { bot = "master"; }
if(bot == "master") {
  botMaster.send('MODE', currentChannel, '-b', player);
} else {
  botSlave.send('MODE', currentChannel, '-b', player);
}
console.log(sender + ": unbanning " + player);
};

var stop = function(sender){
  botMaster.say(currentChannel, sender  + ": disabling IRCbot...");
  botMaster.disconnect(sender + ": Shutting down...");
  botSlave.disconnect(sender + ": Shutting down...");
  console.log(sender + ": Shutting down..");
  setTimeout(function(){ process.exit(0); }, 1000);
};
