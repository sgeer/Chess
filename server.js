var io = require('socket.io').listen(9898);

var Waiting = new Array();	//Ожидающие игру
var Rooms = new Array();	//в комнате будем хроанить ID, количество игроков и какой цвет на данный момент ходит
var NumberRoom = 0;			//номер комнаты (будем увеличивать по увеличению числа комнат)

function GetRoom(id)
{
	for(var i=0; i<Rooms.length; i++)
		if(Rooms[i].ID == id)
			return Rooms[i];
}

function Random(min, max){
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

io.sockets.on('connection', function (socket) {
    console.log('Игрок |= ' + socket.id + ' =| подключён к серверу.');	
    		
	socket.on('room_leave', function()
	 {
		for (var room in socket.rooms)
			if (room[0] == 'R')
			{
				var currRoom;
				socket.leave(room);
				console.log('Игрок |= ' + socket.id + ' =| покидает комнату ' + room);
				for(var i=0; i<Rooms.length; i++){
					if(Rooms[i].ID == room){
						Rooms[i].length--;
						currRoom = Rooms[i];
						break;
					}
				}
				io.sockets.in(room).emit('game_end', {msg: 'leave', winnerColor: (currRoom.nowTurn)});
			}
    });
	
	socket.on('game_find', function() {
		console.log('Игрок |= ' + socket.id + ' =| ' + ' начал поиск игры.');

		var socket2;

		if(Waiting.length == 0)
		{
			console.log('Игрок |= ' + socket.id + ' =| ожидает оппонента.');
			Waiting.push(socket);	//кидаем в конец
			return;
		}
		else
		{
			var socket2 = Waiting.pop();	//берём последнего из ожидающих		

			Rooms[Rooms.length] = { ID: 'Room' + ++NumberRoom, length: 2, nowTurn: 'white' };
			
			socket.join(Rooms[Rooms.length-1].ID);
			socket2.join(Rooms[Rooms.length-1].ID);
			
			var playerColor1;
			var playerColor2; 

				// задаём случайно цвета
			switch(Random(0,1))			
			{
				case 0:
				playerColor1 = 'white';
				playerColor2 = 'black';
				break;
				case 1:
				playerColor1 = 'black';
				playerColor2 = 'white';
				break;
			}
			
			console.log('Игрок |= ' + socket.id + ' =| играет с игроком ' +'|= ' + socket2.id + ' =| ');
			console.log('В комнате '+Rooms[Rooms.length-1].ID);

			socket.emit('game_found', {color: playerColor1, ID: Rooms[Rooms.length-1].ID});
			socket2.emit('game_found', {color: playerColor2, ID: Rooms[Rooms.length-1].ID});
		}
    });
	
	socket.on('game_stopFinding', function()
	{
		for(var i=0; i<Waiting.length; i++)
			if(Waiting[i].id==socket.id){
				console.log('Игрок |= ' + socket.id + ' =| вышел из очереди поиска игры');
				Waiting.splice(i,1);
			}
    });
	
	socket.on('turn_move', function(data) {
        console.log('Игрок |= ' + socket.id + ' =| ходит '+data.from.x+data.from.y+' - '+data.to.x+data.to.y);
		for (var room in socket.rooms) {
			console.log(socket.rooms);
			if (room[0] == 'R')
			{
				var currRoom = GetRoom(room);
				
				socket.broadcast.to(room).emit('player_move', {
					playerColor: (currRoom.nowTurn), 
					from: {
						x: data.from.x,
						y: data.from.y
					},
					to: {
						x: data.to.x,
						y: data.to.y
					}
				});
				
				currRoom.nowTurn = 'white' ? 'black' : 'white';
			}
		}
		
    });

	socket.on('turn_castling', function(data) {
        console.log(socket.id + ' делает рокировку с ладьей на '+data.from.x+data.from.y+'.');
		for (var room in socket.rooms) {
			if (room[0] == 'R'){
				
				var currRoom = GetRoom(room);
				
				socket.broadcast.to(room).emit('player_castling', {
					playerColor: (currRoom.nowTurn), 
					from: {
						x: data.from.x,
						y: data.from.y
					}
				});
				
				currRoom.nowTurn = 'white' ? 'black' : 'white';
			}
		}	
    });
	
	socket.on('turn_promotion', function(data) {
        console.log(socket.id + ' делает ход пешкой '+data.from.x+data.from.y+' - '+data.to.x+data.to.y+' и превращает ее в фигуру '+data.newPiece+'.');
		for (var room in socket.rooms) {
			if (room[0] == 'R'){
				
				var currRoom = GetRoom(room);
				
				socket.broadcast.to(room).emit('player_promotion', {
					playerColor: (currRoom.nowTurn), 
					from: {
						x: data.from.x,
						y: data.from.y
					},
					to: {
						x: data.to.x,
						y: data.to.y
					},
					newPiece: data.newPiece
				});
				
				currRoom.nowTurn = 'white' ? 'black' : 'white';
			}
		}
		
    });

	socket.on('turn_mate', function() {
        console.log('Игрок |= ' + socket.id + ' =| сообщил, что ему поставлен мат');
		for (var room in socket.rooms) {
			if (room[0] == 'R')
			{			
				var currRoom = GetRoom(room);	
				socket.broadcast.to(room).emit('player_mate');
				currRoom.nowTurn = 'white' ? 'black' : 'white';
			}
		}	
    });
	
	socket.on('turn_draw', function() {
        console.log('Игрок |= ' + socket.id + ' =| сообщил, что ему поставлен пат');
		for (var room in socket.rooms) {
			if (room[0] == 'R')
			{				
				var currRoom = GetRoom(room);
				socket.broadcast.to(room).emit('player_draw');
				currRoom.nowTurn = 'white' ? 'black' : 'white';
			}
		}	
    });
	
	socket.on('turnValidation_invalid', function() {
        console.log('Игрок |= ' + socket.id + ' =| сообщает о неверном ходе соперника');
		for (var room in socket.rooms) {
			if (room[0] == 'R'){		
				var currRoom = GetRoom(room);
				io.sockets.in(room).emit('game_end', {msg: 'invalid turn', winnerColor: (currRoom.nowTurn)});
			}
		}	
    });
	
	socket.on('turnValidation_mate', function() {
        console.log('Игрок |= ' + socket.id + ' =| подтвердил, что сопернику поставлен мат');
		for (var room in socket.rooms) {
			if (room[0] == 'R'){	
				var currRoom = GetRoom(room);
				io.sockets.in(room).emit('game_end', {msg: 'mate', winnerColor: (currRoom.nowTurn)});
			}
		}	
    });
	
	socket.on('turnValidation_draw', function() {
        console.log('Игрок |= ' + socket.id + ' =| подтвердил, что сопернику поставлен пат');
		for (var room in socket.rooms) {
			if (room[0] == 'R'){		
				var currRoom = GetRoom(room);
				io.sockets.in(room).emit('game_end', {msg: 'draw', winnerColor: null});
			}
		}	
    });
	
    socket.on('disconnect', function() {
		console.log('Игрок |= ' + socket.id + ' =| отключился от сервера.');
		for (var room in socket.rooms) {
			if (room[0] == 'R'){
				socket.leave(room);
				for(var i=0; i<Rooms.length; i++){
					if(Rooms[i].ID == room){
						Rooms[i].length--;
						break;
					}
				}
				io.sockets.in(room).emit('game_end', {msg: 'leave', winnerColor: null});
			}
		}
    });
});