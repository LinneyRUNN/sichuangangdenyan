class SichuanGanDengYan {
    constructor() {
        this.suits = ['♠', '♥', '♦', '♣'];
        this.values = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
        this.valueOrder = { '3': 0, '4': 1, '5': 2, '6': 3, '7': 4, '8': 5, '9': 6, '10': 7, 'J': 8, 'Q': 9, 'K': 10, 'A': 11, '2': 12 };
        
        this.deck = [];
        this.players = [
            { id: 0, name: '玩家1', hand: [], isHuman: true },
            { id: 1, name: '玩家2', hand: [], isHuman: true },
            { id: 2, name: '玩家3', hand: [], isHuman: true }
        ];
        
        this.currentPlayer = 0;
        this.lastPlay = null;
        this.lastPlayer = null;
        this.selectedCards = [];
        this.gameWinner = null;
        this.passCount = 0;
        
        this.initGame();
        this.setupEventListeners();
    }
    
    initGame() {
        this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        this.updateDisplay();
        this.currentPlayer = 0; // 玩家1先出（有6张牌的玩家）
        this.updateCurrentPlayer();
    }
    
    createDeck() {
        this.deck = [];
        for (let suit of this.suits) {
            for (let value of this.values) {
                this.deck.push({
                    suit: suit,
                    value: value,
                    order: this.valueOrder[value],
                    color: (suit === '♥' || suit === '♦') ? 'red' : 'black'
                });
            }
        }
    }
    
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
    
    dealCards() {
        // 重置玩家手牌
        this.players.forEach(player => player.hand = []);
        
        // 玩家1(获胜者)获得6张牌，其他人5张
        for (let i = 0; i < 6; i++) {
            this.players[0].hand.push(this.deck.pop());
        }
        for (let i = 0; i < 5; i++) {
            this.players[1].hand.push(this.deck.pop());
            this.players[2].hand.push(this.deck.pop());
        }
        
        // 排序手牌
        this.players.forEach(player => {
            player.hand.sort((a, b) => a.order - b.order);
        });
    }
    
    setupEventListeners() {
        // 出牌按钮
        document.getElementById('playCardsBtn').addEventListener('click', () => {
            this.playSelectedCards();
        });
        
        // 不要按钮
        document.getElementById('passBtn').addEventListener('click', () => {
            this.pass();
        });
        
        // 新游戏按钮
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.resetGame();
        });
        
        // 重新开始按钮
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.hideGameResult();
            this.resetGame();
        });
        
        // 规则切换
        document.getElementById('rulesToggle').addEventListener('click', () => {
            const content = document.getElementById('rulesContent');
            content.style.display = content.style.display === 'block' ? 'none' : 'block';
        });
    }
    
    updateDisplay() {
        this.updatePlayerHands();
        this.updateDeckCount();
        this.updateCardCounts();
    }
    
    updatePlayerHands() {
        // 显示所有玩家的手牌（都可见）
        
        // 玩家1手牌 (左侧)
        const player1Hand = document.getElementById('player1Hand');
        player1Hand.innerHTML = '';
        this.players[0].hand.forEach((card, index) => {
            const cardElement = this.createCardElement(card, true);
            if (this.currentPlayer === 0) {
                cardElement.addEventListener('click', () => this.selectCard(index));
            } else {
                cardElement.style.opacity = '0.7';
            }
            player1Hand.appendChild(cardElement);
        });
        
        // 玩家2手牌 (上方)
        const player2Hand = document.getElementById('player2Hand');
        player2Hand.innerHTML = '';
        this.players[1].hand.forEach((card, index) => {
            const cardElement = this.createCardElement(card, true);
            if (this.currentPlayer === 1) {
                cardElement.addEventListener('click', () => this.selectCard(index));
            } else {
                cardElement.style.opacity = '0.7';
            }
            player2Hand.appendChild(cardElement);
        });
        
        // 玩家3手牌 (下方)
        const player3Hand = document.getElementById('playerHand');
        player3Hand.innerHTML = '';
        this.players[2].hand.forEach((card, index) => {
            const cardElement = this.createCardElement(card, true);
            if (this.currentPlayer === 2) {
                cardElement.addEventListener('click', () => this.selectCard(index));
            } else {
                cardElement.style.opacity = '0.7';
            }
            player3Hand.appendChild(cardElement);
        });
    }
    
    createCardElement(card, showFace = true) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.color}`;
        
        if (showFace) {
            cardElement.innerHTML = `
                <div class="card-value">${card.value}</div>
                <div class="card-suit">${card.suit}</div>
                <div class="card-value" style="transform: rotate(180deg);">${card.value}</div>
            `;
        } else {
            cardElement.className = 'card card-back';
            cardElement.innerHTML = '牌背';
        }
        
        return cardElement;
    }
    
    createCardBackElement() {
        const cardElement = document.createElement('div');
        cardElement.className = 'card card-back';
        cardElement.innerHTML = '牌背';
        return cardElement;
    }
    
    selectCard(index) {
        // 只能选择当前玩家的牌
        const cardIndex = this.selectedCards.indexOf(index);
        if (cardIndex > -1) {
            this.selectedCards.splice(cardIndex, 1);
        } else {
            this.selectedCards.push(index);
        }
        
        this.updateCardSelection();
        this.updatePlayButton();
    }
    
    updateCardSelection() {
        // 清除所有选择状态
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // 根据当前玩家更新选择状态
        let targetSelector = '';
        if (this.currentPlayer === 0) {
            targetSelector = '#player1Hand .card';
        } else if (this.currentPlayer === 1) {
            targetSelector = '#player2Hand .card';
        } else {
            targetSelector = '#playerHand .card';
        }
        
        const playerCards = document.querySelectorAll(targetSelector);
        playerCards.forEach((card, index) => {
            if (this.selectedCards.includes(index)) {
                card.classList.add('selected');
            }
        });
    }
    
    updatePlayButton() {
        const playBtn = document.getElementById('playCardsBtn');
        const canPlay = this.selectedCards.length > 0 && this.isValidPlay();
        playBtn.disabled = !canPlay;
    }
    
    isValidPlay() {
        if (this.selectedCards.length === 0) return false;
        
        const selectedCards = this.selectedCards.map(i => this.players[this.currentPlayer].hand[i]);
        const playType = this.getPlayType(selectedCards);
        
        if (!playType) return false;
        
        if (!this.lastPlay) return true; // 第一次出牌
        
        return this.canBeat(selectedCards, playType, this.lastPlay.cards, this.lastPlay.type);
    }
    
    getPlayType(cards) {
        if (cards.length === 0) return null;
        
        cards.sort((a, b) => a.order - b.order);
        
        if (cards.length === 1) {
            return { type: 'single', cards: cards };
        }
        
        if (cards.length === 2) {
            if (cards[0].order === cards[1].order) {
                return { type: 'pair', cards: cards };
            }
            return null;
        }
        
        if (cards.length >= 3) {
            // 检查是否为炸弹（三张或以上相同）
            const sameValueCount = {};
            cards.forEach(card => {
                sameValueCount[card.order] = (sameValueCount[card.order] || 0) + 1;
            });
            
            const counts = Object.values(sameValueCount);
            if (counts.length === 1 && counts[0] >= 3) {
                return { type: 'bomb', cards: cards };
            }
            
            // 检查是否为顺子
            if (this.isStraight(cards)) {
                return { type: 'straight', cards: cards };
            }
        }
        
        return null;
    }
    
    isStraight(cards) {
        if (cards.length < 3) return false;
        
        // 2不能参与顺子
        if (cards.some(card => card.order === 12)) return false;
        
        for (let i = 1; i < cards.length; i++) {
            if (cards[i].order !== cards[i-1].order + 1) {
                return false;
            }
        }
        return true;
    }
    
    canBeat(newCards, newType, lastCards, lastType) {
        console.log('=== canBeat 调试信息 ===');
        console.log('新牌:', newCards.map(c => c.value + c.suit));
        console.log('新牌类型:', newType.type);
        console.log('上次牌:', lastCards.map(c => c.value + c.suit));
        console.log('上次类型:', lastType);
        console.log('lastType是否为undefined:', lastType === undefined);
        
        // 如果lastType是undefined，说明数据有问题
        if (!lastType) {
            console.log('错误：lastType为空，返回false');
            return false;
        }
        
        // 详细显示牌的order值
        console.log('新牌order值:', newCards.map(c => `${c.value}=${c.order}`));
        console.log('上次牌order值:', lastCards.map(c => `${c.value}=${c.order}`));
        
        const newMax = Math.max(...newCards.map(c => c.order));
        const lastMax = Math.max(...lastCards.map(c => c.order));
        console.log('新牌最大order:', newMax, '上次最大order:', lastMax);
        
        // 规则1：如果上次出的是2，不能被任何牌接
        if (lastCards.some(card => card.order === 12)) {
            console.log('上次包含2，不能被任何牌接');
            return false;
        }
        
        // 规则2：2可以接任何非2的牌
        if (newCards.some(card => card.order === 12)) {
            console.log('新牌包含2，可以接任何非2的牌');
            return true;
        }
        
        // 规则3：炸弹可以接任何非炸弹、非2的牌型
        if (newType.type === 'bomb' && lastType !== 'bomb') {
            console.log('炸弹接非炸弹非2牌型，可以接');
            return true;
        }
        
        // 规则4：根据上次出牌类型应用底层规则
        if (lastType === 'single') {
            console.log('上次出单牌，应用单牌规则');
            // 单牌只能被相应的对子和比大一张的牌接还有2和炸弹接
            if (newType.type === 'single') {
                // 比大一张的牌
                const result = newMax === lastMax + 1;
                console.log(`单牌接单牌：${newMax} === ${lastMax} + 1 = ${result}`);
                return result;
            } else if (newType.type === 'pair') {
                // 相应的对子
                const result = newMax === lastMax;
                console.log(`对子接单牌：${newMax} === ${lastMax} = ${result}`);
                return result;
            } else if (newType.type === 'bomb') {
                console.log('炸弹接单牌，可以接');
                return true;
            } else {
                console.log('其他类型不能接单牌');
                return false;
            }
        } else if (lastType === 'pair') {
            console.log('上次出对子，应用对子规则');
            // 对子只能被比大一张的对子、2、炸弹接
            if (newType.type === 'pair') {
                const result = newMax === lastMax + 1;
                console.log(`对子接对子：${newMax} === ${lastMax} + 1 = ${result}`);
                return result;
            } else if (newType.type === 'bomb') {
                console.log('炸弹接对子，可以接');
                return true;
            } else {
                console.log('其他类型不能接对子');
                return false;
            }
        } else if (lastType === 'straight') {
            console.log('上次出顺子，应用顺子规则');
            // 顺子只能被下一个连续的同长度顺子或炸弹接
            if (newType.type === 'straight') {
                if (newCards.length !== lastCards.length) {
                    console.log('顺子长度不同，不能接');
                    return false;
                }
                const result = newMax === lastMax + 1;
                console.log(`顺子接顺子：${newMax} === ${lastMax} + 1 = ${result}`);
                return result;
            } else if (newType.type === 'bomb') {
                console.log('炸弹接顺子，可以接');
                return true;
            } else {
                console.log('其他类型不能接顺子');
                return false;
            }
        } else if (lastType === 'bomb') {
            console.log('上次出炸弹，应用炸弹规则');
            // 炸弹只能被更大的炸弹接
            if (newType.type === 'bomb') {
                if (newCards.length > lastCards.length) {
                    console.log('更多张数的炸弹，可以接');
                    return true;
                } else if (newCards.length === lastCards.length) {
                    const result = newMax > lastMax;
                    console.log(`同张数炸弹比较大小：${newMax} > ${lastMax} = ${result}`);
                    return result;
                } else {
                    console.log('炸弹张数较少，不能接');
                    return false;
                }
            } else {
                console.log('非炸弹不能接炸弹');
                return false;
            }
        }
        
        console.log('未知牌型，不能接');
        return false;
    }
    
    playSelectedCards() {
        if (this.selectedCards.length === 0) return;
        
        const currentPlayerObj = this.players[this.currentPlayer];
        const cards = this.selectedCards.map(i => currentPlayerObj.hand[i]);
        const playType = this.getPlayType(cards);
        
        if (!playType || (this.lastPlay && !this.canBeat(cards, playType, this.lastPlay.cards, this.lastPlay.type))) {
            alert('无效的出牌！');
            return;
        }
        
        console.log(`${currentPlayerObj.name}出牌:`, cards.map(c => c.value + c.suit), `类型: ${playType.type}`);
        console.log('playType对象:', playType);
        
        // 移除选中的牌
        this.selectedCards.sort((a, b) => b - a); // 从大到小排序，避免索引问题
        this.selectedCards.forEach(index => {
            currentPlayerObj.hand.splice(index, 1);
        });
        
        this.lastPlay = {
            cards: cards,
            type: playType.type,  // 确保这里是字符串
            player: this.currentPlayer
        };
        this.lastPlayer = this.currentPlayer;
        this.passCount = 0;
        
        console.log('保存的lastPlay:', this.lastPlay);
        
        this.updateLastPlay();
        this.selectedCards = [];
        
        // 检查是否获胜
        if (currentPlayerObj.hand.length === 0) {
            this.gameWinner = this.currentPlayer;
            this.showGameResult();
            return;
        }
        
        this.nextPlayer();
        this.updateDisplay();
    }
    
    pass() {
        console.log(`${this.players[this.currentPlayer].name}选择不要`);
        this.passCount++;
        
        // 如果两个玩家都不要，则重新摸牌
        if (this.passCount >= 2) {
            console.log('所有人都不要，重新摸牌');
            this.dealNewCards();
            this.passCount = 0;
            // 上次出牌的玩家继续出牌
            this.currentPlayer = this.lastPlayer || 0; // 如果没有lastPlayer，默认玩家1出牌
            this.lastPlay = null;
            this.lastPlayer = null;
            this.updateLastPlay();
            this.updateCurrentPlayer();
        } else {
            this.nextPlayer();
        }
        
        this.updateDisplay();
    }
    
    dealNewCards() {
        // 每人摸一张牌
        for (let player of this.players) {
            if (this.deck.length > 0) {
                player.hand.push(this.deck.pop());
                player.hand.sort((a, b) => a.order - b.order);
            }
        }
    }
    
    nextPlayer() {
        this.currentPlayer = (this.currentPlayer + 1) % 3;
        this.selectedCards = []; // 清空选择
        this.updateCurrentPlayer();
        this.updateDisplay();
    }
    
    updateLastPlay() {
        const lastPlayedCards = document.getElementById('lastPlayedCards');
        const lastPlayer = document.getElementById('lastPlayer');
        
        if (this.lastPlay) {
            lastPlayedCards.innerHTML = '';
            this.lastPlay.cards.forEach(card => {
                const cardElement = this.createCardElement(card, true);
                cardElement.classList.add('card-play');
                lastPlayedCards.appendChild(cardElement);
            });
            lastPlayer.textContent = this.players[this.lastPlay.player].name;
        } else {
            lastPlayedCards.innerHTML = '';
            lastPlayer.textContent = '-';
        }
    }
    
    updateCurrentPlayer() {
        document.getElementById('currentPlayer').textContent = this.players[this.currentPlayer].name;
        document.getElementById('currentPlayerHint').textContent = this.players[this.currentPlayer].name;
        this.updatePlayButton();
    }
    
    updateDeckCount() {
        document.getElementById('deckCount').textContent = this.deck.length;
    }
    
    updateCardCounts() {
        document.getElementById('player1CardCount').textContent = this.players[0].hand.length;
        document.getElementById('player2CardCount').textContent = this.players[1].hand.length;
        document.getElementById('playerCardCount').textContent = this.players[2].hand.length;
    }
    
    showGameResult() {
        const modal = document.getElementById('gameResultModal');
        const title = document.getElementById('gameResultTitle');
        const message = document.getElementById('gameResultMessage');
        
        title.textContent = '游戏结束';
        message.textContent = `${this.players[this.gameWinner].name} 获胜！`;
        
        modal.style.display = 'block';
    }
    
    hideGameResult() {
        document.getElementById('gameResultModal').style.display = 'none';
    }
    
    resetGame() {
        this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        this.currentPlayer = 0;
        this.lastPlay = null;
        this.lastPlayer = null;
        this.selectedCards = [];
        this.gameWinner = null;
        this.passCount = 0;
        
        this.updateDisplay();
        this.updateCurrentPlayer();
        this.updateLastPlay();
    }
}

// 启动游戏
const game = new SichuanGanDengYan(); 