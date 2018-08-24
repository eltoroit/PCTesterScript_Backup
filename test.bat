REM *** Must Go In The Image ***
REM Place this file in the C:\TH folder which is the folder for testing the images.
REM This file will be opened indirectly when tester types t <ENTER> 

@ECHO OFF
CLS
ECHO Application Tester built by Andres Perez (ELTORO.IT)
ECHO Please wait while we download the latest scripts
CD TH
IF EXIST DX18Scripts (
	REM ECHO DELETING
	RMDIR /S /Q DX18Scripts
) ELSE (
	REM ECHO NOTHING
)
git clone https://github.com/eltoroit/DX18Scripts.git
CD DX18Scripts
node tester.js &
