		window.onload = function()
	{
			Matrix = GenerateMatrix();
			CreateBoard();
			AddFiguresInMatrix();
			ReoladBoard();
			UpdateMove();
			$('#findGame').click(clickOnButtonFindGame);
			$('div.white').click(ClickOnBoard);
			$('div.black').click(ClickOnBoard);

	}
	nowTurn = 'white';
	var clientPlayFor = undefined;					//данный клиент играет за ... цвет
	var takenFigColumn = undefined;					// взята фигура с координатами столбца и строки
	var takenFigRow = undefined;
	var Matrix = undefined;							// поле. 0 - пусто || Figure
	var PawR = PawC = PawToR = PawToC = undefined;	//Необходимо запоминать коор. пешки для отправки на сервер
	var socket = io.connect('http://localhost:9898');
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
									//	ЛОГИКА ФИГУРЫ

	var Figure = function(type, color, row, column, arrRow, arrColumn, turns)
	{
		this.row = row;
		this.column = column;
		this.color = color;
		this.type = type;
		this.attackColumn = arrColumn;
		this.attackRow = arrRow;
		this.countTurns = turns;
	}
	Figure.prototype =
	{
		UpdatingMove: function()
		{
			switch (this.type)
			{
				case 'pawn':
				this.SetPawnPositions();
				break;
				case 'rook':
				this.SetRCPositions('max');
				break;
				case 'bishop':
				this.SetDPositions('max');
				break;
				case 'horse':
				this.SetHorsePositions();
				break;
				case 'queen':
				this.SetRCPositions('max');
				this.SetDPositions('max');
				break;
				case 'king':
				this.SetRCPositions(1);
				this.SetDPositions(1);
				break;
			}
		},
		SetPawnPositions: function()		//возможные атаки пешкой
		{
			var dir = this.color === 'white' ? 1:-1;

			if(this.row === 7 || this.row === 0)
				return;

				if (Matrix[this.row + dir][this.column + 1] != undefined)			//	если с одной стороны клетка существует и есть фигура другого цвета
					if (Matrix[this.row + dir][this.column + 1] != 0 && Matrix[this.row + dir][this.column + 1].color != Matrix[this.row][this.column].color)	
						this.AddPosInArray(this.row + dir, this.column+1);

				if (Matrix[this.row + dir][this.column - 1] != undefined)
					if (Matrix[this.row + dir][this.column - 1] != 0 && Matrix[this.row + dir][this.column - 1].color != Matrix[this.row][this.column].color)	
						this.AddPosInArray(this.row + dir, this.column - 1);		
		},
		GetPawnMove: function(arrR, arrC)	//возможные ходы пешкой (не атакующие)
		{
			var dir = this.color === 'white' ? 1:-1;
			for (var i = 1; i <= 2; i++)
				{
					if (this.row === 6 && dir === -1 || this.row === 1 && dir === 1)	//	если это её первый ход
					{
						if (WillBeCheck(this.row, this.column, this.row + i*dir, this.column) === false && Matrix[this.row + i*dir][this.column] === 0){		//	и на пути никого нет
								arrR.push(this.row + i*dir);
								arrC.push(this.column);		//	добавляем
						}
						else															//	иначе заканичиваем, ходов больше нет
							return;
						continue;														//	начинаем новую итерацию и смотрим вторую клетку
					}																	//	теперь случай, если уже ходила
					if (WillBeCheck(this.row, this.column, this.row + dir, this.column) === false && Matrix[this.row + dir][this.column] === 0) 				//	впереди никого нет
						{
							arrR.push(this.row + dir);
							arrC.push(this.column);
							return;
						}
				}
		},
		SetRCPositions: function(number)	//ходы по горизонтали и вертикали
		{
			var row = undefined, column = undefined;
			for (var i = 0; i < 4; i++)
			{
				var num = number === 'max' ? 10 : 1;
				switch (i)
					{
						case 0:
						row = this.row + 1;
						column = this.column;
						break;
						case 1: 
						row = this.row - 1;
						column = this.column;
						break;
						case 2:
						row = this.row;
						column = this.column + 1;
						break;
						case 3: 
						row = this.row;
						column = this.column - 1;
						break;
					}
					while ((row <= 7 && row >= 0) && (column <= 7 && column >= 0) && num > 0)
					{
						if (Matrix[row][column] != 0){												// если есть фигура
								if (Matrix[row][column].color != Matrix[this.row][this.column].color)	// если цвет врага
									this.AddPosInArray(row, column);
								break;										// тогда добавляем и заканчиваем проверять																	// текущее направление диагонали
						}
						else																			// клетка пустая
							this.AddPosInArray(row, column);

						if (i === 0)
							row++;
						else if (i === 1)
							row--;
						else if (i === 2)
							column++;
						else
							column--;	
						num--;											// добавляем и идём дальше
				
					}
			}
		},

		SetDPositions: function(number) 	//диагонали
		{
			var row = undefined, column = undefined;
			for (var i = 0; i < 4; i++)
			{
				var num = number === 'max' ? 10 : 1;
				switch (i)
					{
						case 0: 									// 3	2
						row = this.row + 1;							//   B					
						column = this.column - 1;					// 0	1
						break;
						case 1: 
						row = this.row + 1;
						column = this.column + 1;
						break;
						case 2:
						row = this.row - 1;
						column = this.column + 1;
						break;
						case 3: 
						row = this.row - 1;
						column = this.column - 1;
						break;
					}
					while ((row <= 7 && row >= 0) && (column <= 7 && column >= 0) && num > 0)
					{
						if (Matrix[row][column] != 0){												// если есть фигура
								if (Matrix[row][column].color != Matrix[this.row][this.column].color)	// если цвет врага
									this.AddPosInArray(row, column);
								break;										// тогда добавляем и заканчиваем проверять																	// текущее направление диагонали
						}
						else																			// клетка пустая
							this.AddPosInArray(row, column);

						if (i === 0){
							row++;
							column--;
						}
						else if (i === 1){
							row++;
							column++;
						}
						else if (i === 2){
							row--;
							column++;
						}
						else{
							row--;
							column--;												// добавляем и идём дальше
						}
						num--;
				
					}
			}
		},

		SetHorsePositions: function()		//ходы лошадью
		{
			var r = undefined, c = undefined;
			for (var i = 0; i < 4; i++){
				switch (i)
					{
						case 0:
						r = 2;
						c = 1;
						break;
						case 1: 
						r = 1;
						c = 2;
						break;
						case 2:
						r = -2;
						c = 1;
						break;
						case 3: 
						r = 1;
						c = -2;
						break;
					}

				for (var j = 0; j < 2; j++)
				{
					var row = this.row + r, column = this.column + c;

					if( (row) <= 7 && (row) >= 0   && (column) <= 7 && (column) >= 0)
					{
						if (Matrix[row][column] != 0){
							if (Matrix[this.row][this.column].color != Matrix[row][column].color)
								this.AddPosInArray(row, column);
						}
						else
							this.AddPosInArray(row, column);
					}
						if (Math.abs(r) === 1)
							r *= -1;
						else
							c *= -1;

				}
			}
		},
		RemoveMove: function()				//удаление массивов атакующих ходов
		{
			this.attackRow = new Array();
			this.attackColumn = new Array();
		},

		FindAttack: function(row, column)		//проверяем, под атакой ли клетка
		{
			for (var i in this.attackRow)
				if (this.attackRow[i] === row && this.attackColumn[i] === column)
						return true;

			return false;
		},
		AddPosInArray: function (row, column)	//добавляем ход в массив атакующих ходов
		{
				this.attackRow.push(row);
				this.attackColumn.push(column);
		},
		DeleteMove: function(row, column)
		{
			var i = -1;
			for (var key in this.attackRow)
				if (this.attackRow[key] === row && this.attackColumn[key] === column && this.attackRow[key] != undefined && this.attackColumn[key] != undefined){
					i=key;
					break;
				}

				if(i != -1){
					this.attackRow.splice(i,1);
					this.attackColumn.splice(i,1);
					return true;
				}		

			return false;
		},
		DeleteCheckMove: function() 			//удаляем клетки, которые дадут шах атакой (в том числе, оставляем те ходы, которые спасают от шаха)
		{
			if(this.color === nowTurn){
				var arrayR = new Array();
				var arrayC = new Array();
				for (var key in this.attackRow){
					if(WillBeCheck(this.row, this.column, this.attackRow[key], this.attackColumn[key]))
					{
						arrayR.push(this.attackRow[key]);
						arrayC.push(this.attackColumn[key]);
					}
				}		
				for (var k = 0; k < arrayR.length; k++)
					this.DeleteMove(arrayR[k], arrayC[k])
			}
		}
	}

			/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
													//СОЗДАНИЕ И РАССТАНОВКА ФИГУР НА ШАХМАТНУЮ ДОСКУ
													
	function ColorSquare(i, j)		//определение цвета клетки
	{
		if ((i%2==0 && j%2==0)|| (i%2!=0 && j%2!=0))
			return 'black';
		return 'white';
	}

	function CreateBoard()		// создание доски с клетками
	{
   		for (var i = 0; i < 8; i++)
        	for (var j = 0; j < 8; j++)
                $("#board").append('<div class="' + ColorSquare(i,j) + '" data-row=' + i + ' data-column=' + j + '></div>');
    }

	function GenerateMatrix()	//создаём матрицу
	{
		var Matrix = new Array(8);

		for (var i = 0; i < 8; i++)
		{
			Matrix[i] = new Array(8);
			for (var j = 0; j < 8; j++)
			{
				Matrix[i][j] = 0;
			}
		}
		return Matrix;
	}

	//Добавляем фигуры в матрицу
	function AddFiguresInMatrix()
	{
		GenerateMatrix();
		for(var i=0 ;i<8;i++)
		{
			Matrix[1][i] = new Figure('pawn', 'white', 1, i,	new Array(), new Array(), 0);
			Matrix[6][i] = new Figure('pawn', 'black', 6, i,	new Array(), new Array(), 0);
			if(i<3)
			{
				var r = i === 0 ? 0 : 7;
				var col = i === 0 ? 'white' : 'black';
				Matrix[r][0] = new Figure('rook',	col,	r,	0,	new Array(), new Array(), 0);
				Matrix[r][7] = new Figure('rook',	col,	r,	7,	new Array(), new Array(), 0);
				Matrix[r][1] = new Figure('horse',	col,	r,	1,	new Array(), new Array(), 0);
				Matrix[r][6] = new Figure('horse',	col,	r,	6,	new Array(), new Array(), 0);
				Matrix[r][2] = new Figure('bishop',	col,	r,	2,	new Array(), new Array(), 0);
				Matrix[r][5] = new Figure('bishop',	col,	r,	5,	new Array(), new Array(), 0);
				Matrix[r][3] = new Figure('queen',	col,	r,	3,	new Array(), new Array(), 0); 
				Matrix[r][4] = new Figure('king',	col,	r,	4,	new Array(), new Array(), 0);
			}
		}
		Matrix[5][2] = new Figure('pawn', 'white', 5, 2,	new Array(), new Array(), 0);
	}

	//приводим html в соответсвие с матрицей
	function ReoladBoard()
	{
		for(var i=0;i<8;i++)
		{
			for(var j=0;j<8;j++)
			{
				var figure = $('div.' + ColorSquare(i, j) + '[data-row="'+i+'"][data-column="'+j+'"]');
					figure.empty();
				if(Matrix[i][j] != 0)
					figure.html('<img src="' + Matrix[i][j].color + '/' + Matrix[i][j].type + '.png">');
			}
		}
	}

	//Обновляем все возможные ходы фигур
	function UpdateMove()
	{
		for(var i=0;i<8;i++)
		{
			for(var j=0;j<8;j++)
			{
				
				if(Matrix[i][j] != 0)
					{
						Matrix[i][j].RemoveMove();
						Matrix[i][j].UpdatingMove();
					}
			}
		}
	}
		/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
														//Логика игры


	function ClickOnBoard()				//кликнули на доску
	{
		if (clientPlayFor != nowTurn){
			alert("Сейчас ходите не Вы");
			return;
		}
		var row = parseInt (this.attributes['data-row'].value);
		var column = parseInt (this.attributes['data-column'].value);

		console.log('-------------------------');

		if (takenFigColumn != undefined && takenFigRow != undefined)	 //если фигура была взята
		{				
			console.log('Фигура была взята ' + Matrix[row][column].type + " " + row + ";" + column);												
			takenFigure = Matrix[takenFigRow][takenFigColumn];
			Matrix[takenFigRow][takenFigColumn].DeleteCheckMove();

			if (Matrix[row][column] != 0 && Matrix[row][column].color === nowTurn) 		// Другую фигуру взяли 
				SetCurrentFigure(row, column);

			else if(takenFigure.type === 'pawn' && takenFigure.FindAttack(row, column) === false){	//если ходит пешка (не атакует)
				if (CheckPawnMove(takenFigRow, takenFigColumn, row, column)){

					DoMoveFigure(takenFigRow, takenFigColumn, row, column);

					if (CheckPawnEnd()){
						PawR = takenFigRow;
						PawC = takenFigColumn;
						PawToR = row;
						PawToC = column;
						ShowFigureWindow();
					}
					else{
			 			socket.emit('turn_move', {from: {x: TransferColumnInLetter(takenFigColumn), y: takenFigRow+1}, to: {x: TransferColumnInLetter(column), y: row+1}} );
						EndTurn();
					}
				}
			}		
			else if(takenFigure.FindAttack(row, column) === true){
			 	DoMoveFigure(takenFigRow, takenFigColumn, row, column);

			 	if (CheckPawnEnd()){
						PawR = takenFigRow;
						PawC = takenFigColumn;
						PawToR = row;
						PawToC = column;
						ShowFigureWindow();
					}
				else{
			 		socket.emit('turn_move', {from: {x: TransferColumnInLetter(takenFigColumn), y: takenFigRow+1}, to: {x: TransferColumnInLetter(column), y: row+1} } );
			 		EndTurn();
			 	}
			}
			else if (takenFigure.type === 'king' && takenFigure.countTurns === 0){			//проверяем рокировку
				var r = row === 0 ? 0:7;
					switch(column)
					{
						case 2:
						if (Matrix[r][0].type === 'rook' && Matrix[r][0].countTurns === 0 && Matrix[r][0].FindAttack(row, takenFigColumn-1)){
							Castling(takenFigRow, takenFigColumn, r, 0, takenFigRow, takenFigColumn-2, takenFigRow, takenFigColumn-1);
							socket.emit('turn_castling', {from: {x: TransferColumnInLetter(0), y: r+1}}  );
							EndTurn();
						}
						break;
						case 6:
						if (Matrix[r][7].type === 'rook' && Matrix[r][7].countTurns === 0 && Matrix[r][7].FindAttack(row, takenFigColumn+1)){
							Castling(takenFigRow, takenFigColumn, r, 7, takenFigRow, takenFigColumn+2, takenFigRow, takenFigColumn+1);
							socket.emit('turn_castling', {from: {x: TransferColumnInLetter(7), y: r+1}}  );
							EndTurn();
						}
						break;
					}
			}
			else
				return;
			
		}
		else if (takenFigColumn === undefined  && takenFigRow === undefined) // если не взята
		{
			if (Matrix[row][column] === 0)	
				RemoveCurrentFigure();
			else if (nowTurn === Matrix[row][column].color)		// если хотим взять нужный цвет
			{
				console.log('фигуру взяли ');
				SetCurrentFigure(row, column);
			}
			else
				alert("СЕЙЧАС ХОДЯТ " + nowTurn);
		}
		else											//Тыкнули в пустую клетку
			RemoveCurrentFigure();
	}
	function DoMoveFigure(rowFrom, columnFrom, rowTo, columnTo)			//сделать ход фигурой
	{
		takenFigure = Matrix[rowFrom][columnFrom]
		Matrix[rowTo][columnTo] = new Figure(takenFigure.type, takenFigure.color, rowTo, columnTo, takenFigure.attackRow.slice(), takenFigure.attackColumn.slice(), takenFigure.countTurns+1);
		Matrix[rowFrom][columnFrom] = 0;
	}
	function CheckPawnMove(rowFrom, columnFrom, rowTo, columnTo)		//проверка, может ли походить пешка из from в to
	{
		var arrR = new Array();
		var arrC = new Array();
		Matrix[rowFrom][columnFrom].GetPawnMove(arrR, arrC);
		for (var i = 0; i < arrR.length; i++)
			if (rowTo === arrR[i] && columnTo === arrC[i])
				return true;
		return false;
	}
	function ChangeColor(color)		//вспомагательная функция для возвращения противоположного цвета
	{
		if (color === 'white')
			return 'black';
		return 'white';
	}
	function RemoveCurrentFigure()	//удаление взятой (на доске) фигуры
	{
		takenFigRow = undefined;
		takenFigColumn = undefined;
	}
	function SetCurrentFigure(r, c)
	{
		takenFigColumn = c;
		takenFigRow = r;
	}
	function Castling(rowKing, columnKing, rowRook, columnRook, newRowKing, newColumnKing, newRowRook, newColumnRook)	//делаем рокировку
	{
		var king = Matrix[rowKing][columnKing];
		var rook = Matrix[rowRook][columnRook];
		Matrix[newRowKing][newColumnKing] = new Figure(king.type, king.color, newRowKing, newColumnKing, king.attackRow.slice(), king.attackColumn.slice(), king.countTurns);
		Matrix[rowKing][columnKing] = 0;
		Matrix[newRowRook][newColumnRook] = new Figure(rook.type, rook.color, newRowRook, newColumnRook, rook.attackRow.slice(), rook.attackColumn.slice(), rook.countTurns);
		Matrix[rowRook][columnRook] = 0;
	}
	function EndTurn()			//заканчиваем ход. обновляем доску, фигуры, проверяем мат, пат, шах
	{	
		nowTurn = ChangeColor(nowTurn);
		RemoveCurrentFigure();
		ReoladBoard();
		UpdateMove();

		if (NowCheck(nowTurn))
			if (nowTurn != clientPlayFor)
				alert("Вы поставили ШАХ!");
			else
				alert("Вам поставили ШАХ!")

		var end = MateOrStalemate();

		if (end === 'mate'){
			if (nowTurn != clientPlayFor)
				alert("Вы поставили МАТ! Поздравляю :)");
			else
				alert("Вам поставили МАТ! :(");

			if(clientPlayFor != nowTurn)
				socket.emit('turn_mate');
		}
		else if (end === 'stalemate'){
			if (nowTurn === clientPlayFor)
				alert("Ваш ход привёл к ПАТУ!");
			else
				alert("Ход соперника привёл к ПАТУ!");

			if(clientPlayFor != nowTurn)
				socket.emit('turn_draw');
		}
	}
	function PositionIsAttacking (row, column, color) // проверяем, атакует ли клетку указанный цвет
	{
		for(var i=0;i<8;i++)
			for(var j=0;j<8;j++)
				if(Matrix[i][j].color === color && Matrix[i][j].FindAttack(row, column) && Matrix[i][j] != 0)
							return true;
		return false;
	}
	function WillBeCheck (row, column, newRow, newColumn)		//будет ли шах?
	{

		var recoveryCurr	=  new Figure(Matrix[row][column].type, Matrix[row][column].color, row, column, Matrix[row][column].attackRow.slice(),  Matrix[row][column].attackColumn.slice(), Matrix[row][column].countTurns);
		var recoveryNew 	=	0;
			if(Matrix[newRow][newColumn] != 0)
				recoveryNew	=  new Figure(Matrix[newRow][newColumn].type, Matrix[newRow][newColumn].color, newRow, newColumn, Matrix[newRow][newColumn].attackRow.slice(),  Matrix[newRow][newColumn].attackColumn.slice(), Matrix[newRow][newColumn].countTurns); 
		
		var result 	= false;

		if(Matrix[newRow][newColumn] != undefined){
			var tempCurr = new Figure(Matrix[row][column].type, Matrix[row][column].color, row, column, Matrix[row][column].attackRow.slice(),  Matrix[row][column].attackColumn.slice(), Matrix[row][column].countTurns);			
			var tempNew	= 0;
			if(Matrix[newRow][newColumn] != 0)
				tempNew = new Figure(Matrix[newRow][newColumn].type, Matrix[newRow][newColumn].color, newRow, newColumn, Matrix[newRow][newColumn].attackRow.slice(),  Matrix[newRow][newColumn].attackColumn.slice(), Matrix[newRow][newColumn].countTurns); 

			Matrix[row][column] = 0;
			Matrix[newRow][newColumn] = tempCurr;
			UpdateMove();
			if(NowCheck(tempCurr.color))						 //если будет шах, и нам надо удалить шаховые
					result = true;
		}
		else
			result = false;

		Matrix[row][column] = recoveryCurr;
		Matrix[newRow][newColumn] = recoveryNew;

		UpdateMove();
		return result;
	}
	function NowCheck(colorKing)		 //для какого короля смотреть шах
	{
		for(var i=0;i<8;i++)
			for(var j=0;j<8;j++)
				if(Matrix[i][j].color === colorKing && Matrix[i][j].type === 'king' && Matrix[i][j] != 0)
							return PositionIsAttacking(i, j, ChangeColor(colorKing));
		return false;
	}
	function MateOrStalemate()			//проверяем, есть ли мат или пат
	{
		var haveAttackMove = haveMovePawn = check = false;
		var r = c = new Array;
		for (var i = 0; i < 8; i++)
			for(var j = 0; j < 8; j++)
			{
				if (Matrix[i][j].type === 'king' &&  Matrix[i][j].color === nowTurn && Matrix[i][j] != 0)		//проверяем наличие шаха
					check = PositionIsAttacking(i, j, ChangeColor(nowTurn));

				if (Matrix[i][j].type === 'pawn' &&  Matrix[i][j].color === nowTurn && haveMovePawn === false && Matrix[i][j] != 0){	//имеет ли пешка обычный ход по прямой
					Matrix[i][j].GetPawnMove(r,c)
					if(r.length > 0)
						haveMovePawn = true;
				}
				if(Matrix[i][j].color === nowTurn && Object.keys(Matrix[i][j].attackRow).length > 0 && Matrix[i][j] != 0){				// может ли хоть одна фигура атаковать (всё должно быть с учётом удалённых шаховых ходов)
					for (var k in Matrix[i][j].attackRow)
						if (WillBeCheck (i, j, Matrix[i][j].attackRow[k], Matrix[i][j].attackColumn[k]) != true)
						{
							haveAttackMove = true;
							break;
						}
				}
			}

			if (check === true && haveAttackMove === false && haveMovePawn === false)
				return 'mate';
			else if (check === false && haveAttackMove === false && haveMovePawn === false)
				return 'stalemate';
			else
				return false;
	}

	function CheckPawnEnd()			//смотрим, есть ли пешка на краю доски
	{
		for (var i = 0; i < 8; i++)
			for(var j = 0; j < 8; j++)
				if ((i=== 7 || i === 0) && Matrix[i][j].type === 'pawn') // если дошли до конца
					return true;
		return false;
	}
	function ShowFigureWindow()			//показ выбор фигуры (применяется после того, как пешка дошла до конца)
	{
		var sfw = $('div#choiceFigure');
		sfw.empty();
		var figureTypes=['horse','bishop','rook','queen'];
		for(var i=0;i<figureTypes.length;i++){
			var newHtml='<div id="'+figureTypes[i]+'" '+
			'style="width: 64px; height: 64px; ' +
			'background-image: url('+nowTurn+'/'+figureTypes[i]+'.png); ' + 
			'float: left"></div>';
			sfw.html(sfw.html()+newHtml);
		}	
		$('div#queen').click(ChoiceFugureWindow);
		$('div#horse').click(ChoiceFugureWindow);
		$('div#rook').click(ChoiceFugureWindow);
		$('div#bishop').click(ChoiceFugureWindow);
		 document.getElementById('choiceFigure').style.display = 'block';
	}
	function ChoiceFugureWindow()		//пешку меняем на выбранную игроком фигуру
	{
		var id = this.getAttribute('id');
		switch (id)
		{
			case 'queen':
				Matrix[takenFigRow][takenFigColumn].type = 'queen';
				break;
			case 'horse':
				Matrix[takenFigRow][takenFigColumn].type = 'horse';
				break;
			case 'bishop':
				Matrix[takenFigRow][takenFigColumn].type = 'bishop';
				break;
			case 'rook':
				Matrix[takenFigRow][takenFigColumn].type = 'rook';
				break;

		}
		socket.emit('turn_promotion', {from: {x: TransferColumnInLetter(PawC), y: PawR+1}, to: {x: TransferColumnInLetter(PawToC), y: PawToR+1}, newPiece: id});		 
		
		Matrix[PawToR][PawToC] = new Figure(id,	nowTurn, PawToR, PawToC, new Array(), new Array(), Matrix[PawR][PawC].countTurns+1);
		Matrix[PawR][PawC] = 0;
		document.getElementById('choiceFigure').style.display = 'none';
		PawR = PawC = undefined;
		EndTurn();
	}
	function TransferColumnInLetter(column)		//перевод 0 -> A
	{
		var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
		if(column >= 0 && column <= 7)
			return letters[column];
	}
	function TransferLetterInColumn(lettern)		//перевод A -> 0
	{
		if(lettern === 'A')
			return 0;
		if(lettern === 'B')
			return 1;
		if(lettern === 'C')
			return 2;
		if(lettern === 'D')
			return 3;
		if(lettern === 'E')
			return 4;
		if(lettern === 'F')
			return 5;
		if(lettern === 'G')
			return 6;
		if(lettern === 'H')
			return 7;
	}
	function clickOnButtonFindGame()		//клик на кнопку поиска фигуры
	{
		socket.emit('game_find');
		document.getElementById('findGame').innerHTML = 'Поиск...';
	}
	function ValidMovePosition (rowA, columnA, rowD, columnD)	//проверка правильности хода
	{
		var result = false;

		if (Matrix[rowA][columnA].FindAttack(rowD, columnD))
			return true;
		else if (Matrix[rowA][columnA].type === 'pawn')
			if(CheckPawnMove(rowA, columnA, rowD, columnD))
				return true;
		return false;
	}

		/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
												// ЗАПРОСЫ ОТ СЕРВЕРА



	socket.on('game_found', function(data)
		{
			document.getElementById('board').style.display = 'block';
			document.getElementById('findGame').style.display = 'none';
			alert ("Вы играете за " + data.color);
			clientPlayFor = data.color;
			})
	socket.on('player_move', function(data)
		{
			if ( ValidMovePosition(data.from.y-1, TransferLetterInColumn(data.from.x), data.to.y-1,  TransferLetterInColumn(data.to.x) ))
			{
				DoMoveFigure(data.from.y-1, TransferLetterInColumn(data.from.x), data.to.y-1, TransferLetterInColumn(data.to.x));
		 		EndTurn();
			}
		})
	socket.on('player_castling', function(data)
		{
			var cR = TransferLetterInColumn (data.from.x); //cR - координаты ладьи
			var rR = data.from.y-1;
			var rK;
			var cK;
			var toCK = cR === 0 ? 2 : 6;
			var toCR = cR === 0 ? 3 : 5;
			var to = cR === 0 ? -1 : 1;
			for (var i = 0; i < 8; i++)
				for(var j = 0; j < 8; j++)
					if(Matrix[i][j].type === 'king' && Matrix[i][j].color === nowTurn){
						rK = i;
						cK = j;
					}
			if (Matrix[rR][cR].type === 'rook' && Matrix[rR][cR].countTurns === 0 && Matrix[rR][cR].FindAttack(rR, cK+to)){
					Castling(rK, cK, rR, cR, rK, toCK, rR, toCR);
					socket.emit('turn_castling', {from: {x: TransferColumnInLetter(cR), y: rR+1}}  );
					EndTurn();
			}
		})
	socket.on('player_promotion', function(data)
		{
			if ( ValidMovePosition(data.from.y-1, TransferLetterInColumn(data.from.x), data.to.y-1,  TransferLetterInColumn(data.to.x) ))
			{
				DoMoveFigure(data.from.y-1, TransferLetterInColumn(data.from.x), data.to.y-1, TransferLetterInColumn(data.to.x));
				Matrix[data.to.y-1][TransferLetterInColumn(data.to.x)].type = data.newPiece;
		 		EndTurn();
			}
		})
	socket.on('player_mate', function()
		{
			if(MateOrStalemate === 'mate' && clientPlayFor != nowTurn)
				socket.emit('turnValidation_mate');
		})