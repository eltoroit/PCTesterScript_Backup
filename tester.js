#! /usr/bin/env node
"use strict";

// This script was created by Andres Perez to test the image machines.

// Requires
const fs = require('fs');
const readline = require('readline');
const { exec, execSync, spawn, spawnSync } = require('child_process');
const url = require('url');
const http = require('http');
const https = require('https');
const log = require('./colorLogs.js');

// Skip manual checks
var debug = false;
var verbose = false;
var timerDelay = 250;
var executeManualChecks = false;

var errors = [];
var errorCodes = {};
var idxInstructions;
var instructions = [];

function reportError(instruction) {
	if (debug) log.debug('ERROR FOR: ' + log.getPrettyJson(instruction));
	errors.push(instruction);
	log.error("*** *** ERROR");
	log.error(log.getPrettyJson(instruction));
}
function promptYesNo(instruction) {
	log.promptMsg(instruction.Message__c);

	var sendKeysCmd = "call sendkeys.bat \"C:\\Windows\\System32\\cmd.exe\" \"\"";
	// log.debug("Sending keys: " + sendKeysCmd);
	exec(sendKeysCmd);
	const inputReadLine1 = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	if (executeManualChecks) {
		var untilCorrectResponse = function () {
			inputReadLine1.question(log.getPromptMsg("[Y/N] > "), function (answer) {
				if (answer[0].toUpperCase() === 'Y') {
					inputReadLine1.close();
					nextInstruction();
				} else if (answer[0].toUpperCase() === 'N') {
					inputReadLine1.close();
					instruction.returned = "User responsed 'N'";
					reportError(instruction, true);
					nextInstruction();
				} else {
					untilCorrectResponse();
				}
			});
		}

		untilCorrectResponse();
	} else {
		log.error("Manual checks are being skipped for testing! (No prompt)");
		nextInstruction();
	}
}
function spawnCommand(instruction) {
	if (debug) log.debug("SPAWNING: " + log.getPrettyJson(instruction.Command__c));

	var process;
	try {
		if (instruction.Command__c.params) {
			process = spawn(instruction.Command__c.cmd, instruction.Command__c.params);
		} else {
			process = spawn(instruction.Command__c.cmd);
		}
	} catch (ex) {
		log.debug(ex);
		throw ex;
	}
	process.on('error', function (err) {
		console.log('child process exited with an error: ' + err);
	});
	setTimeout(function () {
		promptYesNo(instruction);
	}, timerDelay * 10);
}
function executeCommand(instruction) {
	if (debug) log.debug("EXECUTING: " + instruction.Command__c);
	var process = exec(instruction.Command__c, function (error, stdout, stderr) {
		var output = {
			cmd: instruction.Command__c,
			error: error
		};
		output.stdout = stdout ? stdout.trim() : "";
		output.stderr = stderr ? stderr.trim() : "";
		if (debug) log.debug("OUTPUT: " + log.getPrettyJson(output));
		instruction.callback(output);
	});
}
function checkExact(instruction) {
	if (verbose) log.info("CHECKING: [" + instruction.Command__c + "]");
	instruction.callback = function (output) {
		if (output.stdout === instruction.Expected__c) {
			if (verbose) log.success("VALID: [" + output.stdout + "]");
			nextInstruction();
		} else {
			instruction.returned = output;
			reportError(instruction);
			nextInstruction();
		}
	};
	executeCommand(instruction);
}
function checkContains(instruction) {
	if (verbose) log.info("CHECKING: [" + instruction.Command__c + "]");
	instruction.callback = function (output) {
		var valid = false;

		if (!instruction.Expected__c) valid = true;
		if ((output.stdout != "") && (output.stdout.indexOf(instruction.Expected__c) >= 0)) valid = true;
		if ((output.stderr != "") && (output.stderr.indexOf(instruction.Expected__c) >= 0)) valid = true;

		if (valid) {
			if (verbose) log.success("VALID: [" + instruction.Expected__c + "]");
		} else {
			instruction.returned = output;
			reportError(instruction);
		}
		nextInstruction();
	}
	executeCommand(instruction);
}
function checkPath(instruction) {
	if (verbose) log.info("CHECK PATH: [" + instruction.Command__c + "]");
	instruction.Command__c = "DIR \"" + instruction.Command__c + "\" /B";
	if (!instruction.callback) {
		instruction.callback = function (output) {
			if (output.stdout.toLowerCase().indexOf(instruction.Expected__c.toLowerCase()) >= 0) {
				if (verbose) log.success("VALID: [Found: '" + instruction.Expected__c + "']");
				nextInstruction();
			} else {
				instruction.returned = output;
				reportError(instruction);
				nextInstruction();
			}
		}
	}
	executeCommand(instruction);
}
function openUrl(urlToCheck, callback) {
	var outputData = "";
	var options = url.parse(urlToCheck);
	options.method = 'GET';

	var reqClient;
	if (options.protocol.toUpperCase() === "HTTPS:") {
		reqClient = https;
	} else {
		reqClient = http;
	}

	var reqWS = reqClient.request(options, function (resWS) {
		resWS.setEncoding('utf8');
		resWS.on('data', function (chunk) { outputData += chunk; });
		resWS.on('end', function () {
			var output = { body: outputData, statusCode: resWS.statusCode }
			if (debug) log.debug(output.body.substring(0, 250));
			callback(true);
		})
	});

	reqWS.on('error', function (e) {
		if (debug) log.debug(('problem with request: ', e));
		callback(false, e);
	});
	reqWS.end();
}
function ChromeBookmark(instruction) {
	if (verbose) log.info("Verifying Bookmark in Chrome: " + instruction.AppName__c);

	// if (debug) log.debug("Reading JSON_Action__c");
	var JSON_Action;
	JSON_Action = instruction.JSON_Actions__r;
	if (JSON_Action.totalSize != 1) throw new Error("Multiple JSON Actions are not allowed!");
	JSON_Action = JSON_Action.records[0];

	// if (debug) log.debug("Reading bookmarks file");
	var fileContents = loadJsonFile(instruction.Command__c);
	var data = fileContents;
	var paths = JSON_Action.Path__c.split(":");

	if (debug) log.debug("Processing bookmarks file: " + JSON_Action.Path__c);
	for (var i = 0; i < paths.length; i++) {
		var path = paths[i];
		if (path != "") {
			if (path[0] == "[") {
				// Remove [ and ]
				path = path.substring(1, path.length - 1);
				// Split it
				path = path.split("=");
				var key = path[0];
				var value = path[1];
				if (data && data.length > 0) {
					for (var j = 0; j < data.length; j++) {
						var d = data[j];
						if (d[key].trim().toUpperCase() == value.trim().toUpperCase()) {
							data = d;
						}
					}
				} else {
					log.error("DATA IS NOT CORRECT (1)");
					reportError(instruction);
				}
			} else {
				var s1 = JSON.stringify(data).length;
				data = data[path];
				var s2 = JSON.stringify(data).length;
				if (s1 <= s2) {
					log.error("DATA IS NOT CORRECT(2)");
					reportError(instruction);
				}
			}
		}
	}
	if (debug) log.debug("Found bookmark: " + log.getPrettyJson(data));

	if (debug) log.debug("Opening bookmark");
	var url = data[JSON_Action.Key__c];
	if (url === JSON_Action.Value__c) {
		openUrl(url, function (isSuccess, error) {
			if (!isSuccess) {
				instruction.hasErrors = true;
				instruction.returned = error;
				reportError(instruction);
				nextInstruction();
			} else {
				log.success("VALID: Bookmark in Chrome: " + instruction.AppName__c);
				nextInstruction();
			}
		});
	} else {
		instruction.returned = url;
		reportError(instruction);
		nextInstruction();
	}
}
function jsonFile_Edit(instruction) {
	if (verbose) log.info("Editing JSON File: " + instruction.AppName__c);

	if (debug) log.debug("Reading JSON_Action__c");
	var JSON_Action;
	JSON_Action = instruction.JSON_Actions__r;
	if (JSON_Action.totalSize != 1) throw new Error("Multiple JSON Actions are not allowed!");
	JSON_Action = JSON_Action.records[0];

	if (debug) log.debug("Reading JSON file");
	var fileContents = loadJsonFile(instruction.Command__c);
	var data = fileContents;
	var paths = JSON_Action.Path__c.split(":");

	if (debug) log.debug("Processing JSON path: " + JSON_Action.Path__c);
	for (var i = 0; i < paths.length; i++) {
		var path = paths[i];
		if (path != "") {
			if (path[0] == "[") {
				// Remove [ and ]
				path = path.substring(1, path.length - 1);
				// Split it
				path = path.split("=");
				var key = path[0];
				var value = path[1];
				if (data && data.length > 0) {
					for (var j = 0; j < data.length; j++) {
						var d = data[j];
						if (d[key] == value) {
							data = d;
						}
					}
				} else {
					log.error("DATA IS NOT CORRECT (1)");
					reportError(instruction);
				}
			} else {
				var s1 = JSON.stringify(data).length;
				data = data[path];
				var s2 = JSON.stringify(data).length;
				if (s1 <= s2) {
					log.error("DATA IS NOT CORRECT(2)");
					reportError(instruction);
				}
			}
		}
	}

	if (debug) log.debug("Writing data: " + log.getPrettyJson(data));
	data[JSON_Action.Key__c] = JSON_Action.Value__c;
	fs.writeFile(instruction.Command__c, log.getPrettyJson(fileContents), function (err) {
		instruction.returned = err;
		instruction.Expected__c = "File is saved with new information";
		if (err) {
			reportError(instruction);
			nextInstruction();
		} else {
			if (verbose) log.success("VALID: file has been updated: " + instruction.Command__c);
			nextInstruction();
		}
	});
}
function loadJsonFile(path) {
	if (verbose) log.debug("Reading file: " + path);

	var stats;
	var hasErrors = false;
	try {
		stats = fs.statSync(path);
		hasErrors = (stats.size == 0);
	} catch (ex) {
		log.debug("Error checking file: " + log.getPrettyJson(ex));
		hasErrors = true;
	}

	if (hasErrors) {
		try {
			fs.writeFileSync(path, '{}');
		} catch (ex) {
			log.error("Error creating file: " + path);
		}
	}

	return JSON.parse(fs.readFileSync(path, 'utf8'));
}
function nextInstruction() {
	setTimeout(executeInstruction, timerDelay);
}
function executeInstruction() {
	if (idxInstructions >= instructions.length) return;
	var instruction = instructions[idxInstructions++];

	// Check AppName__c
	switch (instruction.Operation__c) {
		case "Clear":
		case "Write":
			break;
		default:
			log.info(">>> Instruction #" + idxInstructions + ": " + instruction.Name + " | " + instruction.AppName__c + " | " + instruction.Operation__c);
			if (debug) log.debug(log.getPrettyJson(instruction));

			// Check every record has an AppName__c
			if (!instruction.AppName__c) {
				var msg = "Instruction #" + idxInstructions + ". Does not have a valid AppName__c. " + log.getPrettyJson(instruction);
				log.error(msg);
				throw msg;
			}

			// Check unique record AppName__c
			instruction.AppName__c = instruction.AppName__c.toUpperCase();
			if (errorCodes[instruction.AppName__c]) {
				var msg = "Instruction #" + idxInstructions + ". You can not reuse AppName__c. " + log.getPrettyJson(instruction);
				log.error(msg);
				throw msg;
			}
			errorCodes[instruction.AppName__c] = instruction;
	}

	switch (instruction.Operation__c) {
		case "Check Contains":
			checkContains(instruction);
			break;
		case "Check Exact":
			checkExact(instruction);
			break;
		case "Check Path":
			checkPath(instruction);
			break;
		case "Chrome Bookmark":
			ChromeBookmark(instruction);
			break;
		case "Clear":
			// Clear screen
			log.clearScreen();
			nextInstruction();
			break;
		case "JSON File - Check":
			stopAndFix = true;
			break;
		case "JSON File - Edit":
			jsonFile_Edit(instruction);
			break;
		case "Manual":
			promptYesNo(instruction);
			break;
		case "Open Application":
			if (executeManualChecks) {
				instruction.callback = function (output) {
					if (output.stderr) {
						instruction.hasErrors = true;
						instruction.returned = output;
						reportError(instruction);
						nextInstruction();
					}
				};
				executeCommand(instruction);
				setTimeout(function () {
					if (!instruction.hasErrors) {
						promptYesNo(instruction);
					}
				}, timerDelay * 10);
			} else {
				log.error("Manual checks are being skipped for testing! (Open application skipped)");
				nextInstruction();
			}
			break;
		case "Write":
			if (instruction.Command__c == "=== === === AUTOMATED CHECKS === === ===") {
				if (executeManualChecks) {
					log.error("Switching debug mode ON");
					debug = true;
					verbose = true;	
				}
			}
			log.info(instruction.Command__c);
			nextInstruction();
			break;
		case "Done":
			var filePath = "Errors-" + (new Date().getTime()) + ".json";
			try {
				fs.unlinkSync(filePath);
			} catch (ex) {
				if (debug) log.debug("Could not delete file " + filePath + ": " + log.getPrettyJson(ex));
			}
			if (errors.length > 0) {
				log.error("Number Of Errors Found: " + errors.length);
				fs.appendFileSync(filePath, log.getPrettyJson(errors));
				log.error("Errors written to: ./" + filePath);
				log.error("Please put a sticker on this computer");
			} else {
				log.clearScreen();
				log.success("Test complete and no errors found. Thanks for your help ;-)");
				log.success("Please close this and all other windows that were opened during the test");
			}
			process.exit(0);
			break;
		default:
			log.error("Invalid operation: " + log.getPrettyJson(instruction));
			stopAndFix = true;
	}
}
function menuChooseEvent(data) {
	var events = data.events;

	log.info("Application Tester built by Andres Perez (ELTORO.IT) to help validate the computer's setup");
	log.info("");
	log.info("Please select the test you want to run");
	for (var i = 1; i <= events.length; i++) {
		log.info(i + ". " + events[i - 1].Name);
	}
	log.info(0 + ". Exit without testing");

	const inputReadLine2 = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	var forEver = function () {
		inputReadLine2.question(log.getPromptMsg("Please select a number [0 - " + events.length + "] > "), function (answer) {
			if (answer == 0) {
				process.exit(0);
			} else if ((answer >= 1) && (answer <= events.length)) {
				inputReadLine2.close();
				var event = events[answer - 1];
				instructions = data.actionsByEvent[event.Id];
				instructions.push({
					AppName__c: "Done",
					Operation__c: "Done",
					Name: "Done"
				});
				idxInstructions = 0;
				executeInstruction();
			} else {
				forEver();
			}
		});
	}

	forEver();
}

log.clearScreen();
log.promptMsg('Version: 2018-08-24 @ 18:15:00 PM EST');
fs.readFile('data.json', "utf8", function (err, data) {
	if (err) throw err;
	var data = JSON.parse(data);
	var event = menuChooseEvent(data);
});
