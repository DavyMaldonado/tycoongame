import Phaser from "phaser";
import { insertCoin, onPlayerJoin, isHost, myPlayer } from "playroomkit";

const JOKER_RANK = 16;
const MIN_RANK = 3;
const MAX_RANK = 15;

class TycoonScene extends Phaser.Scene {
    constructor() {
        super();
        this.deck = [];
        this.hands = [];
        this.table = [];
        this.selectedCards = [];
        this.selectedRank = null;
        this.handImages = [];
        this.tableImages = [];
        this.statusText = null;

        this.currentPlayer = 0;
        this.lastPlayerToPlay = undefined;
        this.passesSinceLastPlay = 0;
        this.newRoundStarter = null;

        this.revolution = false;
        this.frames = {};
        this.cardWidth = 147;
        this.cardHeight = 240;

        this.myIndex = null; // my player index (0-3)
    }

    preload() {
        this.load.image('cardsheet', 'https://davymaldonado.github.io/tycoongame/cards.png');
        this.load.image('background', 'https://davymaldonado.github.io/tycoongame/background.png');
    }

    create() {
        this.add.image(1280/2, 720/2, 'background').setOrigin(0.5,0.5).setDepth(-1).setAlpha(0.6);

        // Playroom: assign myIndex when we join
        onPlayerJoin(player => {
            this.addPlayer(player); // make sure addPlayer assigns an index 0–3
        
            // If the joined player is the local player, store myIndex
            if(player.id === myPlayer.id) {
                this.myIndex = player.index;
            }
        });

        // Initialize card frames
        this.initCardFrames();
        
        this.initDeck();
        this.dealCards(4);
        this.renderAllHands();

        this.statusText = this.add.text(20, 20, "Player 0's turn", { fontSize: "20px", color: "#fff" });

        this.passBtn = this.add.text(50, 450, "[ PASS ]", {fontSize:"28px", color:"#f44", backgroundColor:"#222", padding:{x:10,y:5}})
            .setInteractive().on("pointerdown", ()=>this.playerPass());

        this.playBtn = this.add.text(200, 450, "[ PLAY ]", {fontSize:"28px", color:"#4f4", backgroundColor:"#222", padding:{x:10,y:5}})
            .setInteractive().on("pointerdown", ()=>this.playerAttemptPlay());
    }

    initCardFrames() {
        const leftMargin = 11;
        const topGap = 3;
        const columnGap = 22; 
        const rowGap = 4;     
        const suits = ['♣','♦','♥','♠'];

        // Standard cards (rows 0–3)
        const ranks = [14,2,3,4,5,6,7,8,9,10,11,12]; 
        for(let r=0; r<4; r++){          
            const suit = suits[r];
            for(let c=0; c<12; c++){       
                const x = leftMargin + c * (this.cardWidth + columnGap);
                const y = topGap + r * (this.cardHeight + rowGap);
                const key = `${ranks[c]}${suit}`;
                this.frames[key] = {x, y, width: this.cardWidth, height: this.cardHeight};
            }
        }

        // Special row
        const specialRowIndex = 4; 
        const specialCols = ['Joker','Joker','Back','K♣','K♦','K♥','K♠'];
        specialCols.forEach((key, colIndex)=>{
            const x = leftMargin + colIndex * (this.cardWidth + columnGap);
            const y = topGap + specialRowIndex * (this.cardHeight + rowGap);
            this.frames[key] = {x, y, width: this.cardWidth, height: this.cardHeight};
        });
    }

    createCardImage(card, x, y) {
        let frameKey;

        if (card.rank === JOKER_RANK) frameKey = 'Joker';
        else if (card.rank === 13) frameKey = `K${card.suit}`;
        else if (card.rank === 11 || card.rank === 12) frameKey = `${card.rank}${card.suit}`;
        else if (card.rank === 14) frameKey = `14${card.suit}`;
        else if (card.rank === 15) frameKey = `2${card.suit}`;
        else frameKey = `${card.rank}${card.suit}`;

        const frame = this.frames[frameKey];
        if (!frame) return null;

        const { x: frameX, y: frameY, width, height } = frame;
        const textureKey = `card_${frameX}_${frameY}`;

        if (!this.textures.exists(textureKey)) {
            const img = this.textures.get('cardsheet').getSourceImage();
            const canvas = this.textures.createCanvas(textureKey, width, height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, frameX, frameY, width, height, 0, 0, width, height);
            canvas.refresh();
        }

        return this.add.image(x, y, textureKey).setOrigin(0.5, 0.5).setScale(0.4);
    }


    initDeck() {
        const suits=["♠","♥","♦","♣"];
        this.deck=[];
        for(let s of suits) for(let r=MIN_RANK;r<=MAX_RANK;r++) this.deck.push({rank:r,suit:s});
        this.deck.push({rank:JOKER_RANK,suit:"🃏"});
        this.deck.push({rank:JOKER_RANK,suit:"🃏"});
        Phaser.Utils.Array.Shuffle(this.deck);
    }

    dealCards(numPlayers){
        this.hands=Array.from({length:numPlayers},()=>[]);
        let i=0;
        while(this.deck.length>0){ this.hands[i%numPlayers].push(this.deck.pop()); i++; }
        this.hands.forEach(hand=>hand.sort((a,b)=>a.rank-b.rank));
    }

    cardToString(card){
        const ranks={11:"J",12:"Q",13:"K",14:"A",15:"2",16:"Joker"};
        return (ranks[card.rank]||card.rank)+card.suit;
    }

    

    renderAllHands() {
        if(this.handImages) this.handImages.forEach(img=>img.destroy());
        this.handImages = [];

        const yPositions = [100, 200, 300, 400];

        for(let player=0; player<4; player++){
            let hand = this.sortHandTycoonOrder(this.hands[player]);

            hand.forEach((card, i)=>{
                const x = 50 + i*30;
                const y = yPositions[player];
                
                const img = this.createCardImage(card, x, y);
                if (!img) return;
                
                img.cardRef = card;
                img.playerRef = player;

                // Only allow interaction for your own hand on your turn
                if(player === this.myIndex && player === this.currentPlayer){
                    img.setInteractive();
                    img.on("pointerdown", ()=> this.toggleSelect(card));
                }

                this.handImages.push(img);
            });
        }
        this.renderHandHighlights();
    }

    sortHandTycoonOrder(hand) {
        const tycoonOrder = [3,4,5,6,7,8,9,10,11,12,13,14,15,16]; 
        const rankMap = {};
        tycoonOrder.forEach((r,i)=> rankMap[r]=i);

        return [...hand].sort((a,b)=>{
            if(a.rank === b.rank) {
                const suitOrder = ['♣','♦','♥','♠'];
                return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
            }
            return rankMap[a.rank] - rankMap[b.rank];
        });
    }

    rankValue(rank){
        if(rank === JOKER_RANK) return this.revolution ? 20 : 20;
        if(this.revolution){
            const order = [15,14,13,12,11,10,9,8,7,6,5,4,3];
            return order.indexOf(rank) + 1;
        } else {
            return rank;
        }
    }

    toggleSelect(card){
        if(!this.hands[this.currentPlayer].includes(card)) return;

        let idx = this.selectedCards.indexOf(card);
        if(idx >= 0){
            this.selectedCards.splice(idx,1);
            if(this.selectedCards.length===0) this.selectedRank=null;
        } else {
            if(this.selectedCards.length >= 4) return;
            if(this.selectedCards.length === 0) {
                if(card.rank !== JOKER_RANK) this.selectedRank = card.rank;
                this.selectedCards.push(card);
            } else if(card.rank === this.selectedRank || card.rank === JOKER_RANK) {
                this.selectedCards.push(card);
            }
        }
        this.renderHandHighlights();
    }

    renderHandHighlights() {
        this.handImages.forEach(img => {
            const card = img.cardRef;
            const player = img.playerRef;
    
            // Base tint by player
            const baseTints = [0xffffff, 0xa0cfff, 0xa0ffa0, 0xd0a0ff];
            let tint = baseTints[player];
    
            img.y = (player === 0) ? 100 : (player === 1) ? 200 : (player === 2) ? 300 : 400;
    
            // Highlight selected cards
            if(this.selectedCards.includes(card)){
                tint = 0xdaa520;
                img.y -= 10;
            }
    
            // Playability check
            let playable = true;
            const topSet = this.getTopTableSet();
            const hand = this.hands[player];
    
            if(topSet && topSet.length > 0){
                const topCard = topSet[0];
                if(topCard.rank === JOKER_RANK && (card.rank !== 3 || card.suit !== "♠")) playable = false;
            }
    
            if(topSet && card.rank !== JOKER_RANK){
                const neededCount = topSet.length;
                const rankCount = hand.filter(c=>c.rank===card.rank).length;
                const jokerCount = hand.filter(c=>c.rank===JOKER_RANK).length;
                if(rankCount + jokerCount < neededCount) playable = false;
    
                const topRank = Math.max(...topSet.filter(c=>c.rank!==JOKER_RANK).map(c=>this.rankValue(c.rank)));
                const playRank = this.rankValue(card.rank);
                if(playRank <= topRank) playable = false;
            }
    
            if(player === this.currentPlayer && player === this.myIndex){
                if(this.selectedCards.length > 0 && !this.selectedCards.includes(card)){
                    if(card.rank !== this.selectedRank && card.rank !== JOKER_RANK) playable = false;
                }
            } else {
                playable = false;
            }
    
            // Apply tints and interaction
            if(playable){
                img.setAlpha(1);
                img.setTint(tint);
                if(player === this.currentPlayer && player === this.myIndex) img.setInteractive();
            } else {
                img.setAlpha(0.5);
                img.setTint(tint);
                img.disableInteractive();
            }
        });
    
        // Show whose turn it is, and "Your Turn" for local player
        if(this.statusText){
            if(this.currentPlayer === this.myIndex){
                this.statusText.setText(`Your Turn (Player ${this.currentPlayer})`);
            } else {
                this.statusText.setText(`Player ${this.currentPlayer}'s Turn`);
            }
        }
    }

    getTopTableSet() {
        if(this.table.length === 0) return null;
        return this.table[this.table.length - 1];
    }

    playerAttemptPlay() {
        if(this.selectedCards.length === 0) return;

        if(this.selectedCards.length > 4){
            this.statusText.setText("Invalid! You cannot play more than 4 cards.");
            return;
        }

        const nonJokers = this.selectedCards.filter(c => c.rank !== JOKER_RANK);
        if (nonJokers.length > 0) {
            const baseRank = nonJokers[0].rank;
            if (!nonJokers.every(c => c.rank === baseRank)) {
                this.statusText.setText("Invalid set! All non-Joker cards must match.");
                return;
            }
        }

        const topSet = this.getTopTableSet();
        if (topSet) {
            if (topSet.length !== this.selectedCards.length) {
                this.statusText.setText(`Invalid set! Must play ${topSet.length} cards.`);
                return;
            }
            const topRank = Math.max(...topSet.filter(c=>c.rank!==JOKER_RANK).map(c=>this.rankValue(c.rank)));
            const playRank = nonJokers.length > 0 ? Math.max(...nonJokers.map(c=>this.rankValue(c.rank))) : this.rankValue(JOKER_RANK);
            if(playRank <= topRank){
                this.statusText.setText("Invalid set! Must beat the previous set.");
                return;
            }
        }

        // Revolution check
        const baseRank = nonJokers.length > 0 ? nonJokers[0].rank : null;
        if (this.selectedCards.length === 4 && baseRank !== null) {
            const countSame = nonJokers.filter(c=>c.rank===baseRank).length + this.selectedCards.filter(c=>c.rank===JOKER_RANK).length;
            if (countSame === 4) {
                this.revolution = !this.revolution;
                this.statusText.setText(`Revolution! Player ${this.currentPlayer} flipped the order!`);
            }
        }

        this.table.push(this.selectedCards.slice());
        this.hands[this.currentPlayer] = this.hands[this.currentPlayer].filter(c => !this.selectedCards.includes(c));
        const playedCards = this.selectedCards.slice();
        this.selectedCards = [];
        this.selectedRank = null;

        this.renderAllHands();
        this.renderTable();

        this.lastPlayerToPlay = this.currentPlayer;
        this.passesSinceLastPlay = 0;

        const playedRanks = playedCards.map(c => c.rank);
        const topTableBefore = topSet ? topSet[0] : null;
        let clearTable = false;

        if (playedRanks.includes(8)) clearTable = true;
        if (topTableBefore && topTableBefore.rank === JOKER_RANK) {
            if (playedCards.length === 1 && playedCards[0].rank === 3 && playedCards[0].suit === "♠") {
                clearTable = true;
            }
        }

        if (clearTable) {
            this.statusText.setText(`Table cleared by Player ${this.currentPlayer}!`);
            this.table = [];
            this.tableImages.forEach(t => t.destroy());
            this.tableImages = [];
            this.newRoundStarter = this.currentPlayer;
        }

        this.nextTurn();
    }

    playerPass() {
        this.statusText.setText(`Player ${this.currentPlayer} passed`);
        this.selectedCards = [];
        this.selectedRank = null;

        if (this.lastPlayerToPlay !== undefined) {
            this.passesSinceLastPlay = (this.passesSinceLastPlay || 0) + 1;

            if (this.passesSinceLastPlay >= this.hands.length - 1) {
                this.statusText.setText(`Table cleared after full pass circle by Player ${this.lastPlayerToPlay}!`);
                this.table = [];
                this.tableImages.forEach(t => t.destroy());
                this.tableImages = [];
                this.passesSinceLastPlay = 0;
                this.newRoundStarter = this.lastPlayerToPlay;
            }
        }

        this.nextTurn();
    }

    nextTurn(){
        if (this.newRoundStarter !== null) {
            this.currentPlayer = this.newRoundStarter;
            this.newRoundStarter = null;
        } else {
            let loops = 0;
            do {
                this.currentPlayer = (this.currentPlayer + 1) % this.hands.length;
                loops++;
                if(this.hands[this.currentPlayer].length === 0 && this.lastPlayerToPlay !== undefined){
                    this.passesSinceLastPlay++;
                }
            } while(this.hands[this.currentPlayer].length === 0 && loops <= this.hands.length);
        }
        this.statusText.setText(`Player ${this.currentPlayer}'s turn`);
        this.renderAllHands();
    }

    renderTable(){
        if(this.tableImages) this.tableImages.forEach(img=>img.destroy());
        this.tableImages = [];
        const yBase = 500;
        
        this.table.forEach((set, idx)=>{
            set.forEach((card, i)=>{
                const x = 500 + i*30;
                const y = yBase - idx*30;
                
                const img = this.createCardImage(card, x, y);
                if (img) {
                    this.tableImages.push(img);
                }
            });
        });
    }
}


// Phaser config
const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    backgroundColor: "#1d1d1d",
    scene: TycoonScene,
    parent: "game-container",
  };
  
  insertCoin({ gameId: "4gVobSeZ3fy58Vn270PF", discord: true }).then(() => {
    new Phaser.Game(config);
  });
  
  function resizeGame(){
    const container = document.getElementById("game-container");
    const canvas = container.querySelector("canvas");
    const scale = Math.min(container.clientWidth/1280, container.clientHeight/720);
    const offsetX = (container.clientWidth - 1280*scale)/2;
    const offsetY = (container.clientHeight - 720*scale)/2;
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  }
  window.addEventListener("resize", resizeGame);
  window.addEventListener("load", resizeGame);