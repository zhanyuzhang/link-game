'use strict';

window.onload = function () {
    var iconList = [];
    for(var i = 0; i < 18; i++) {
        iconList.push('./images/pvz_' + (i < 9 ? '0' + (i + 1) : (i+1)) + '.png');
    }
    var gameConfig = {
        cellWidth: 68,
        cellHeight: 64,
        rows: 7,
        cols: 10,
        level: 1,
        iconList: iconList
    }
    var linkGame = new LinkGame(gameConfig);
    linkGame.init();
};



function LinkGame(config) {
    // 强制采用构造函数形式进行调用
    if(!(this instanceof LinkGame)) {
        return new LinkGame(config);
    }
    this.$box = $('.' + (config.boxId || 'game-box'));
    this.cellWidth = config.cellWidth || 68; // 每格的的宽度
    this.cellHeight = config.cellHeight || 64; // 每格的高度
    this.cols = config.cols || 10; // 列数
    this.rows = config.rows || 8; // 行数
    this.level = config.level || 1; // 等级
    this.iconList = config.iconList || []; // 小图片集合
    return this;
}

LinkGame.prototype = {
    init: function () {
        var self = this;
        this.iconTypeCount = this.level + 5; // 图片的种类
        this.count = this.rows * this.cols; // 图片的总数
        this.remain = this.count; // 剩余的未有消去的图片
        this.pictures = []; // 图片集合
        this.score = 0; // 得分
        this.preClickInfo = null; // 上一次被点中的图片信息
        this.leftTime = 180;
        this.timmer = setInterval(function () {
            self.updateCountDown();
        }, 1000);
        this.createMap();
        this.disorder();
        this.bindDomEvents();
    },
    replaceTpl: function (tpl, data) {
        return tpl.replace(/\${(\w+)}/ig, function (match, $1) {
            return data[$1];
        });
    },
    mergeArray: function (target, source) {
        source.forEach(function (e) {
            if(target.indexOf(e) === -1) {
                target.push(e);
            }
        })
    },
    updateCountDown: function () {
        $('.count-down .value').text(this.leftTime);
        if(--this.leftTime < 0) {
            clearInterval(this.timmer);
            alert('game over!');
        }
    },
    checkMatch: function (curClickInfo) {
        var pictures = this.pictures,
                preClickInfo = this.preClickInfo ? this.preClickInfo : {},
                preRow = +preClickInfo.row,
                preCol = +preClickInfo.col,
                preIndex = +preClickInfo.index,
                curRow = +curClickInfo.row,
                curCol = +curClickInfo.col,
                curIndex = +curClickInfo.index;

        // 如果点击的图片是空白的，则退出
        if(pictures[curRow][curCol].isEmpty) {
            return;
        }
        this.preClickInfo = curClickInfo;
        // 如果前后2次点击的是同一张图片，或者2张图片不是同类型的，则退出
        if(preIndex === curIndex || !preIndex ||  pictures[preRow][preCol].pic !== pictures[curRow][curCol].pic) {
            return;
        }
        this.isConnected(preRow, preCol, curRow, curCol) && this.updateStatus(preRow, preCol, curRow, curCol, preIndex, curIndex);
    },

    updateStatus: function (preRow, preCol, curRow, curCol, preIndex, curIndex) {
        var pictures = this.pictures,
            $gameImg = $('.game-box img');
        pictures[preRow][preCol].isEmpty = true;
        pictures[curRow][curCol].isEmpty = true;
        $gameImg.eq(preIndex).addClass('empty');
        $gameImg.eq(curIndex).addClass('empty');
        this.remain -= 2;
        this.score += 10;
        this.preClickInfo = null;
        $('.score .value').text(this.score);
        if(this.remain === 0) {
            this.nextLevel();
        }
    },

    isConnected: function (preRow, preCol, curRow, curCol) {
        var self = this,
                prePicture = self.pictures[preRow][preCol],
                curPicture = self.pictures[curRow][curCol],
                preBorderInfo = this.getBorderInfo(preRow, preCol),
                curBorderInfo = this.getBorderInfo(curRow, curCol),
                isConnectedOutside = false,
                isConnectedInside = false;

        preBorderInfo.forEach(function (borderInfo, i) {
            borderInfo && curBorderInfo[i] && (isConnectedOutside = true);
        });
        var closePictures = self.getClosePictures(curPicture, prePicture); // 直接连接
        closePictures.forEach(function (pic) { // 一个拐点
            self.mergeArray(closePictures, self.getClosePictures(pic, prePicture));
        });
        closePictures.forEach(function (pic) { // 2个拐点
            self.mergeArray(closePictures, self.getClosePictures(pic, prePicture));
        });
        isConnectedInside = (closePictures.indexOf(prePicture) !== -1) ? true : false;
        return isConnectedInside || isConnectedOutside;
    },

    // 搜索某个图片的所有的可直线到达的其他图片并返回
    getClosePictures: function (originPicture, targetPicture) {
        var pictures = this.pictures,
                connectedPictures = [];
        // 向左搜索
        for(var col = originPicture.col - 1; col >= 0; col--) {
            if(!pictures[originPicture.row][col].isEmpty && pictures[originPicture.row][col] !== targetPicture) {
                break;
            }
            connectedPictures.push(pictures[originPicture.row][col]);
        }
        // 向右搜索
        for(var col = originPicture.col + 1; col < this.cols; col++) {
            if(!pictures[originPicture.row][col].isEmpty && pictures[originPicture.row][col] !== targetPicture) {
                break;
            }
            connectedPictures.push(pictures[originPicture.row][col]);
        }
        // 向上搜索
        for(var row = originPicture.row - 1; row >= 0; row--) {
            if(!pictures[row][originPicture.col].isEmpty && pictures[row][originPicture.col] !== targetPicture) {
                break;
            }
            connectedPictures.push(pictures[row][originPicture.col]);
        }
        // 向下搜索
        for(var row = originPicture.row + 1; row < this.rows; row++) {
            if(!pictures[row][originPicture.col].isEmpty && pictures[row][originPicture.col] !== targetPicture) {
                break;
            }
            connectedPictures.push(pictures[row][originPicture.col]);
        }
        return connectedPictures;
    },

    // 获取图片对边界的连接情况
    getBorderInfo: function (row, col) {
        var pictures = this.pictures,
                reachInfo = [false, false, false, false]; // 数组里的4个布尔值分别表示能否到达上、右、下、左边界
        for(var r = row; r >= 0; r--) { // 能否到达上边界
            if(!pictures[r][col].isEmpty && r !== row) break;
            reachInfo[0] = r === 0;
        }
        for(var c = col; c < this.cols; c++) { // 能否到达右边界
            if(!pictures[row][c].isEmpty && c !== col) break;
            reachInfo[1] =  c === this.cols - 1;
        }
        for(var r = row; r < this.rows; r++) { // 能否到达下边界
            if(!pictures[r][col].isEmpty && r !== row) break;
            reachInfo[2] = r === this.rows - 1;
        }
        for(var c = col; c >= 0; c--) { // 能否到达左边界
            if(!pictures[row][c].isEmpty && c !== col) break;
            reachInfo[3] =  c === 0;
        }
        return reachInfo;
    },

    swapProperties: function (obj1, obj2, properties) {
        properties.forEach(function (property) {
            var temp = obj1[property];
            obj1[property] = obj2[property];
            obj2[property] = temp;
        });
    },

    // 打乱顺序
    disorder: function () {
        var pictures = this.pictures;
        for(var i = 0; i < this.count * 10; i++) {
            // 随机选中2张图片，调用this.swapProperties交换俩人的pic和isEmpty属性
            var picture1 = pictures[parseInt(Math.random() * this.rows)][parseInt(Math.random() * this.cols)];
            var picture2 = pictures[parseInt(Math.random() * this.rows)][parseInt(Math.random() * this.cols)];
            this.swapProperties(picture1, picture2, ['pic', 'isEmpty']);
        }
        this.renderMap();
    },
    
    cloneObj: function (source) {
        var target = {};
        for(var pro in source) {
            source.hasOwnProperty(pro) && (target[pro] = source[pro]);
        }
        return target;
    },

    nextLevel: function () {
        $('.level .value').text(++this.level);
        this.init();
    },

    createMap: function () {
        var count = 0;
        for(var row = 0; row < this.rows; row++) {
            this.pictures.push([]);
            for(var col = 0; col < this.cols; col++, count++) {
                this.pictures[row].push({
                    row: row,
                    col: col,
                    isEmpty: false,
                    index: count,
                    pic: this.iconList[parseInt(count / 2) % this.iconTypeCount],
                    width: this.cellWidth,
                    height: this.cellHeight
                })
            }
        }
    },

    renderMap: function () {
        this.$box.html(''); // 将视图清空
        var html = '';
        var pictures = this.pictures;
        var tpl = '<img class="game-picture ${empty}" draggable=false src="${pic}" data-row="${row}" data-col="${col}" data-index="${index}" width=${width} height=${height} />';
        for(var row = 0; row < this.rows; row++) {
            html += '<div class="game-row">';
            for(var col = 0; col < this.cols; col++) {
                var picture = this.cloneObj(pictures[row][col]);
                picture.empty = picture.isEmpty ? 'empty' : '';
                html += this.replaceTpl(tpl, picture);
            }
            html += '</div>';
        }
        this.$box.html(html);
    },

    bindDomEvents: function () {
        var self = this;
        $('.game-box').on('click', function (event) {
            var target = event.target;
            if(target.classList.contains('game-picture')) {
                var data = {
                    index: target.dataset.index,
                    row: target.dataset.row,
                    col: target.dataset.col
                };
                self.checkMatch(data);
            }
        });
        $('.disorder').on('click', function (event) {
            self.disorder();
        })
    },


    on: function(name, callback) {
        var self = this;
        name = name.split(' ');
        name.forEach(function(n){
            var list = self.events[n] || (self.events[n] = []);
            list.push(callback);
        });
        return this;
    },
    emit: function(name, data) {
        var list = this.events[name];
        if (list) {
            list = list.slice();
            for(var i = 0, len = list.length; i < len; i++) {
                list[i](data)
            }
        }
        return this;
    },
};