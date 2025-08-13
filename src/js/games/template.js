//game template

//game state variables and constants
//let score = 0, lives = 3;
// const STUFF = {}

export default {
  init({ r, Key, screenWidth, screenHeight, gameFont }) {
    // set up your entities and HUD font reference
    this.r = r;
    this.Key = Key;
    this.font = gameFont;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    initGameData();  // build bricks, paddle, ball, reset score/lives
  },

  titleUpdate(dt) {
    // optional title-screen logic (e.g. animate background)
  },

  titleDraw() {
    // optional title-screen draw (e.g. "Press any key")
    this.r.clear(0, this.r.SCREEN);
    this.font.drawText('Game Title\nPress Click', 50, 120);
  },

  update(dt) {
    
  },

  draw() {
    // draw bricks, paddle, ball, HUD
  },

  gameOverUpdate(dt) {
    // optional logic on game over (e.g. blinking text)
  },

  gameOverDraw() {
    this.r.clear(0, this.r.SCREEN);
    this.font.drawText(`Game Over\nScore: ${score}\nClick to Restart`,
                       60, 100);
  }
};

// then implement your game classes
// initGameData(), update, draw, etc.
