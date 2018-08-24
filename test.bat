REM *** Must Go In The Image ***
REM Place this file in the C:\TH folder which is the folder for testing the images.
REM This file will be opened indirectly when tester types t <ENTER> 

@ECHO OFF
CLS
ECHO Application Tester built by Andres Perez (ELTORO.IT)
ECHO Please wait while we download the latest scripts
CD C:\TH
IF EXIST PCTesterScript (
	REM ECHO DELETING
	RMDIR /S /Q PCTesterScript
) ELSE (
	REM ECHO NOTHING
)
git clone https://github.com/eltoroit/PCTesterScript.git
CD PCTesterScript
node tester.js &
