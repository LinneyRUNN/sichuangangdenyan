// 使用本地存储模拟多人游戏
class WebSocketMultiplayer {
    constructor() {
        this.playerId = null;
        this.playerName = '';
        this.roomCode = null;
        this.isHost = false;
        this.gameState = null;
        this.pollInterval = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
        console.log('WebSocket多人游戏初始化完成');
    }
    
    setupEventListeners() {
        document.getElementById('createWsRoomBtn').addEventListener('click', () => {
            this.createRoom();
        });
        
        document.getElementById('joinWsRoomBtn').addEventListener('click', () => {
            this.showJoinRoom();
        });
        
        document.getElementById('confirmJoinWsBtn').addEventListener('click', () => {
            this.joinRoom();
        });
        
        document.getElementById('wsStartGameBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('playCardsBtn').addEventListener('click', () => {
            this.playCards();
        });
        
        document.getElementById('passBtn').addEventListener('click', () => {
            this.pass();
        });
        
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.startGame();
        });
    }
    
    // 创建房间
    createRoom() {
        const playerName = document.getElementById('wsPlayerName').value.trim();
        if (!playerName) {
            alert('请输入您的昵称');
            return;
        }
        
        this.playerName = playerName;
        this.roomCode = this.generateRoomCode();
        this.isHost = true;
        
        // 创建房间数据
        const roomData = {
            code: this.roomCode,
            host: this.playerId,
            players: [{
                id: this.playerId,
                name: playerName,
                isHost: true,
                connected: true
            }],
            gameState: null,
            created: Date.now()
        };
        
        // 保存到本地存储
        localStorage.setItem(`room_${this.roomCode}`, JSON.stringify(roomData));
        
        this.updateStatus('房间创建成功！');
        this.showRoomInfo();
        this.startPolling();
    }
    
    // 显示加入房间输入
    showJoinRoom() {
        document.getElementById('joinWsRoomSection').style.display = 'block';
    }
    
    // 加入房间
    joinRoom() {
        const playerName = document.getElementById('wsPlayerName').value.trim();
        const roomCode = document.getElementById('wsRoomCode').value.trim().toUpperCase();
        
        if (!playerName) {
            alert('请输入您的昵称');
            return;
        }
        
        if (!roomCode || roomCode.length !== 4) {
            alert('请输入4位房间号');
            return;
        }
        
        // 检查房间是否存在
        const roomKey = `room_${roomCode}`;
        const roomDataStr = localStorage.getItem(roomKey);
        
        if (!roomDataStr) {
            alert('房间不存在，请检查房间号');
            return;
        }
        
        const roomData = JSON.parse(roomDataStr);
        
        // 检查房间是否已满
        if (roomData.players.length >= 3) {
            alert('房间已满');
            return;
        }
        
        // 检查是否已在房间中
        const existingPlayer = roomData.players.find(p => p.name === playerName);
        if (existingPlayer) {
            alert('昵称已被使用，请换一个昵称');
            return;
        }
        
        this.playerName = playerName;
        this.roomCode = roomCode;
        this.isHost = false;
        
        // 添加玩家到房间
        roomData.players.push({
            id: this.playerId,
            name: playerName,
            isHost: false,
            connected: true
        });
        
        // 更新房间数据
        localStorage.setItem(roomKey, JSON.stringify(roomData));
        
        this.updateStatus('成功加入房间！');
        this.showRoomInfo();
        this.startPolling();
    }
    
    // 显示房间信息
    showRoomInfo() {
        document.getElementById('wsRoomCodeDisplay').textContent = this.roomCode;
        document.getElementById('wsRoomInfo').style.display = 'block';
        document.getElementById('joinWsRoomSection').style.display = 'none';
        this.updatePlayersList();
    }
    
    // 开始轮询更新
    startPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        this.pollInterval = setInterval(() => {
            this.checkRoomUpdates();
        }, 1000);
    }
    
    // 检查房间更新
    checkRoomUpdates() {
        if (!this.roomCode) return;
        
        const roomKey = `room_${this.roomCode}`;
        const roomDataStr = localStorage.getItem(roomKey);
        
        if (!roomDataStr) {
            this.updateStatus('房间已不存在');
            this.leaveRoom();
            return;
        }
        
        const roomData = JSON.parse(roomDataStr);
        
        // 更新玩家列表
        this.updatePlayersList(roomData.players);
        
        // 检查游戏状态
        if (roomData.gameState && roomData.gameState !== this.gameState) {
            this.gameState = roomData.gameState;
            this.updateGameUI();
        }
    }
    
    // 更新玩家列表
    updatePlayersList(players) {
        const roomData = this.getRoomData();
        if (!roomData) return;
        
        const playersList = players || roomData.players;
        const playersGrid = document.getElementById('wsPlayersGrid');
        const playerCount = document.getElementById('wsPlayerCount');
        const startBtn = document.getElementById('wsStartGameBtn');
        
        playerCount.textContent = playersList.length;
        
        playersGrid.innerHTML = '';
        playersList.forEach((player, index) => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            playerCard.innerHTML = `
                <div>${player.name}</div>
                <div class="player-status ${player.connected ? 'status-online' : 'status-offline'}"></div>
                ${player.isHost ? '<div style="color: #ff9800;">房主</div>' : ''}
            `;
            playersGrid.appendChild(playerCard);
        });
        
        // 更新开始游戏按钮
        if (this.isHost) {
            startBtn.disabled = playersList.length < 2;
            if (playersList.length >= 2) {
                this.updateStatus(`房间人数：${playersList.length}/3，可以开始游戏`);
            } else {
                this.updateStatus('等待更多玩家加入...');
            }
        } else {
            startBtn.style.display = 'none';
            this.updateStatus(`房间人数：${playersList.length}/3，等待房主开始游戏`);
        }
    }
    
    // 开始游戏
    startGame() {
        if (!this.isHost) {
            alert('只有房主可以开始游戏');
            return;
        }
        
        const roomData = this.getRoomData();
        if (!roomData) return;
        
        if (roomData.players.length < 2) {
            alert('至少需要2名玩家才能开始游戏');
            return;
        }
        
        // 创建游戏状态
        this.gameState = this.createInitialGameState(roomData.players);
        this.dealCards();
        
        // 更新房间数据
        roomData.gameState = this.gameState;
        localStorage.setItem(`room_${this.roomCode}`, JSON.stringify(roomData));
        
        this.showGameContainer();
        this.updateGameUI();
    }
    
    // 创建初始游戏状态
    createInitialGameState(players) {
        return {
            currentPlayerIndex: 0,
            players: players.map(p => ({
                id: p.id,
                name: p.name,
                cards: [],
                isHost: p.isHost
            })),
            lastPlay: {
                cards: [],
                player: null
            },
            deck: [],
            gamePhase: 'playing',
            lastUpdate: Date.now()
        };
    }
    
    // 发牌
    dealCards() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
        
        // 创建牌组
        const deck = [];
        for (let suit of suits) {
            for (let value of values) {
                deck.push({ suit, value });
            }
        }
        
        // 洗牌
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        
        // 分发手牌
        const playerCount = this.gameState.players.length;
        if (playerCount >= 3) {
            // 3人游戏：第一个玩家6张，其他5张
            this.gameState.players[0].cards = deck.splice(0, 6);
            this.gameState.players[1].cards = deck.splice(0, 5);
            this.gameState.players[2].cards = deck.splice(0, 5);
        } else {
            // 2人游戏：每人8张
            this.gameState.players[0].cards = deck.splice(0, 8);
            this.gameState.players[1].cards = deck.splice(0, 8);
        }
        
        this.gameState.deck = deck;
    }
    
    // 显示游戏界面
    showGameContainer() {
        document.getElementById('websocketRoom').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'grid';
        document.getElementById('currentRoom').textContent = this.roomCode;
    }
    
    // 更新游戏UI
    updateGameUI() {
        if (!this.gameState) return;
        
        // 找到当前玩家
        const myPlayer = this.gameState.players.find(p => p.id === this.playerId);
        if (myPlayer) {
            this.displayCards('playerHand', myPlayer.cards);
            document.getElementById('playerCardCount').textContent = myPlayer.cards.length;
        }
        
        // 更新其他玩家信息
        let playerIndex = 1;
        this.gameState.players.forEach((player) => {
            if (player.id !== this.playerId) {
                const nameElement = document.getElementById(`player${playerIndex + 1}Name`);
                const countElement = document.getElementById(`player${playerIndex + 1}CardCount`);
                
                if (nameElement) nameElement.textContent = player.name;
                if (countElement) countElement.textContent = player.cards.length;
                
                playerIndex++;
            }
        });
        
        // 更新当前玩家
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        document.getElementById('currentPlayer').textContent = currentPlayer.name;
        
        // 更新按钮状态
        const isMyTurn = currentPlayer.id === this.playerId;
        document.getElementById('playCardsBtn').disabled = !isMyTurn;
        document.getElementById('passBtn').disabled = !isMyTurn;
        
        // 更新游戏状态
        if (isMyTurn) {
            document.getElementById('gameStatus').textContent = '轮到您出牌';
        } else {
            document.getElementById('gameStatus').textContent = `等待 ${currentPlayer.name} 出牌...`;
        }
        
        // 更新上次出牌
        if (this.gameState.lastPlay.cards.length > 0) {
            this.displayCards('lastPlayedCards', this.gameState.lastPlay.cards);
            document.getElementById('lastPlayer').textContent = this.gameState.lastPlay.player;
        }
    }
    
    // 显示卡牌
    displayCards(containerId, cards) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.cardIndex = index;
            
            // 设置卡牌颜色
            if (card.suit === '♥' || card.suit === '♦') {
                cardElement.classList.add('red');
            } else {
                cardElement.classList.add('black');
            }
            
            cardElement.innerHTML = `
                <div class="card-value">${card.value}</div>
                <div class="card-suit">${card.suit}</div>
            `;
            
            // 添加点击事件（仅玩家手牌）
            if (containerId === 'playerHand') {
                cardElement.addEventListener('click', () => {
                    cardElement.classList.toggle('selected');
                    this.updatePlayButton();
                });
            }
            
            container.appendChild(cardElement);
        });
    }
    
    // 更新出牌按钮状态
    updatePlayButton() {
        const selectedCards = document.querySelectorAll('#playerHand .card.selected');
        const playBtn = document.getElementById('playCardsBtn');
        if (playBtn) {
            playBtn.disabled = selectedCards.length === 0;
        }
    }
    
    // 出牌
    playCards() {
        const selectedCardElements = document.querySelectorAll('#playerHand .card.selected');
        const myPlayer = this.gameState.players.find(p => p.id === this.playerId);
        
        const selectedCards = Array.from(selectedCardElements).map(el => {
            const index = parseInt(el.dataset.cardIndex);
            return myPlayer.cards[index];
        });
        
        if (selectedCards.length === 0) return;
        
        // 验证出牌是否有效
        if (!this.validatePlay(selectedCards)) {
            alert('无效的出牌');
            return;
        }
        
        // 从手牌中移除出的牌
        selectedCards.forEach(playedCard => {
            const index = myPlayer.cards.findIndex(card => 
                card.suit === playedCard.suit && card.value === playedCard.value
            );
            if (index !== -1) {
                myPlayer.cards.splice(index, 1);
            }
        });
        
        // 更新游戏状态
        this.gameState.lastPlay = {
            cards: selectedCards,
            player: myPlayer.name
        };
        
        // 检查是否获胜
        if (myPlayer.cards.length === 0) {
            alert(`恭喜 ${myPlayer.name} 获胜！`);
            this.gameState.gamePhase = 'finished';
        } else {
            // 切换到下一个玩家
            this.nextPlayer();
        }
        
        this.saveGameState();
        this.updateGameUI();
    }
    
    // 不要
    pass() {
        this.nextPlayer();
        this.saveGameState();
        this.updateGameUI();
    }
    
    // 下一个玩家
    nextPlayer() {
        this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
    }
    
    // 验证出牌
    validatePlay(cards) {
        // 简化验证：允许任何出牌
        return cards.length > 0;
    }
    
    // 保存游戏状态
    saveGameState() {
        const roomData = this.getRoomData();
        if (!roomData) return;
        
        this.gameState.lastUpdate = Date.now();
        roomData.gameState = this.gameState;
        localStorage.setItem(`room_${this.roomCode}`, JSON.stringify(roomData));
    }
    
    // 获取房间数据
    getRoomData() {
        if (!this.roomCode) return null;
        
        const roomDataStr = localStorage.getItem(`room_${this.roomCode}`);
        return roomDataStr ? JSON.parse(roomDataStr) : null;
    }
    
    // 生成房间号
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    // 更新状态
    updateStatus(status) {
        const statusElement = document.getElementById('wsStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }
    
    // 离开房间
    leaveRoom() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        
        // 如果是房主，删除房间
        if (this.isHost && this.roomCode) {
            localStorage.removeItem(`room_${this.roomCode}`);
        } else if (this.roomCode) {
            // 从房间中移除玩家
            const roomData = this.getRoomData();
            if (roomData) {
                roomData.players = roomData.players.filter(p => p.id !== this.playerId);
                if (roomData.players.length > 0) {
                    localStorage.setItem(`room_${this.roomCode}`, JSON.stringify(roomData));
                } else {
                    localStorage.removeItem(`room_${this.roomCode}`);
                }
            }
        }
        
        this.roomCode = null;
        this.isHost = false;
        this.gameState = null;
        
        // 回到连接选择界面
        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('websocketRoom').style.display = 'none';
        document.getElementById('connectionSelection').style.display = 'block';
        document.getElementById('wsRoomInfo').style.display = 'none';
        
        this.updateStatus('已离开房间');
    }
}

// 全局函数
function leaveWsRoom() {
    if (window.websocketGame) {
        window.websocketGame.leaveRoom();
    }
}

// 初始化
window.websocketGame = new WebSocketMultiplayer(); 