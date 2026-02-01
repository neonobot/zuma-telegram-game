<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zuma Frog</title>

    <link rel="icon" href="favicon.ico">
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap" rel="stylesheet">

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            user-select: none;
        }

        body {
            font-family: 'Nunito', sans-serif;
            background: linear-gradient(135deg, #d0f0f5, #b2dfdb);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
        }

        #startScreen, #gameContainer {
            width: 800px;
            height: 600px;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,.25);
        }

        /* START SCREEN */

        #startScreen {
            background: linear-gradient(135deg, #a5d6a7, #66bb6a);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 40px;
        }

        h1 {
            color: #fff59d;
            font-size: 52px;
            text-shadow: 2px 2px 6px rgba(0,0,0,.3);
        }

        .start-button {
            background: #ffb74d;
            border: none;
            padding: 18px 50px;
            font-size: 26px;
            border-radius: 50px;
            color: white;
            font-weight: 900;
            cursor: pointer;
            box-shadow: 0 10px 20px rgba(0,0,0,.3);
        }

        /* GAME */

        #gameContainer {
            display: none;
            position: relative;
            background: radial-gradient(circle, #b2dfdb 0%, #4db6ac 100%);
        }

        #gameCanvas {
            width: 100%;
            height: 100%;
            display: block;
        }

        /* BUTTONS */

        .game-buttons {
            position: absolute;
            bottom: 16px;
            right: 16px;
            display: flex;
            gap: 10px;
            z-index: 10;
        }

        .game-btn {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            border: none;
            font-size: 22px;
            cursor: pointer;
            background: rgba(255,255,255,0.85);
            box-shadow: 0 4px 12px rgba(0,0,0,.25);
        }
    </style>
</head>
<body>

<!-- START SCREEN -->
<div id="startScreen">
    <h1>🐸 ZUMA FROG</h1>
    <button class="start-button" id="startButton">НАЧАТЬ ИГРУ</button>
</div>

<!-- GAME -->
<div id="gameContainer">
    <canvas id="gameCanvas" width="800" height="600"></canvas>

    <div class="game-buttons">
        <button id="pauseButton" class="game-btn">⏸</button>
    </div>
</div>

<!-- MUSIC -->
<audio id="bgMusic" loop>
    <source src="https://www.dropbox.com/scl/fi/8irxfrpyexg242w6240dh/cozy.mp3?rlkey=9ahrs2f136gk7jkrxf0wp23ta&st=xpugxaf4&dl=1" type="audio/mpeg">
</audio>

<!-- SCRIPTS -->
<script src="zuma-engine.js"></script>
<script src="game-ui.js"></script>

</body>
</html>
