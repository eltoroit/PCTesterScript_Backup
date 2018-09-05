"use strict";

var showTimestamp = true;
var showLineNumbers = false;

let clearScreenCode = "\x1B[2J";

// Color Modes
let colorReset = "\x1b[0m";
let colorBright = "\x1b[1m";
let colorDim = "\x1b[2m";
let colorUnderscore = "\x1b[4m";
let colorBlink = "\x1b[5m";
let colorReverse = "\x1b[7m";
let colorHidden = "\x1b[8m";

// Color Foreground
let colorFgBlack = "\x1b[30m";
let colorFgRed = "\x1b[31m";
let colorFgGreen = "\x1b[32m";
let colorFgYellow = "\x1b[33m";
let colorFgBlue = "\x1b[34m";
let colorFgMagenta = "\x1b[35m";
let colorFgCyan = "\x1b[36m";
let colorFgWhite = "\x1b[37m";
let colorFgGray = "\x1b[90m";

// Color Background
let colorBgBlack = "\x1b[40m";
let colorBgRed = "\x1b[41m";
let colorBgGreen = "\x1b[42m";
let colorBgYellow = "\x1b[43m";
let colorBgBlue = "\x1b[44m";
let colorBgMagenta = "\x1b[45m";
let colorBgCyan = "\x1b[46m";
let colorBgWhite = "\x1b[47m";

module.exports = {
	getTime: function() {
		var date = new Date();
        var hour = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        var milliseconds = date.getMilliseconds();
		var strTime = '[' +
			((hour < 10) ? '0' + hour: hour) + ':' +
			((minutes < 10) ? '0' + minutes: minutes) + ':' +
			((seconds < 10) ? '0' + seconds: seconds) + '.' + ('00' + milliseconds).slice(-3) +
		']';
		
		return strTime;
    },
    getTrace: function(offset) {
		var prefix;
		
        if (!offset) offset = 0;

		prefix = "";
		if (showTimestamp) {
			prefix += this.getTime();
		}
        if (showLineNumbers) {
            try {
                throw new Error();
            } catch (e) {
                if (typeof e.stack === 'string') {
                    var linePart = 1;

                    var lines = e.stack.split('\n');
                    var line = lines[3 + offset];

                    // console.log(colorBgBlack + colorBright + colorFgMagenta  + line + colorReset);
                    if (line.toLowerCase().indexOf("c:\\th\\") > 0) linePart++;
                    prefix += "[" + line.split(':')[linePart] + "]";
                }
            }
        }
		return prefix + ": ";
    },
    error: function (msg, offset) {
        if (!offset) offset = 0;
        console.log(colorBgBlack + colorBright + colorFgRed + this.getTrace() + msg + colorReset);
    },
    debug: function (msg) {
        console.log(colorBgBlack + colorBright + colorFgGray + this.getTrace() + msg + colorReset);
    },
    info: function (msg) {
        console.log(colorBgBlack + colorBright + colorFgWhite + this.getTrace() + msg + colorReset);
    },
    success: function (msg) {
        console.log(colorBgBlack + colorBright + colorFgGreen + this.getTrace() + msg + colorReset);
    },
    promptMsg: function (msg) {
        console.log(this.getPromptMsg(msg));
    },
    clearScreen: function () {
        console.log(clearScreenCode);
    },
    getPromptMsg: function (msg) {
        return colorBgBlack + colorBright + colorFgYellow + msg + colorReset;
    },
    getPrettyJson: function (obj) {
        return JSON.stringify(obj, null, 4);
    },
};
