const socket = io("http://localhost:3000");

class TycoonScene extends Phaser.Scene {
  create() {
    // Example card
    const card = this.add.text(200, 200, "3♣", { fontSize: "40px" })
      .setInteractive()
      .on("pointerdown", () => {
        socket.emit("playCard", { rank: 3, suit: "clubs" });
      });

    socket.on("cardPlayed", (data) => {
      console.log("Someone played:", data);
    });
  }
}
