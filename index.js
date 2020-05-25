const Socket = require('socket.io');
const SerialPort = require('serialport');
const express = require('express');
const Readline = require('@serialport/parser-readline')

const app = express();
SerialPort.list().then(console.log);

// connect to crossaint
const path = '/dev/cu.usbmodem14501';
const port = new SerialPort(path, { baudRate: 9600 });
const parser = new Readline();
port.pipe(parser)

const a = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']; 
const b = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '\b']; 
const c = ['\\s', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '?', '\n'];
const keyboard = a.concat(b,c);

const totalSqueezeThreshold = 15000;
let lastSqueezed = new Date();

// if below this number then its considered human push
const pressureThreshold = 350;

let sendData = (data) => {
  getKeyPressed(data);
};

let lastSqueeze = false;
let i = 0;
let bufferSize = 2;
let buffer = new Array(bufferSize);

let getKeyPressed = (data) => {
  const numbers = data.split(' ')[0].split('\t').map(n => parseInt(n));
  const min = Math.min(...numbers);
  const idx = numbers.indexOf(min);
  const total = numbers.reduce((a,b) => a+ b)
  const totalPressuredInputs = numbers.filter(x => x < 400).length
  const letter = keyboard[idx];

  const totalPressedMax = 10;

  const squeezeCondition = total < totalSqueezeThreshold || totalPressuredInputs > totalPressedMax;
  const letterPressCondition = totalPressuredInputs >= 1 && (new Date() - lastSqueezed) > 500 && min < pressureThreshold;
  const letterCond = buffer.reduce((a,b) => a && b, true) && totalPressuredInputs <= totalPressedMax && min < pressureThreshold;
  const backspace = letter == '\b' && totalPressuredInputs >= 1;

  console.log(squeezeCondition, letterCond, totalPressuredInputs, backspace);

  if (letterCond || backspace) {
    console.log('letter', letter);
    io.emit('data', {
      "squeezed": false,
      letter,
      "pressure": numbers[idx]
    });
  } else if (squeezeCondition) {
    io.emit('data', {
      "squeezed": true,
      "pressure": total,
      letter,
      totalSqueezeThreshold
    });
    lastSqueezed = new Date();
  }

  buffer[i++ % bufferSize] = letterPressCondition;

}

parser.on('data', line => {
    sendData(line);
});

port.write('ROBOT POWER ON\n')
//> ROBOT ONLINE

var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', (reason) => {
    console.log(reason);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});