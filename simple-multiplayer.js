// 简单P2P多人联机脚本
class SimpleMultiplayer {
    constructor() {
        this.peer = null;
        this.connections = [];
        this.isHost = false;
        this.roomId = null;
        this.playerName = '';
        this.players = [];
        this.gameState = null;
        this.myPlayerId = null;
        
        this.init();
    }
    
    // 初始化
    init() {
        this.setupEventListeners();
        console.log('简单联机模块初始化完成');
    }
    
    // 设置事件监听
    setupEventListeners() {
        document.getElementById('createRoomBtn').addEventListener('click', () => {
            this.createRoom();
        });
        
        document.getElementById('joinRoomBtn').addEventListener('click', () => {
            this.joinRoom();
        });
        
        document.getElementById('leaveRoomBtn').addEventListener('click', () => {
            this.leaveRoom();
        });
        
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.startNewGame();
        });
        
        document.getElementById('playCardsBtn').addEventListener('click', () => {
            this.playCards();
        });
        
        document.getElementById('passBtn').addEventListener('click', () => {
            this.pass();
        });
        
        // 规则说明开关
        document.getElementById('rulesToggle').addEventListener('click', () => {
            const content = document.getElementById('rulesContent');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    // 创建房间
    async createRoom() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            alert('请输入您的昵称');
            return;
        }
        
        this.playerName = playerName;
        this.isHost = true;
        
        try {
            this.updateStatus('正在创建房间...');
            
            // 创建PeerJS实例，使用更稳定的配置
            this.peer = new Peer(null, {
                host: 'peerjs-server.herokuapp.com',
                port: 443,
                path: '/',
                secure: true,
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });
            
            this.peer.on('open', (id) => {
                this.roomId = id;
                this.myPlayerId = `${playerName}_${Date.now()}`;
                
                // 添加自己到玩家列表
                this.players = [{
                    id: this.myPlayerId,
                    name: playerName,
                    isHost: true,
                    connected: true
                }];
                
                this.updateStatus('房间创建成功！等待其他玩家加入...');
                document.getElementById('myRoomId').textContent = id;
                document.getElementById('roomInfo').style.display = 'block';
                this.updatePlayerCount();
                
                console.log('房间创建成功，ID:', id);
            });
            
            this.peer.on('connection', (conn) => {
                this.handleNewConnection(conn);
            });
            
            this.peer.on('error', (err) => {
                console.error('PeerJS 错误:', err);
                this.updateStatus('连接失败，尝试备用方案...');
                this.tryFallbackConnection();
            });
            
        } catch (error) {
            console.error('创建房间失败:', error);
            this.updateStatus('连接失败，尝试备用方案...');
            this.tryFallbackConnection();
        }
    }
    
    // 备用连接方案
    tryFallbackConnection() {
        console.log('尝试使用默认PeerJS服务器...');
        
        // 使用默认的PeerJS服务器
        this.peer = new Peer(null, {
            debug: 2,
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });
        
        this.peer.on('open', (id) => {
            this.roomId = id;
            this.myPlayerId = `${this.playerName}_${Date.now()}`;
            
            // 添加自己到玩家列表
            this.players = [{
                id: this.myPlayerId,
                name: this.playerName,
                isHost: true,
                connected: true
            }];
            
            this.updateStatus('房间创建成功！等待其他玩家加入...');
            document.getElementById('myRoomId').textContent = id;
            document.getElementById('roomInfo').style.display = 'block';
            this.updatePlayerCount();
            
            console.log('备用连接成功，房间ID:', id);
        });
        
        this.peer.on('connection', (conn) => {
            this.handleNewConnection(conn);
        });
        
        this.peer.on('error', (err) => {
            console.error('备用连接也失败:', err);
            this.updateStatus('网络连接失败，请检查网络或稍后重试');
            alert('网络连接失败，可能是防火墙或网络环境问题。建议：\n1. 检查网络连接\n2. 尝试关闭防火墙\n3. 使用移动热点测试');
        });
    }
    
    // 加入房间
    async joinRoom() {
        const playerName = document.getElementById('playerName').value.trim();
        const roomId = document.getElementById('roomId').value.trim();
        
        if (!playerName) {
            alert('请输入您的昵称');
            return;
        }
        
        if (!roomId) {
            alert('请输入房间ID');
            return;
        }
        
        this.playerName = playerName;
        this.roomId = roomId;
        this.isHost = false;
        
        try {
            this.updateStatus('正在连接房间...');
            
            // 创建PeerJS实例
            this.peer = new Peer(null, {
                debug: 2,
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });
            
            this.peer.on('open', (id) => {
                this.myPlayerId = `${playerName}_${Date.now()}`;
                
                // 连接到房主
                const conn = this.peer.connect(roomId);
                
                conn.on('open', () => {
                    this.updateStatus('已连接到房间！');
                    
                    // 发送加入请求
                    conn.send({
                        type: 'join',
                        player: {
                            id: this.myPlayerId,
                            name: playerName,
                            isHost: false,
                            connected: true
                        }
                    });
                    
                    this.connections.push(conn);
                    this.setupConnectionEvents(conn);
                });
                
                conn.on('error', (err) => {
                    console.error('连接失败:', err);
                    this.updateStatus('连接房间失败，请检查房间ID');
                    alert('连接房间失败: ' + err.message);
                });
            });
            
            this.peer.on('error', (err) => {
                console.error('PeerJS连接失败:', err);
                this.updateStatus('网络连接失败，请检查网络');
                alert('网络连接失败，请检查网络连接');
            });
            
        } catch (error) {
            console.error('加入房间失败:', error);
            this.updateStatus('加入房间失败');
            alert('加入房间失败: ' + error.message);
        }
    }
    
    // 处理新连接
    handleNewConnection(conn) {
        console.log('新玩家连接:', conn.peer);
        
        conn.on('open', () => {
            this.connections.push(conn);
            this.setupConnectionEvents(conn);
        });
    }
    
    // 设置连接事件
    setupConnectionEvents(conn) {
        conn.on('data', (data) => {
            this.handleMessage(data, conn);
        });
        
        conn.on('close', () => {
            console.log('玩家断开连接:', conn.peer);
            this.handlePlayerDisconnect(conn);
        });
        
        conn.on('error', (err) => {
            console.error('连接错误:', err);
        });
    }
    
    // 处理消息
    handleMessage(data, conn) {
        console.log('收到消息:', data);
        
        switch (data.type) {
            case 'join':
                this.handlePlayerJoin(data.player, conn);
                break;
            case 'playerList':
                this.handlePlayerList(data.players);
                break;
            case 'gameStart':
                this.handleGameStart(data.gameState);
                break;
            case 'gameUpdate':
                this.handleGameUpdate(data.gameState);
                break;
            case 'playCards':
                this.handlePlayCards(data.cards, data.playerId);
                break;
            case 'pass':
                this.handlePass(data.playerId);
                break;
        }
    }
    
    // 处理玩家加入
    handlePlayerJoin(player, conn) {
        if (!this.isHost) return;
        
        // 检查房间是否已满
        if (this.players.length >= 3) {
            conn.send({
                type: 'error',
                message: '房间已满'
            });
            return;
        }
        
        // 添加玩家到列表
        this.players.push(player);
        this.updatePlayerCount();
        
        // 向所有玩家广播玩家列表
        this.broadcastToAll({
            type: 'playerList',
            players: this.players
        });
        
        console.log('玩家加入成功:', player.name);
        
        // 如果达到3人，可以开始游戏
        if (this.players.length === 3) {
            this.updateStatus('人数已满，可以开始游戏！');
        }
    }
    
    // 处理玩家列表更新
    handlePlayerList(players) {
        this.players = players;
        this.updatePlayerCount();
        this.updatePlayerUI();
        
        if (players.length === 3) {
            this.updateStatus('人数已满，等待房主开始游戏...');
        }
    }
    
    // 更新玩家数量显示
    updatePlayerCount() {
        document.getElementById('connectedPlayers').textContent = this.players.length;
    }
    
    // 更新玩家UI
    updatePlayerUI() {
        this.players.forEach((player, index) => {
            const nameElement = document.getElementById(`player${index + 1}Name`);
            const statusElement = document.getElementById(`player${index + 1}Status`);
            
            if (nameElement) {
                nameElement.textContent = player.name;
            }
            
            if (statusElement) {
                statusElement.textContent = player.connected ? '在线' : '离线';
                statusElement.className = 'online-status ' + (player.connected ? 'online' : 'offline');
            }
        });
    }
    
    // 开始新游戏
    startNewGame() {
        if (!this.isHost) {
            alert('只有房主可以开始游戏');
            return;
        }
        
        if (this.players.length < 2) {
            alert('至少需要2名玩家才能开始游戏');
            return;
        }
        
        // 创建初始游戏状态
        this.gameState = this.createInitialGameState();
        this.dealCards();
        
        // 广播游戏开始
        this.broadcastToAll({
            type: 'gameStart',
            gameState: this.gameState
        });
        
        // 显示游戏界面
        this.showGameContainer();
        this.updateGameUI();
    }
    
    // 创建初始游戏状态
    createInitialGameState() {
        return {
            currentPlayerIndex: 0,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                cards: []
            })),
            lastPlay: {
                cards: [],
                player: null
            },
            deck: [],
            gamePhase: 'playing'
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
        if (this.gameState.players.length >= 3) {
            this.gameState.players[0].cards = deck.splice(0, 6);
            this.gameState.players[1].cards = deck.splice(0, 5);
            this.gameState.players[2].cards = deck.splice(0, 5);
        } else {
            // 2人游戏
            this.gameState.players[0].cards = deck.splice(0, 8);
            this.gameState.players[1].cards = deck.splice(0, 8);
        }
        
        this.gameState.deck = deck;
    }
    
    // 处理游戏开始
    handleGameStart(gameState) {
        this.gameState = gameState;
        this.showGameContainer();
        this.updateGameUI();
    }
    
    // 处理游戏更新
    handleGameUpdate(gameState) {
        this.gameState = gameState;
        this.updateGameUI();
    }
    
    // 显示游戏容器
    showGameContainer() {
        document.getElementById('roomSelection').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'grid';
        document.getElementById('currentRoom').textContent = this.roomId;
    }
    
    // 更新游戏UI
    updateGameUI() {
        if (!this.gameState) return;
        
        // 找到当前玩家的手牌
        const myPlayer = this.gameState.players.find(p => p.id === this.myPlayerId);
        if (myPlayer) {
            this.displayCards('playerHand', myPlayer.cards);
            document.getElementById('playerCardCount').textContent = myPlayer.cards.length;
        }
        
        // 更新其他玩家信息
        this.gameState.players.forEach((player, index) => {
            const cardCountElement = document.getElementById(`player${index + 1}CardCount`);
            if (cardCountElement) {
                cardCountElement.textContent = player.cards.length;
            }
        });
        
        // 更新当前玩家
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        document.getElementById('currentPlayer').textContent = currentPlayer.name;
        document.getElementById('currentPlayerHint').textContent = currentPlayer.name;
        
        // 更新按钮状态
        const isMyTurn = currentPlayer.id === this.myPlayerId;
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
        playBtn.disabled = selectedCards.length === 0;
    }
    
    // 出牌
    playCards() {
        const selectedCardElements = document.querySelectorAll('#playerHand .card.selected');
        const selectedCards = Array.from(selectedCardElements).map(el => {
            const index = parseInt(el.dataset.cardIndex);
            const myPlayer = this.gameState.players.find(p => p.id === this.myPlayerId);
            return myPlayer.cards[index];
        });
        
        if (selectedCards.length === 0) return;
        
        // 广播出牌
        this.broadcastToAll({
            type: 'playCards',
            cards: selectedCards,
            playerId: this.myPlayerId
        });
        
        // 如果是房主，更新游戏状态
        if (this.isHost) {
            this.handlePlayCards(selectedCards, this.myPlayerId);
        }
    }
    
    // 处理出牌
    handlePlayCards(cards, playerId) {
        if (!this.isHost) return;
        
        const playerIndex = this.gameState.players.findIndex(p => p.id === playerId);
        const player = this.gameState.players[playerIndex];
        
        // 从手牌中移除出的牌
        cards.forEach(playedCard => {
            const index = player.cards.findIndex(card => 
                card.suit === playedCard.suit && card.value === playedCard.value
            );
            if (index !== -1) {
                player.cards.splice(index, 1);
            }
        });
        
        // 更新上次出牌
        this.gameState.lastPlay = {
            cards: cards,
            player: player.name
        };
        
        // 检查是否获胜
        if (player.cards.length === 0) {
            alert(`${player.name} 获胜！`);
            return;
        }
        
        // 切换到下一个玩家
        this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
        
        // 广播游戏状态更新
        this.broadcastToAll({
            type: 'gameUpdate',
            gameState: this.gameState
        });
        
        this.updateGameUI();
    }
    
    // 不要
    pass() {
        this.broadcastToAll({
            type: 'pass',
            playerId: this.myPlayerId
        });
        
        if (this.isHost) {
            this.handlePass(this.myPlayerId);
        }
    }
    
    // 处理不要
    handlePass(playerId) {
        if (!this.isHost) return;
        
        // 切换到下一个玩家
        this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
        
        // 广播游戏状态更新
        this.broadcastToAll({
            type: 'gameUpdate',
            gameState: this.gameState
        });
        
        this.updateGameUI();
    }
    
    // 广播消息给所有连接
    broadcastToAll(data) {
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.send(data);
            }
        });
    }
    
    // 更新状态
    updateStatus(status) {
        document.getElementById('statusText').textContent = status;
    }
    
    // 离开房间
    leaveRoom() {
        if (this.peer) {
            this.peer.destroy();
        }
        
        this.connections.forEach(conn => {
            conn.close();
        });
        
        this.connections = [];
        this.isHost = false;
        this.roomId = null;
        this.players = [];
        this.gameState = null;
        
        // 回到房间选择界面
        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('roomSelection').style.display = 'flex';
        document.getElementById('roomInfo').style.display = 'none';
        
        this.updateStatus('已离开房间');
    }
    
    // 处理玩家断开连接
    handlePlayerDisconnect(conn) {
        this.connections = this.connections.filter(c => c !== conn);
        
        if (this.isHost) {
            // 从玩家列表中移除断开的玩家
            this.players = this.players.filter(p => p.connected);
            this.updatePlayerCount();
            
            // 广播更新后的玩家列表
            this.broadcastToAll({
                type: 'playerList',
                players: this.players
            });
        }
    }
}

// 初始化简单联机
const simpleMultiplayer = new SimpleMultiplayer(); 
