var irc = require('irc');

/*
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.setRawMode(true);
*/

var currentChannel = '#Node.js';

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
  if(message == "opme"){
    console.log(sender + ": Opping " + sender);
    botMaster.send('MODE', currentChannel, '+o', sender);
	return;
  }
  if(message == "opslaves"){
    console.log(sender + ": Opping all slaves");
    botMaster.send('MODE', currentChannel, '+o', "IRCbot_Slave");
	return;
  }
  if(message == "shutdown"){
    stop(sender);
  }
  if(startsWith(message, "op ")){
    console.log(sender + ": opping " + args[1]);
    botMaster.send('MODE', currentChannel, '+o', args[1]);
	return;
  }
  if(startsWith(message, "deop ")){
    console.log(sender + ": deopping " + args[1]);
    botMaster.send('MODE', currentChannel, '-o', args[1]);
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
    botMaster.send('KICK', currentChannel, args[1], "Disconnected by admin");
	return;
  }
});

botMaster.addListener('join', function(channel, nick, message) {
  if((nick != "IRCbot_Master") && (nick != "IRCbot_Slave")){ botMaster.say(channel, "Welcome, " + nick + " to the Node.JS IRC"); }
});

botMaster.addListener('message', function (from, to, message) {
  if(message == "opme") { botMaster.send('MODE', currentChannel, '+o', from); } 
});

////////////////////////////
////////////////////////////

botMaster.addListener('-mode', function(channel, by, mode, argument, message) {
  if(argument == "IRCbot_Slave"){ 
    botMaster.send('MODE', channel, '+' + mode, "IRCbot_Slave");
	deop(by, "master");
	botMaster.say(channel, by + ", you have been given a warning for deopping IRC bots!");
  }  
});
botSlave.addListener('-mode', function(channel, by, mode, argument, message) {
  if(argument == "IRCbot_Master") {
    botSlave.send('MODE', channel, '+o', "IRCbot_Master");
	deop(by, "slave");
	botSlave.say(channel, by + ", you have been given a warning for deopping IRC bots!");
  }  
});
////
botMaster.addListener('+mode', function(channel, by, mode, argument, message) {
  if(mode == 'b' && argument == "IRCbot_Slave") {
    botMaster.send('MODE', channel, '-b', "IRCbot_Slave");
	deop(by, "master");
	botMaster.say(channel, by + ", you have been given a warning for attempting to ban IRC bots!");
  }  
});
botSlave.addListener('+mode', function(channel, by, mode, argument, message) {
  if(mode == 'b' && argument == "IRCbot_Master") {
    botSlave.send('MODE', channel, '-b', "IRCbot_Master");
	deop(by, "slave");
	botSlave.say(channel, by + ", you have been given a warning for attempting to ban IRC bots!");
  }  
});
////
botMaster.addListener('kick', function(channel, nick, by, reason, message) {
  if(nick == "IRCbot_Slave") {
	deop(by, "master");
	botMaster.say(channel, by + ", you have been given a warning for kicking IRC bots!");
	setTimeout(function(){ botMaster.send('MODE', channel, '+o', "IRCbot_Slave"); }, 1200);
  }  
});
botSlave.addListener('kick', function(channel, nick, by, reason, message) {
  if(nick == "IRCbot_Master") {
	deop(by, "slave");
	botSlave.say(channel, by + ", you have been given a warning for kicking IRC bots!");
	setTimeout(function(){ botSlave.send('MODE', channel, '+o', "IRCbot_Master"); }, 1200);
  }  
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

var kick = function (player, reason) {
if(!reason) { reason = "Disconnected by admin"; }
  botMaster.send('KICK', currentChannel, player, reason);
};

var deop = function (player, bot) {
if(bot == "master") {
  botMaster.send('MODE', currentChannel, '-o', player);
} else {
  botSlave.send('MODE', currentChannel, '-o', player);
}
};

var op = function (player, bot) {
if(bot == "master") {
  botMaster.send('MODE', currentChannel, '+o', player);
} else {
  botSlave.send('MODE', currentChannel, '+o', player);
}
};

var stop = function(sender){
  botMaster.disconnect(sender + ": Shutting down...");
  botSlave.disconnect(sender + ": Shutting down...");
  setTimeout(function(){ process.exit(0); }, 1000);
};
