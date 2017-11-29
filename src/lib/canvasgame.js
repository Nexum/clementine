/**
 * @type {PIXI}
 */
window.PIXI = require('phaser/build/custom/pixi');
/**
 * @type {World}
 */
window.p2 = require('phaser/build/custom/p2');
/**
 * @type {Phaser}
 */
window.Phaser = require('phaser/build/custom/phaser-split');

module.exports = class CanvasGame {

    constructor(size, start, end, id, finishCb) {
        if (this.isNear(start.x - 2, 0)) {
            start.x = 0;
        }
        if (this.isNear(start.x + 2, size)) {
            start.x = size - 2;
        }

        if (this.isNear(start.y - 2, 0)) {
            start.y = 0;
        }

        if (this.isNear(start.y + 2, size)) {
            start.y = size - 2;
        }

        this.pointerOffsetX = 0;
        this.pointerOffsetY = 0;
        this.start = start;
        this.end = end;
        this.size = size;
        this.finishCb = finishCb;
        this.paintData = [];
        this.backgroundColor = "#ffffff";
        this.endColor = "#ffa739";
        this.resetTimeout = null;
        this.startColor = "#000000";
        this.paintColor = "#000000";
        this.paintTimeout = null;
        this.finished = false;
        this.painting = false;
        this.game = new Phaser.Game(this.size, this.size, Phaser.AUTO, id, {
            preload: this._preload.bind(this),
            create: this._create.bind(this),
            update: this._update.bind(this)
        });
    }

    debug() {
        if (typeof console !== "undefined" && console.log) {
            console.log.apply(console, arguments);
        }
    }

    paint(x, y, color, bitmap, width) {
        width = width || 2;
        bitmap = bitmap || this.bitmap;
        color = color || this.paintColor;
        bitmap.rect(x, y, width, width * 2, color);
    }

    isNear(pos, target, precision) {
        precision = precision || 2;
        return Math.abs(pos - target) <= precision;
    }

    onMove(pointer, x, y) {
        x = Math.floor(x);
        y = Math.floor(y);

        if (this.finished) {
            return;
        }

        if (pointer.isDown) {
            if (!this.painting) {
                this.painting = true;
                this.pointerOffsetX = this.start.x - x;
                this.pointerOffsetY = this.start.y - y;
            } else {
                let lastPaint = this.paintData[this.paintData.length - 1];
                if (lastPaint && this.resetTimeout) {
                    this.pointerOffsetX = lastPaint[0] - x;
                    this.pointerOffsetY = lastPaint[1] - y;
                }
            }

            if (this.resetTimeout) {
                clearTimeout(this.resetTimeout);
                this.resetTimeout = null;
            }

            let realX = x + this.pointerOffsetX;
            let realY = y + this.pointerOffsetY;

            if (realX < -1 || realX > this.size || realY > this.size || realY < -1) {
                this._resetPaint();
                return;
            }

            if (this.painting) {
                this.paintData.push([
                    realX,
                    realY
                ]);
                this.paint(realX, realY);
            }

            if (this._isEnd(realX, realY) && this.painting) {
                if (this.finishCb) {
                    this.finishCb(this.paintData.pop(), this.bitmap.baseTexture.source.toDataURL());
                }
                this.finished = true;
            }
        } else {
            if (this.resetTimeout) {
                clearTimeout(this.resetTimeout);
                this.resetTimeout = null;
            }

            this.resetTimeout = setTimeout(() => {
                this.resetTimeout = null;
                this._resetPaint();
            }, 5000);
        }
    }

    _resetPaint() {
        if (this.bitmap) {
            this.bitmap.destroy();
        }

        this.paintData = [];
        this.painting = false;
        this.bitmap = this.game.make.bitmapData(this.game.width, this.game.height);
        this.bitmapBackground = this.game.make.bitmapData(this.game.width, this.game.height);

        this.bitmapDestination = this.game.make.bitmapData(this.game.width, this.game.height);
        this.bitmapDestination.addToWorld();

        this._paintStart();
        this._paintEnd();
    }

    _paintStart() {
        this.paint(this.start.x, this.start.y, this.startColor, this.bitmapBackground);
    }

    _isEnd(x, y) {
        switch (this.end) {
            case "top":
                if (this.isNear(y, 0)) {
                    if (y > 0) {
                        for (let i = y; i >= 0; i--) {
                            console.log(x, i);
                            this.paint(x, i);
                        }
                    }
                    return true;
                }
                break;
            case "left":
                if (this.isNear(x, 0)) {
                    if (x > 0) {
                        for (let i = x; i >= 0; i--) {
                            this.paint(i, y);
                        }
                    }
                    return true;
                }
                break;
            case "right":
                if (this.isNear(x, this.size)) {
                    if (x < this.size) {
                        for (let i = x; i <= this.size; i++) {
                            this.paint(i, y);
                        }
                    }
                    return true;
                }
                break;
            case "bottom":
                if (this.isNear(y, this.size)) {
                    if (y < this.size) {
                        for (let i = y; i <= this.size; i++) {
                            this.paint(x, i);
                        }
                    }
                    return true;
                }
                break;
        }

        return false;
    }

    _paintEnd() {
        switch (this.end) {
            case "top":
                for (let i = 0; i < this.size; i++) {
                    this.paint(i, 0, this.endColor, this.bitmapBackground, 4);
                }
                break;
            case "left":
                for (let i = 0; i < this.size; i++) {
                    this.paint(0, i, this.endColor, this.bitmapBackground, 4);
                }
                break;
            case "right":
                for (let i = 0; i < this.size; i++) {
                    this.paint(this.size - 4, i, this.endColor, this.bitmapBackground, 4);
                }
                break;
            case "bottom":
                for (let i = 0; i < this.size; i++) {
                    this.paint(i, this.size - 4, this.endColor, this.bitmapBackground, 4);
                }
                break;
        }
    }

    destroy() {
        this.game.destroy();
    }

    _preload() {
        //this.debug("Preload");
        this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    }

    _create() {
        //this.debug("Create");
        this.game.stage.backgroundColor = this.backgroundColor;

        this._resetPaint();
        this.game.input.addPointer();
        this.game.input.maxPointers = 1;
        this.game.input.addMoveCallback(this.onMove, this);
        this.game.input.onUp.add(() => {
            if (this.resetTimeout) {
                clearTimeout(this.resetTimeout);
                this.resetTimeout = null;
            }
            this.resetTimeout = setTimeout(() => {
                this.resetTimeout = null;
                this._resetPaint();
            }, 5000);
        }, this);
    }

    _update() {
        //this.debug("Update");
        this.bitmapDestination.fill(255, 255, 255, 0.1);
        this.bitmapDestination.copy(this.bitmapBackground, 0, 0);
        this.bitmapDestination.copy(this.bitmap, 0, 0);
    }

}