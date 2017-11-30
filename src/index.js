const jQuery = require("jquery");
const CanvasGame = require("lib/canvasgame");
const MY_ID = require("uuid/v1")();
const apiClass = require("adventskalender-js-api");

var Api = new apiClass();
Api.init(window, "Clementines Extension");

var debug = location.hostname === "localhost";
var user = null;
var isVa = null;
Api.getUser().then((data) => {
    user = data;
    isVa = data.isVa;
}, (err) => {
    if (debug) {
        user = {
            _id: "5a17d8700af00952e999dccc",
            isVa: true
        };
        isVa = true;
    }
});

//debug = false;
var blockInterval;
var host = "https://weihnachten2017.vonaffenfels.de";
var images = [];
var size = 128;
var lastImage;
var start;
var end;
var gameInstance = null;
var clementineContainer = jQuery("#clementine");
var imagesContainer = jQuery("#images");
var gameContainer = jQuery("#game");
var overlayContainer = jQuery(".overlay");
var blockedMessage = jQuery("#blockedmessage");

function setLastImage(image, lastIndex) {
    lastImage = image;

    if (!lastImage) {
        start = {
            x: 110,
            y: 128
        };
        end = "left";
    } else {
        let lastPixel = lastImage.pixel;

        if (lastIndex === 0) {
            end = "left";
            start = {
                x: size - lastPixel[0] - 2,
                y: lastPixel[1]
            };
        } else {
            let dir = true;
            for (let i = 0; i <= lastIndex; i++) {
                if (i > 0 && i % 3 === 0) {
                    dir = !dir;
                }


                if (i === lastIndex) {
                    let result = getStartAndEndFromDirAndIndex(dir, lastIndex, lastPixel);
                    start = result.start;
                    end = result.end;
                }
            }
        }
    }
}

function reDrawImages() {
    let imageString = "";
    let dir = true;
    let firstEmpty = true;
    let amountempty = 3 - (images.length % 3);

    amountempty = amountempty < 0 ? 0 : amountempty;

    for (var i = 0; i < images.length + amountempty; i++) {
        let image = images[i];

        if (i > 0 && i % 3 === 0) {
            dir = !dir;
        }

        let order = i;

        if (!dir) {
            let add = 0;

            if (i % 3 === 0) {
                add += 3;
            }
            if (i % 3 === 1) {
                add += 1;
            }
            if (i % 3 === 2) {
                add += -1;
            }

            order = order + add;
        }

        if (!image) {
            if (firstEmpty) {
                firstEmpty = false;
                imageString += `
                    <div class="cell new" onclick="addTile()" style="order: ${order};"><img src="img/btn_draw.svg"></div>
                `;
            } else {
                imageString += `
                    <div class="cell empty" style="order: ${order}"></div>
                `;
            }
        } else {
            imageString += `
                <div class="cell" onclick="editTile(${i})" style="order: ${order}"><img src="${image.image}" /></div>
            `;
        }
    }

    if (firstEmpty) {
        imageString += `
            <div class="cell new" onclick="addTile()" style="order: 999999;">+</div>
        `;
    }

    imagesContainer.html(imageString);
}

function refreshImages() {
    return new Promise((resolve, reject) => {
        jQuery.get(host + "/loadClementine", function (data) {
            images = data;
            setLastImage(images[images.length - 1], images.length - 1);
            reDrawImages();
            return resolve();
        });
    });
}

function getStartAndEndFromDirAndIndex(dir, lastIndex, lastPixel) {
    if (dir) {
        if (lastIndex % 3 === 1) {
            end = "top";
            start = {
                x: size - lastPixel[0] - 2,
                y: lastPixel[1]
            };
        } else if (lastIndex % 3 === 2) {
            end = "right";
            start = {
                x: lastPixel[0],
                y: size - lastPixel[1] - 2
            };
        } else {
            end = "left";
            start = {
                x: size - lastPixel[0] - 2,
                y: lastPixel[1]
            };
        }
    } else {
        if (lastIndex % 3 === 1) {
            end = "top";
            start = {
                x: size - lastPixel[0] - 2,
                y: lastPixel[1]
            };
        } else if (lastIndex % 3 === 2) {
            end = "left";
            start = {
                x: lastPixel[0],
                y: size - lastPixel[1] - 2
            };
        } else {
            end = "right";
            start = {
                x: size - lastPixel[0] - 2,
                y: lastPixel[1]
            };
        }
    }

    return {
        start: start,
        end: end
    };
}

function editTile(editIndex) {
    if (!user || !isVa) {
        return;
    }

    var targetEnd = images[editIndex].pixel;
    var lastPixelEdit = images[editIndex - 1].pixel;
    var dirEdit = true;

    for (let i = 0; i <= editIndex - 1; i++) {
        if (i > 0 && i % 3 === 0) {
            dirEdit = !dirEdit;
        }
    }

    let result = getStartAndEndFromDirAndIndex(dirEdit, editIndex - 1, lastPixelEdit);
    let startEdit = result.start;
    let endEdit = {
        x: targetEnd[0],
        y: targetEnd[1]
    };

    imagesContainer.hide();
    clementineContainer.hide();
    overlayContainer.show();
    gameInstance = new CanvasGame(size, {
        x: startEdit.x,
        y: startEdit.y
    }, endEdit, "game", function (lastPixel, image) {
        gameInstance.destroy();
        imagesContainer.show();
        clementineContainer.show();
        overlayContainer.hide();
        let newImage = {
            pixel: lastPixel,
            user: user,
            index: editIndex,
            image: image
        };
        if (!debug) {
            saveImage(newImage);
        }

        images[editIndex] = newImage;
        setLastImage(images[images.length - 1], images.length - 1);
        reDrawImages();
    });
}

function addTile() {
    getBlock(images.length).then((result) => {

        if (!result && !debug) {
            return;
        }

        imagesContainer.hide();
        clementineContainer.hide();
        overlayContainer.show();
        gameInstance = new CanvasGame(size, {
            x: start.x,
            y: start.y
        }, end, "game", function (lastPixel, image) {
            gameInstance.destroy();
            imagesContainer.show();
            clementineContainer.show();
            overlayContainer.hide();
            let newImage = {
                pixel: lastPixel,
                user: user,
                image: image
            };
            if (!debug) {
                saveNewImage(newImage);
            }

            images.push(newImage);
            setLastImage(images[images.length - 1], images.length - 1);
            reDrawImages();
        });
    });
}

function showBlockedMessage() {
    blockedMessage.fadeIn();
    setTimeout(function () {
        blockedMessage.fadeOut();
    }, 2000);
}

function saveImage(image) {
    return new Promise((resolve, reject) => {
        jQuery.ajax({
            contentType: 'application/json',
            data: JSON.stringify(image),
            success: function (data) {
                if (blockInterval) {
                    clearTimeout(blockInterval);
                }
                return resolve();
            },
            error: function () {
                if (blockInterval) {
                    clearTimeout(blockInterval);
                }
                return reject();
            },
            processData: false,
            type: 'POST',
            url: host + '/editClementine'
        });
    });
}

function saveNewImage(image) {
    return new Promise((resolve, reject) => {
        jQuery.ajax({
            contentType: 'application/json',
            data: JSON.stringify(image),
            success: function (data) {
                if (blockInterval) {
                    clearTimeout(blockInterval);
                }
                return resolve();
            },
            error: function () {
                if (blockInterval) {
                    clearTimeout(blockInterval);
                }
                return reject();
            },
            processData: false,
            type: 'POST',
            url: host + '/saveClementine'
        });
    });
}

function getBlock(index) {
    return new Promise((resolve, reject) => {
        if (blockInterval) {
            clearTimeout(blockInterval);
        }

        if (debug) {
            return resolve(true);
        }

        jQuery.ajax({
            contentType: 'application/json',
            data: JSON.stringify({
                id: MY_ID,
                index: index
            }),
            success: function (data) {
                return refreshImages().then(() => {
                    blockInterval = setTimeout(function () {
                        getBlock(index)
                    }, 2000);
                    return resolve(true);
                });
            },
            error: function () {
                showBlockedMessage();
                return refreshImages().then(() => {
                    if (blockInterval) {
                        clearTimeout(blockInterval);
                    }
                    return reject(false);
                });
            },
            processData: false,
            type: 'POST',
            url: host + '/blockClementine'
        });
    });
}

window.addTile = addTile;
window.editTile = editTile;
refreshImages();