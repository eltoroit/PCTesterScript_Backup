REM *** This file is just for testing... No need to put it in the image (no harm done if placed there, but should not be used) ***
REM This file is just for testing the build process, not to be used while testing the machines.
REM It's just simpler to have things on a "hidden" branch ;-)

@ECHO OFF
CLS
ECHO Application Tester built by Andres Perez (ELTORO.IT)
ECHO Please wait while we download the latest scripts
CD C:\TH
IF EXIST DX18Scripts2 (
	REM ECHO DELETING
	RMDIR /S /Q DX18Scripts2
) ELSE (
	REM ECHO NOTHING
)
git clone https://github.com/ElToroAP/DX18Scripts2
CD DX18Scripts2
git checkout ap/developInMAC
CD assets\scripts
COPY t2.bat C:\TH
node tester.js &

