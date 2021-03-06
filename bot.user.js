/*
The MIT License (MIT)
 Copyright (c) 2016 Carter Cole
 Copyright (c) 2016 Jesse Miller <jmiller@jmiller.com>
 Copyright (c) 2016 Ermiya Eskandary & Théophile Cailliau and other contributors
*/
// ==UserScript==
// @name         Slither.io +!
// @namespace    https://github.com/TheArchiver/Slither.io-bot
// @version      3.0.4
// @description  Slither.io Bot Championship Edition
// @author       Carter Cole
// @match        http://slither.io/
// @updateURL    https://github.com/TheArchiver/Slither.io-bot/raw/master/bot.user.js
// @downloadURL  https://github.com/TheArchiver/Slither.io-bot/raw/master/bot.user.js
// @supportURL   https://github.com/TheArchiver/Slither.io-bot/issues
// @grant        none
// ==/UserScript==

// Custom logging function - disabled by default
window.log = function () {
    if (window.logDebugging) {
        console.log.apply(console, arguments);
    }
};

var canvas = window.canvas = (function () {
    return {
        // Ratio of screen size divided by canvas size.
        canvasRatio: {
            x: window.mc.width / window.ww,
            y: window.mc.height / window.hh
        },

        // Spoofs moving the mouse to the provided coordinates.
        setMouseCoordinates: function (point) {
            window.xm = point.x;
            window.ym = point.y;
        },

        // Convert snake-relative coordinates to absolute screen coordinates.
        mouseToScreen: function (point) {
            var screenX = point.x + (window.ww / 2);
            var screenY = point.y + (window.hh / 2);
            return { x: screenX, y: screenY };
        },

        // Convert screen coordinates to canvas coordinates.
        screenToCanvas: function (point) {
            var canvasX = window.csc *
                (point.x * canvas.canvasRatio.x) - parseInt(window.mc.style.left);
            var canvasY = window.csc *
                (point.y * canvas.canvasRatio.y) - parseInt(window.mc.style.top);
            return { x: canvasX, y: canvasY };
        },

        // Convert map coordinates to mouse coordinates.
        mapToMouse: function (point) {
            var mouseX = (point.x - window.snake.xx) * window.gsc;
            var mouseY = (point.y - window.snake.yy) * window.gsc;
            return { x: mouseX, y: mouseY };
        },

        // Map cordinates to Canvas cordinate shortcut
        mapToCanvas: function (point) {
            var c = canvas.mapToMouse(point);
            c = canvas.mouseToScreen(c);
            c = canvas.screenToCanvas(c);
            return c;
        },

        // Map to Canvas coordinate conversion for drawing circles.
        // Radius also needs to scale by .gsc
        circleMapToCanvas: function (circle) {
            var newCircle = canvas.mapToCanvas(circle);
            return canvas.circle(
                newCircle.x,
                newCircle.y,
                circle.radius * window.gsc
            );
        },

        // Constructor for point type
        point: function (x, y) {
            var p = {
                x: Math.round(x),
                y: Math.round(y)
            };

            return p;
        },

        // Constructor for rect type
        rect: function (x, y, w, h) {
            var r = {
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(w),
                height: Math.round(h)
            };

            return r;
        },

        // Constructor for circle type
        circle: function (x, y, r) {
            var c = {
                x: Math.round(x),
                y: Math.round(y),
                radius: Math.round(r)
            };

            return c;
        },

        // Fast atan2
        fastAtan2: function (y, x) {
            const QPI = Math.PI / 4;
            const TQPI = 3 * Math.PI / 4;
            var r = 0.0;
            var angle = 0.0;
            var abs_y = Math.abs(y) + 1e-10;
            if (x < 0) {
                r = (x + abs_y) / (abs_y - x);
                angle = TQPI;
            } else {
                r = (x - abs_y) / (x + abs_y);
                angle = QPI;
            }
            angle += (0.1963 * r * r - 0.9817) * r;
            if (y < 0) {
                return -angle;
            }

            return angle;
        },

        // Adjusts zoom in response to the mouse wheel.
        setZoom: function (e) {
            // Scaling ratio
            if (window.gsc) {
                window.gsc *= Math.pow(0.9, e.wheelDelta / -120 || e.detail / 2 || 0);
                window.desired_gsc = window.gsc;
            }
        },

        // Restores zoom to the default value.
        resetZoom: function () {
            window.gsc = 0.9;
            window.desired_gsc = 0.9;
        },

        // Maintains Zoom
        maintainZoom: function () {
            if (window.desired_gsc !== undefined) {
                window.gsc = window.desired_gsc;
            }
        },

        // Sets background to the given image URL.
        // Defaults to slither.io's own background.
        setBackground: function (url) {
            url = typeof url !== 'undefined' ? url : '/s/bg45.jpg';
            window.ii.src = url;
        },

        // Draw a rectangle on the canvas.
        drawRect: function (rect, color, fill, alpha) {
            if (alpha === undefined) alpha = 1;

            var ctx = window.mc.getContext('2d');
            var lc = canvas.mapToCanvas({ x: rect.x, y: rect.y });

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = color;
            ctx.rect(lc.x, lc.y, rect.width * window.gsc, rect.height * window.gsc);
            ctx.stroke();
            if (fill) {
                ctx.fillStyle = color;
                ctx.fill();
            }
            ctx.restore();
        },

        // Draw a circle on the canvas.
        drawCircle: function (circle, color, fill, alpha) {
            if (alpha === undefined) alpha = 1;
            if (circle.radius === undefined) circle.radius = 5;

            var ctx = window.mc.getContext('2d');
            var drawCircle = canvas.circleMapToCanvas(circle);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.arc(drawCircle.x, drawCircle.y, drawCircle.radius, 0, Math.PI * 2);
            ctx.stroke();
            if (fill) {
                ctx.fillStyle = color;
                ctx.fill();
            }
            ctx.restore();
        },

        // Draw an angle.
        // @param {number} start -- where to start the angle
        // @param {number} angle -- width of the angle
        // @param {bool} danger -- green if false, red if true
        drawAngle: function (start, angle, color, fill, alpha) {
            if (alpha === undefined) alpha = 0.6;

            var ctx = window.mc.getContext('2d');

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(window.mc.width / 2, window.mc.height / 2);
            ctx.arc(window.mc.width / 2, window.mc.height / 2, window.gsc * 100, start, angle);
            ctx.lineTo(window.mc.width / 2, window.mc.height / 2);
            ctx.closePath();
            ctx.stroke();
            if (fill) {
                ctx.fillStyle = color;
                ctx.fill();
            }
            ctx.restore();
        },

        // Draw a line on the canvas.
        drawLine: function (p1, p2, color, width) {
            if (width === undefined) width = 5;

            var ctx = window.mc.getContext('2d');
            var dp1 = canvas.mapToCanvas(p1);
            var dp2 = canvas.mapToCanvas(p2);

            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = width * window.gsc;
            ctx.strokeStyle = color;
            ctx.moveTo(dp1.x, dp1.y);
            ctx.lineTo(dp2.x, dp2.y);
            ctx.stroke();
            ctx.restore();
        },

        drawCurve: function(curve, offset) {
            var ctx = window.mc.getContext('2d');
          offset = offset || { x:0, y:0 };
          var ox = offset.x;
          var oy = offset.y;
          ctx.beginPath();
          var p = curve.points, i;
          ctx.moveTo(p[0].x + ox, p[0].y + oy);
          if(p.length === 3) {
            ctx.quadraticCurveTo(
              p[1].x + ox, p[1].y + oy,
              p[2].x + ox, p[2].y + oy
            );
          }
          if(p.length === 4) {
            ctx.bezierCurveTo(
              p[1].x + ox, p[1].y + oy,
              p[2].x + ox, p[2].y + oy,
              p[3].x + ox, p[3].y + oy
            );
          }
          ctx.stroke();
          ctx.closePath();
        },

        // Given the start and end of a line, is point left.
        isLeft: function (start, end, point) {
            return ((end.x - start.x) * (point.y - start.y) -
                (end.y - start.y) * (point.x - start.x)) > 0;

        },

        // Get distance squared
        getDistance2: function (x1, y1, x2, y2) {
            var distance2 = Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
            return distance2;
        },

        getDistance2FromSnake: function (point) {
            point.distance = canvas.getDistance2(window.snake.xx, window.snake.yy,
                point.xx, point.yy);
            return point;
        },

        // Check if point in Rect
        pointInRect: function (point, rect) {
            if (rect.x <= point.x && rect.y <= point.y &&
                rect.x + rect.width >= point.x && rect.y + rect.height >= point.y) {
                return true;
            }
            return false;
        },

        // Check if circles intersect
        circleIntersect: function (circle1, circle2) {
            var bothRadii = circle1.radius + circle2.radius;
            var point = {};

            // Pretends the circles are squares for a quick collision check.
            // If it collides, do the more expensive circle check.
            if (circle1.x + bothRadii > circle2.x &&
                circle1.y + bothRadii > circle2.y &&
                circle1.x < circle2.x + bothRadii &&
                circle1.y < circle2.y + bothRadii) {

                var distance2 = canvas.getDistance2(circle1.x, circle1.y, circle2.x, circle2.y);

                if (distance2 < bothRadii * bothRadii) {
                    point = {
                        x: ((circle1.x * circle2.radius) + (circle2.x * circle1.radius)) /
                        bothRadii,
                        y: ((circle1.y * circle2.radius) + (circle2.y * circle1.radius)) /
                        bothRadii,
                        ang: 0.0
                    };

                    point.ang = canvas.fastAtan2(
                        point.y - window.snake.yy, point.x - window.snake.xx);

                    if (window.visualDebugging) {
                        var collisionPointCircle = canvas.circle(
                            point.x,
                            point.y,
                            5
                        );
                        canvas.drawCircle(circle2, '#ff9900', false);
                        canvas.drawCircle(collisionPointCircle, '#66ff66', true);
                    }
                    return point;
                }
            }
            return false;
        }
    };
})();

var bot = window.bot = (function () {
    return {
        isBotRunning: false,
        isBotEnabled: true,
        lookForFood: false,
        collisionPoints: [],
        collisionAngles: [],
        foodAngles: [],
        scores: [],
        foodTimeout: undefined,
        sectorBoxSide: 0,
        defaultAccel: 0,
        sectorBox: {},
        currentFood: {},
        opt: {
            // target fps
            targetFps: 30,
            // size of arc for collisionAngles
            arcSize: Math.PI / 8,
            // radius multiple for circle intersects
            radiusMult: 10,
            // food cluster size to trigger acceleration
            foodAccelSz: 200,
            // maximum angle of food to trigger acceleration
            foodAccelDa: Math.PI / 3,
            // how many frames per food check
            foodFrames: 2,
            // how many frames to delay food check after collision
            foodDelay: 15,
            // base speed
            speedBase: 5.78,
            // front angle size
            frontAngle: Math.PI / 2,
            // percent of angles covered by same snake to be considered an encircle attempt
            enCircleThreshold: 0.5625,
            // percent of angles covered by all snakes to move to safety
            enCircleAllThreshold: 0.5625,
            // distance multiplier for enCircleAllThreshold
            enCircleDistanceMult: 20
        },
        MID_X: 0,
        MID_Y: 0,
        MAP_R: 0,
        MAXARC: 0,

        getSnakeWidth: function (sc) {
            if (sc === undefined) sc = window.snake.sc;
            return Math.round(sc * 29.0);
        },

        quickRespawn: function () {
            window.dead_mtm = 0;
            window.login_fr = 0;

            bot.isBotRunning = false;
            window.forcing = true;
            window.connect();
            window.forcing = false;
        },

        // angleBetween - get the smallest angle between two angles (0-pi)
        angleBetween: function (a1, a2) {
            var r1 = 0.0;
            var r2 = 0.0;

            r1 = (a1 - a2) % Math.PI;
            r2 = (a2 - a1) % Math.PI;

            return r1 < r2 ? -r1 : r2;
        },

        // Change heading to ang
        changeHeadingAbs: function (angle) {
            var cos = Math.cos(angle);
            var sin = Math.sin(angle);

            window.goalCoordinates = {
                x: Math.round(
                    window.snake.xx + (bot.headCircle.radius) * cos),
                y: Math.round(
                    window.snake.yy + (bot.headCircle.radius) * sin)
            };

            /*if (window.visualDebugging) {
                canvas.drawLine({
                    x: window.snake.xx,
                    y: window.snake.yy},
                    window.goalCoordinates, 'yellow', '8');
            }*/

            canvas.setMouseCoordinates(canvas.mapToMouse(window.goalCoordinates));
        },

        // Change heading by ang
        // +0-pi turn left
        // -0-pi turn right

        changeHeadingRel: function (angle) {
            var heading = {
                x: window.snake.xx + 500 * bot.cos,
                y: window.snake.yy + 500 * bot.sin
            };

            var cos = Math.cos(-angle);
            var sin = Math.sin(-angle);

            window.goalCoordinates = {
                x: Math.round(
                    cos * (heading.x - window.snake.xx) -
                    sin * (heading.y - window.snake.yy) + window.snake.xx),
                y: Math.round(
                    sin * (heading.x - window.snake.xx) +
                    cos * (heading.y - window.snake.yy) + window.snake.yy)
            };

            canvas.setMouseCoordinates(canvas.mapToMouse(window.goalCoordinates));
        },

        // Change heading to the best angle for avoidance.
        headingBestAngle: function () {
            var best;
            var distance;
            var openAngles = [];
            var openStart;

            var sIndex = bot.getAngleIndex(window.snake.ehang) + bot.MAXARC / 2;
            if (sIndex > bot.MAXARC) sIndex -= bot.MAXARC;

            for (var i = 0; i < bot.MAXARC; i++) {
                if (bot.collisionAngles[i] === undefined) {
                    distance = 0;
                    if (openStart === undefined) openStart = i;
                } else {
                    distance = bot.collisionAngles[i].distance;
                    if (openStart) {
                        openAngles.push({
                            openStart: openStart,
                            openEnd: i - 1,
                            sz: (i - 1) - openStart
                        });
                        openStart = undefined;
                    }
                }

                if (best === undefined ||
                    (best.distance < distance && best.distance !== 0)) {
                    best = {
                        distance: distance,
                        aIndex: i
                    }
                }
            }

            if (openStart && openAngles[0]) {
                openAngles[0].openStart = openStart;
                openAngles[0].sz = openAngles[0].openEnd - openStart;
                if (openAngles[0].sz < 0) openAngles[0].sz += bot.MAXARC;

            } else if (openStart) {
                openAngles.push({openStart: openStart, openEnd: openStart, sz: 0});
            }

            if (openAngles.length > 0) {
                openAngles.sort(bot.sortSz);
                bot.changeHeadingAbs(
                    (openAngles[0].openEnd - openAngles[0].sz / 2) * bot.opt.arcSize);
            } else {
                bot.changeHeadingAbs(best.aIndex * bot.opt.arcSize);
            }
        },

        // Avoid collision point by ang
        // ang radians <= Math.PI (180deg)
        avoidCollisionPoint: function (point, ang) {
            if (ang === undefined || ang > Math.PI) {
                ang = Math.PI;
            }

            var end = {
                x: window.snake.xx + 2000 * bot.cos,
                y: window.snake.yy + 2000 * bot.sin
            };

            if (window.visualDebugging) {
                canvas.drawLine(
                    { x: window.snake.xx, y: window.snake.yy },
                    end,
                    'orange', 5);
                canvas.drawLine(
                    { x: window.snake.xx, y: window.snake.yy },
                    { x: point.x, y: point.y },
                    'red', 5);
            }

            if (canvas.isLeft(
                { x: window.snake.xx, y: window.snake.yy }, end,
                { x: point.x, y: point.y })) {
                bot.changeHeadingAbs(point.ang - ang);
            } else {
                bot.changeHeadingAbs(point.ang + ang);
            }
        },

        // get collision angle index, expects angle +/i 0 to Math.PI
        getAngleIndex: function (angle) {
            var index;

            if (angle < 0) {
                angle += 2 * Math.PI;
            }

            index = Math.round(angle * (1 / bot.opt.arcSize));

            if (index === bot.MAXARC) {
                return 0;
            }
            return index;
        },

        // Add to collisionAngles if distance is closer
        addCollisionAngle: function (sp) {
            var ang = canvas.fastAtan2(
                Math.round(sp.yy - window.snake.yy),
                Math.round(sp.xx - window.snake.xx));
            var aIndex = bot.getAngleIndex(ang);

            var actualDistance = Math.round(Math.pow(
                Math.sqrt(sp.distance) - sp.radius, 2));

            if (bot.collisionAngles[aIndex] === undefined ||
                 bot.collisionAngles[aIndex].distance > sp.distance) {
                bot.collisionAngles[aIndex] = {
                    x: Math.round(sp.xx),
                    y: Math.round(sp.yy),
                    ang: ang,
                    snake: sp.snake,
                    distance: actualDistance,
                    radius: sp.radius,
                    aIndex: aIndex
                };
            }
        },

        // Add and score foodAngles
        addFoodAngle: function (f) {
            var ang = canvas.fastAtan2(
                Math.round(f.yy - window.snake.yy),
                Math.round(f.xx - window.snake.xx));

            var aIndex = bot.getAngleIndex(ang);

            canvas.getDistance2FromSnake(f);

            if (bot.collisionAngles[aIndex] === undefined ||
                Math.sqrt(bot.collisionAngles[aIndex].distance) >
                Math.sqrt(f.distance) + bot.snakeRadius * bot.opt.radiusMult * bot.speedMult / 2) {
                if (bot.foodAngles[aIndex] === undefined) {
                    bot.foodAngles[aIndex] = {
                        x: Math.round(f.xx),
                        y: Math.round(f.yy),
                        ang: ang,
                        da: Math.abs(bot.angleBetween(ang, window.snake.ehang)),
                        distance: f.distance,
                        sz: f.sz,
                        score: Math.pow(f.sz, 2) / f.distance
                    };
                } else {
                    bot.foodAngles[aIndex].sz += Math.round(f.sz);
                    bot.foodAngles[aIndex].score += Math.pow(f.sz, 2) / f.distance;
                    if (bot.foodAngles[aIndex].distance > f.distance) {
                        bot.foodAngles[aIndex].x = Math.round(f.xx),
                        bot.foodAngles[aIndex].y = Math.round(f.yy),
                        bot.foodAngles[aIndex].distance = f.distance;
                    }
                }
            }
        },

        // Get closest collision point per snake.
        getCollisionPoints: function () {
            var scPoint;

            bot.collisionPoints = [];
            bot.collisionAngles = [];


            for (var snake = 0, ls = window.snakes.length; snake < ls; snake++) {
                scPoint = undefined;

                if (window.snakes[snake].id !== window.snake.id &&
                    window.snakes[snake].alive_amt === 1) {

                    var s = window.snakes[snake];
                    var sRadius = bot.getSnakeWidth(s.sc) / 2;
                    var sSpMult = Math.min(1, s.sp / 5.78 - 1 );

                    scPoint = {
                        xx: s.xx + Math.cos(s.ehang) * sRadius * sSpMult * bot.opt.radiusMult / 2,
                        yy: s.yy + Math.sin(s.ehang) * sRadius * sSpMult * bot.opt.radiusMult / 2,
                        snake: snake,
                        radius: bot.headCircle.radius,
                        head: true
                    };

                    canvas.getDistance2FromSnake(scPoint);
                    bot.addCollisionAngle(scPoint);
                    bot.collisionPoints.push(scPoint);

                    if (window.visualDebugging) {
                        canvas.drawCircle(canvas.circle(
                            scPoint.xx,
                            scPoint.yy,
                            scPoint.radius),
                            'red', false);
                    }

                    scPoint = undefined;

                    for (var pts = 0, lp = s.pts.length; pts < lp; pts++) {
                        if (!s.pts[pts].dying &&
                            canvas.pointInRect(
                                {
                                    x: s.pts[pts].xx,
                                    y: s.pts[pts].yy
                                }, bot.sectorBox)
                        ) {
                            var collisionPoint = {
                                xx: s.pts[pts].xx,
                                yy: s.pts[pts].yy,
                                snake: snake,
                                radius: sRadius
                            };

                            if (window.visualDebugging && true === false) {
                                canvas.drawCircle(canvas.circle(
                                    collisionPoint.xx,
                                    collisionPoint.yy,
                                    collisionPoint.radius),
                                    '#00FF00', false);
                            }

                            canvas.getDistance2FromSnake(collisionPoint);
                            bot.addCollisionAngle(collisionPoint);

                            if (collisionPoint.distance <= Math.pow(
                                (bot.headCircle.radius)
                                + collisionPoint.radius, 2)) {
                                bot.collisionPoints.push(collisionPoint);
                                if (window.visualDebugging) {
                                    canvas.drawCircle(canvas.circle(
                                        collisionPoint.xx,
                                        collisionPoint.yy,
                                        collisionPoint.radius
                                    ), 'red', false);
                                }
                            }
                        }
                    }
                }
            }

            // WALL
            if (canvas.getDistance2(bot.MID_X, bot.MID_Y, window.snake.xx, window.snake.yy) >
                Math.pow(bot.MAP_R - 1000, 2)) {
                var midAng = canvas.fastAtan2(
                    window.snake.yy - bot.MID_X, window.snake.xx - bot.MID_Y);
                scPoint = {
                    xx: bot.MID_X + bot.MAP_R * Math.cos(midAng),
                    yy: bot.MID_Y + bot.MAP_R * Math.sin(midAng),
                    snake: -1,
                    radius: bot.snakeWidth
                };
                canvas.getDistance2FromSnake(scPoint);
                bot.collisionPoints.push(scPoint);
                bot.addCollisionAngle(scPoint);
                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        scPoint.xx,
                        scPoint.yy,
                        scPoint.radius
                    ), 'yellow', false);
                }
            }


            bot.collisionPoints.sort(bot.sortDistance);
            if (window.visualDebugging) {
                for (var i = 0; i < bot.collisionAngles.length; i++) {
                    if (bot.collisionAngles[i] !== undefined) {
                        canvas.drawLine(
                            { x: window.snake.xx, y: window.snake.yy },
                            { x: bot.collisionAngles[i].x, y: bot.collisionAngles[i].y },
                            'red', 2);
                    }
                }
            }
        },

        // Is collisionPoint (xx) in frontAngle
        inFrontAngle: function (point) {
            var ang = canvas.fastAtan2(
                Math.round(point.y - window.snake.yy),
                Math.round(point.x - window.snake.xx));

            if (Math.abs(bot.angleBetween(ang, window.snake.ehang)) < bot.opt.frontAngle) {
                return true;
            } else {
                return false;
            }

        },

        // Checks to see if you are going to collide with anything in the collision detection radius
        checkCollision: function () {
            var point;

            bot.getCollisionPoints();
            if (bot.collisionPoints.length === 0) return false;

            for (var i = 0; i < bot.collisionPoints.length; i++) {
                var collisionCircle = canvas.circle(
                    bot.collisionPoints[i].xx,
                    bot.collisionPoints[i].yy,
                    bot.collisionPoints[i].radius
                );

                // -1 snake is special case for non snake object.
                if ((point = canvas.circleIntersect(bot.headCircle, collisionCircle)) &&
                    bot.inFrontAngle(point)) {
                    if (bot.collisionPoints[i].snake !== -1 &&
                        bot.collisionPoints[i].head &&
                        window.snakes[bot.collisionPoints[i].snake].sp > 10) {
                        window.setAcceleration(1);
                    } else {
                        window.setAcceleration(bot.defaultAccel);
                    }
                    bot.avoidCollisionPoint(point);
                    return true;
                }
            }

            window.setAcceleration(bot.defaultAccel);
            return false;
        },

        checkEncircle: function () {
            var enSnake = [];
            var high = 0;
            var enAll = 0

            for (var i = 0; i < bot.collisionAngles.length; i++) {
                if (bot.collisionAngles[i] !== undefined) {
                    var s = bot.collisionAngles[i].snake;
                    if (enSnake[s]) {
                        enSnake[s]++
                    } else {
                        enSnake[s] = 1;
                    }
                    if (enSnake[s] > high) high = enSnake[s];

                    if (bot.collisionAngles[i].distance <
                        Math.pow(bot.snakeRadius * bot.opt.enCircleDistanceMult, 2)) {
                        enAll++;
                    }
                }
            }

            if (high > bot.MAXARC * bot.opt.enCircleThreshold) {
                bot.headingBestAngle();

                if (high !== bot.MAXARC) window.setAcceleration(1);

                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        window.snake.xx,
                        window.snake.yy,
                        bot.opt.radiusMult * bot.snakeRadius),
                        'red', true, 0.2);
                }
                return true;
            }

            if (enAll > bot.MAXARC * bot.opt.enCircleAllThreshold) {
                bot.headingBestAngle();
                window.setAcceleration(bot.defaultAccel);

                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        window.snake.xx,
                        window.snake.yy,
                        bot.snakeRadius * bot.opt.enCircleDistanceMult),
                        'yellow', true, 0.2);
                }
                return true;
            } else {
                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        window.snake.xx,
                        window.snake.yy,
                        bot.snakeRadius * bot.opt.enCircleDistanceMult),
                        'yellow');
                }
            }

            window.setAcceleration(bot.defaultAccel);
            return false;
        },

        // Sorting by property 'score' descending
        sortScore: function (a, b) {
            return b.score - a.score;
        },

        // Sorting by property 'sz' descending
        sortSz: function (a, b) {
            return b.sz - a.sz;
        },

        // Sorting by property 'distance' ascending
        sortDistance: function (a, b) {
            return a.distance - b.distance;
        },

        computeFoodGoal: function () {
            bot.foodAngles = [];

            for (var i = 0; i < window.foods.length && window.foods[i] !== null; i++) {
                var f = window.foods[i];

                if (!f.eaten &&
                    !(
                        canvas.circleIntersect(
                            canvas.circle(f.xx, f.yy, 2),
                            bot.sidecircle_l) ||
                        canvas.circleIntersect(
                            canvas.circle(f.xx, f.yy, 2),
                            bot.sidecircle_r))) {
                    bot.addFoodAngle(f);
                }
            }

            bot.foodAngles.sort(bot.sortScore);

            if (bot.foodAngles[0] !== undefined && bot.foodAngles[0].sz > 0) {
                bot.currentFood = { x: bot.foodAngles[0].x,
                                    y: bot.foodAngles[0].y,
                                    sz: bot.foodAngles[0].sz,
                                    da: bot.foodAngles[0].da };
            } else {
                bot.currentFood = { x: bot.MID_X, y: bot.MID_Y, sz: 0 };
            }
        },

        foodAccel: function () {
            var aIndex = 0;

            if (bot.currentFood && bot.currentFood.sz > bot.opt.foodAccelSz) {
                aIndex = bot.getAngleIndex(bot.currentFood.ang);

                if (
                    bot.collisionAngles[aIndex] && bot.collisionAngles[aIndex].distance >
                    bot.currentFood.distance + bot.snakeRadius * bot.opt.radiusMult
                    && bot.currentFood.da < bot.opt.foodAccelDa) {
                    return 1;
                }

                if (bot.collisionAngles[aIndex] === undefined
                    && bot.currentFood.da < bot.opt.foodAccelDa) {
                    return 1;
                }
            }

            return bot.defaultAccel;
        },

        every: function () {
            bot.MID_X = window.grd;
            bot.MID_Y = window.grd;
            bot.MAP_R = window.grd * 0.98;
            bot.MAXARC = (2 * Math.PI) / bot.opt.arcSize;

            bot.sectorBoxSide = Math.floor(Math.sqrt(window.sectors.length)) * window.sector_size;
            bot.sectorBox = canvas.rect(
                window.snake.xx - (bot.sectorBoxSide / 2),
                window.snake.yy - (bot.sectorBoxSide / 2),
                bot.sectorBoxSide, bot.sectorBoxSide);
            // if (window.visualDebugging) canvas.drawRect(bot.sectorBox, '#c0c0c0', true, 0.1);

            bot.cos = Math.cos(window.snake.ang);
            bot.sin = Math.sin(window.snake.ang);

            bot.speedMult = window.snake.sp / bot.opt.speedBase;
            bot.snakeRadius = bot.getSnakeWidth() / 2;
            bot.snakeWidth = bot.getSnakeWidth();
            bot.snakeLength = Math.floor(15 * (window.fpsls[window.snake.sct] + window.snake.fam /
                window.fmlts[window.snake.sct] - 1) - 5)

            bot.headCircle = canvas.circle(
                window.snake.xx + bot.cos * Math.min(1, bot.speedMult - 1) *
                bot.opt.radiusMult / 2 * bot.snakeRadius,
                window.snake.yy + bot.sin * Math.min(1, bot.speedMult - 1) *
                bot.opt.radiusMult / 2 * bot.snakeRadius,
                bot.opt.radiusMult / 2 * bot.snakeRadius
            );


            if (window.visualDebugging) {
                canvas.drawCircle(bot.headCircle, 'blue', false);
            }

            bot.sidecircle_r = canvas.circle(
                window.snake.lnp.xx -
                ((window.snake.lnp.yy + bot.sin * bot.snakeWidth) -
                    window.snake.lnp.yy),
                window.snake.lnp.yy +
                ((window.snake.lnp.xx + bot.cos * bot.snakeWidth) -
                    window.snake.lnp.xx),
                bot.snakeWidth * bot.speedMult
            );

            bot.sidecircle_l = canvas.circle(
                window.snake.lnp.xx +
                ((window.snake.lnp.yy + bot.sin * bot.snakeWidth) -
                    window.snake.lnp.yy),
                window.snake.lnp.yy -
                ((window.snake.lnp.xx + bot.cos * bot.snakeWidth) -
                    window.snake.lnp.xx),
                bot.snakeWidth * bot.speedMult
            );
        },

        // Main bot
        go: function () {
            bot.every();

            if (bot.checkCollision() || bot.checkEncircle()) {
                bot.lookForFood = false;
                if (bot.foodTimeout) {
                    window.clearTimeout(bot.foodTimeout);
                    bot.foodTimeout = window.setTimeout(
                        bot.foodTimer, 1000 / bot.opt.targetFps * bot.opt.foodDelay);
                }
            } else {
                bot.lookForFood = true;
                if (bot.foodTimeout === undefined) {
                    bot.foodTimeout = window.setTimeout(
                        bot.foodTimer, 1000 / bot.opt.targetFps * bot.opt.foodFrames);
                }
                window.setAcceleration(bot.foodAccel());
            }
        },

        // Timer version of food check
        foodTimer: function () {
            if (window.playing && bot.lookForFood &&
                window.snake !== null && window.snake.alive_amt === 1) {
                bot.computeFoodGoal();
                window.goalCoordinates = bot.currentFood;
                canvas.setMouseCoordinates(canvas.mapToMouse(window.goalCoordinates));
            }
            bot.foodTimeout = undefined;
        }
    };
})();

var userInterface = window.userInterface = (function () {
    // Save the original slither.io functions so we can modify them, or reenable them later.
    var original_keydown = document.onkeydown;
    var original_onmouseDown = window.onmousedown;
    var original_oef = window.oef;
    var original_redraw = window.redraw;
    var original_onmousemove = window.onmousemove;

    window.oef = function () { };
    window.redraw = function () { };

    return {
        overlays: {},

        initOverlays: function () {
            var botOverlay = document.createElement('div');
            botOverlay.style.position = 'fixed';
            botOverlay.style.right = '5px';
            botOverlay.style.bottom = '112px';
            botOverlay.style.width = '150px';
            botOverlay.style.height = '85px';
            // botOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            botOverlay.style.color = '#C0C0C0';
            botOverlay.style.fontFamily = 'Consolas, Verdana';
            botOverlay.style.zIndex = 999;
            botOverlay.style.fontSize = '14px';
            botOverlay.style.padding = '5px';
            botOverlay.style.borderRadius = '5px';
            botOverlay.className = 'nsi';
            document.body.appendChild(botOverlay);

            var serverOverlay = document.createElement('div');
            serverOverlay.style.position = 'fixed';
            serverOverlay.style.right = '5px';
            serverOverlay.style.bottom = '5px';
            serverOverlay.style.width = '160px';
            serverOverlay.style.height = '14px';
            serverOverlay.style.color = '#C0C0C0';
            serverOverlay.style.fontFamily = 'Consolas, Verdana';
            serverOverlay.style.zIndex = 999;
            serverOverlay.style.fontSize = '14px';
            serverOverlay.className = 'nsi';
            document.body.appendChild(serverOverlay);

            var prefOverlay = document.createElement('div');
            prefOverlay.style.position = 'fixed';
            prefOverlay.style.left = '10px';
            prefOverlay.style.top = '75px';
            prefOverlay.style.width = '260px';
            prefOverlay.style.height = '210px';
            // prefOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            prefOverlay.style.color = '#C0C0C0';
            prefOverlay.style.fontFamily = 'Consolas, Verdana';
            prefOverlay.style.zIndex = 999;
            prefOverlay.style.fontSize = '14px';
            prefOverlay.style.padding = '5px';
            prefOverlay.style.borderRadius = '5px';
            prefOverlay.className = 'nsi';
            document.body.appendChild(prefOverlay);

            var statsOverlay = document.createElement('div');
            statsOverlay.style.position = 'fixed';
            statsOverlay.style.left = '10px';
            statsOverlay.style.top = '295px';
            statsOverlay.style.width = '140px';
            statsOverlay.style.height = '210px';
            // statsOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            statsOverlay.style.color = '#C0C0C0';
            statsOverlay.style.fontFamily = 'Consolas, Verdana';
            statsOverlay.style.zIndex = 998;
            statsOverlay.style.fontSize = '14px';
            statsOverlay.style.padding = '5px';
            statsOverlay.style.borderRadius = '5px';
            statsOverlay.className = 'nsi';
            document.body.appendChild(statsOverlay);

            userInterface.overlays.botOverlay = botOverlay;
            userInterface.overlays.serverOverlay = serverOverlay;
            userInterface.overlays.prefOverlay = prefOverlay;
            userInterface.overlays.statsOverlay = statsOverlay;
        },

        toggleOverlays: function () {
            Object.keys(userInterface.overlays).forEach(function (okey) {
                var oVis = userInterface.overlays[okey].style.visibility !== 'hidden' ?
                    'hidden' : 'visible';
                userInterface.overlays[okey].style.visibility = oVis;
                window.visualDebugging = oVis === 'visible';
            });
        },

        // Save variable to local storage
        savePreference: function (item, value) {
            window.localStorage.setItem(item, value);
            userInterface.onPrefChange();
        },

        // Load a variable from local storage
        loadPreference: function (preference, defaultVar) {
            var savedItem = window.localStorage.getItem(preference);
            if (savedItem !== null) {
                if (savedItem === 'true') {
                    window[preference] = true;
                } else if (savedItem === 'false') {
                    window[preference] = false;
                } else {
                    window[preference] = savedItem;
                }
                window.log('Setting found for ' + preference + ': ' + window[preference]);
            } else {
                window[preference] = defaultVar;
                window.log('No setting found for ' + preference +
                    '. Used default: ' + window[preference]);
            }
            userInterface.onPrefChange();
            return window[preference];
        },

        // Saves username when you click on "Play" button
        playButtonClickListener: function () {
            userInterface.saveNick();
            userInterface.loadPreference('autoRespawn', false);
            userInterface.onPrefChange();
        },

        // Preserve nickname
        saveNick: function () {
            var nick = document.getElementById('nick').value;
            userInterface.savePreference('savedNick', nick);
        },

        // Hide top score
        hideTop: function () {
            var nsidivs = document.querySelectorAll('div.nsi');
            for (var i = 0; i < nsidivs.length; i++) {
                if (nsidivs[i].style.top === '4px' && nsidivs[i].style.width === '300px') {
                    nsidivs[i].style.visibility = 'hidden';
                    bot.isTopHidden = true;
                    window.topscore = nsidivs[i];
                }
            }
        },

        // Store FPS data
        framesPerSecond: {
            fps: 0,
            fpsTimer: function () {
                if (window.playing && window.fps && window.lrd_mtm) {
                    if (Date.now() - window.lrd_mtm > 970) {
                        userInterface.framesPerSecond.fps = window.fps;
                    }
                }
            }
        },

        onkeydown: function (e) {
            // Original slither.io onkeydown function + whatever is under it
            original_keydown(e);
            if (window.playing) {
                // Letter `T` to toggle bot
                if (e.keyCode === 84) {
                    bot.isBotEnabled = !bot.isBotEnabled;
                }
                // Letter 'U' to toggle debugging (console)
                if (e.keyCode === 85) {
                    window.logDebugging = !window.logDebugging;
                    console.log('Log debugging set to: ' + window.logDebugging);
                    userInterface.savePreference('logDebugging', window.logDebugging);
                }
                // Letter 'Y' to toggle debugging (visual)
                if (e.keyCode === 89) {
                    window.visualDebugging = !window.visualDebugging;
                    console.log('Visual debugging set to: ' + window.visualDebugging);
                    userInterface.savePreference('visualDebugging', window.visualDebugging);
                }
                // Letter 'I' to toggle autorespawn
                if (e.keyCode === 73) {
                    window.autoRespawn = !window.autoRespawn;
                    console.log('Automatic Respawning set to: ' + window.autoRespawn);
                    userInterface.savePreference('autoRespawn', window.autoRespawn);
                }
                // Letter 'H' to toggle hidden mode
                if (e.keyCode === 72) {
                    userInterface.toggleOverlays();
                }
                // Letter 'O' to change rendermode (visual)
                if (e.keyCode === 79) {
                    userInterface.toggleMobileRendering(!window.mobileRender);
                }
                // Letter 'A' to increase collision detection radius
                if (e.keyCode === 65) {
                    bot.opt.radiusMult++;
                    console.log(
                        'radiusMult set to: ' + bot.opt.radiusMult);
                }
                // Letter 'S' to decrease collision detection radius
                if (e.keyCode === 83) {
                    if (bot.opt.radiusMult > 1) {
                        bot.opt.radiusMult--;
                        console.log(
                            'radiusMult set to: ' +
                            bot.opt.radiusMult);
                    }
                }
                // Letter 'Z' to reset zoom
                if (e.keyCode === 90) {
                    canvas.resetZoom();
                }
                // Letter 'Q' to quit to main menu
                if (e.keyCode === 81) {
                    window.autoRespawn = false;
                    userInterface.quit();
                }
                // 'ESC' to quickly respawn
                if (e.keyCode === 27) {
                    bot.quickRespawn();
                }
                // Save nickname when you press "Enter"
                if (e.keyCode === 13) {
                    userInterface.saveNick();
                }
                userInterface.onPrefChange();
            }
        },

        onmousedown: function (e) {
            if (window.playing) {
                switch (e.which) {
                    // "Left click" to manually speed up the slither
                    case 1:
                        bot.defaultAccel = 1;
                        if (!bot.isBotEnabled) {
                            original_onmouseDown(e);
                        }
                        break;
                    // "Right click" to toggle bot in addition to the letter "T"
                    case 3:
                        bot.isBotEnabled = !bot.isBotEnabled;
                        break;
                }
            } else {
                original_onmouseDown(e);
            }
            userInterface.onPrefChange();
        },

        onmouseup: function () {
            bot.defaultAccel = 0;
        },

        // Manual mobile rendering
        toggleMobileRendering: function (mobileRendering) {
            window.mobileRender = mobileRendering;
            window.log('Mobile rendering set to: ' + window.mobileRender);
            userInterface.savePreference('mobileRender', window.mobileRender);
            // Set render mode
            if (window.mobileRender) {
                window.render_mode = 1;
                window.want_quality = 0;
                window.high_quality = false;
            } else {
                window.render_mode = 2;
                window.want_quality = 1;
                window.high_quality = true;
            }
        },

        // Update stats overlay.
        updateStats: function () {
            var oContent = [];
            var median;

            if (bot.scores.length === 0) return;

            median = Math.round((bot.scores[Math.floor((bot.scores.length - 1) / 2)] +
                bot.scores[Math.ceil((bot.scores.length - 1) / 2)]) / 2);

            oContent.push('games played: ' + bot.scores.length);
            oContent.push('a: ' + Math.round(
                bot.scores.reduce(function (a, b) { return a + b; }) / (bot.scores.length)) +
                ' m: ' + median);

            for (var i = 0; i < bot.scores.length && i < 10; i++) {
                oContent.push(i + 1 + '. ' + bot.scores[i]);
            }

            userInterface.overlays.statsOverlay.innerHTML = oContent.join('<br/>');
        },

        onPrefChange: function () {
            // Set static display options here.
            var oContent = [];
            var ht = userInterface.handleTextColor;

            oContent.push('version: ' + GM_info.script.version);
            oContent.push('[T] bot: ' + ht(bot.isBotEnabled));
            oContent.push('[O] mobile rendering: ' + ht(window.mobileRender));
            oContent.push('[A/S] radius multiplier: ' + bot.opt.radiusMult);
            oContent.push('[I] auto respawn: ' + ht(window.autoRespawn));
            oContent.push('[Y] visual debugging: ' + ht(window.visualDebugging));
            oContent.push('[U] log debugging: ' + ht(window.logDebugging));
            oContent.push('[Mouse Wheel] zoom');
            oContent.push('[Z] reset zoom');
            oContent.push('[ESC] quick respawn');
            oContent.push('[Q] quit to menu');

            userInterface.overlays.prefOverlay.innerHTML = oContent.join('<br/>');
        },

        onFrameUpdate: function () {
            // Botstatus overlay
            var oContent = [];

            if (window.playing && window.snake !== null) {
                oContent.push('fps: ' + userInterface.framesPerSecond.fps);

                // Display the X and Y of the snake
                oContent.push('x: ' +
                    (Math.round(window.snake.xx) || 0) + ' y: ' +
                    (Math.round(window.snake.yy) || 0));

                if (window.goalCoordinates) {
                    oContent.push('target');
                    oContent.push('x: ' + window.goalCoordinates.x + ' y: ' +
                        window.goalCoordinates.y);
                    if (window.goalCoordinates.sz) {
                        oContent.push('sz: ' + window.goalCoordinates.sz);
                    }
                }

                if (window.bso !== undefined && userInterface.overlays.serverOverlay.innerHTML !==
                    window.bso.ip + ':' + window.bso.po) {
                    userInterface.overlays.serverOverlay.innerHTML =
                        window.bso.ip + ':' + window.bso.po;
                }
            }

            userInterface.overlays.botOverlay.innerHTML = oContent.join('<br/>');


            if (window.playing && window.visualDebugging) {
                // Only draw the goal when a bot has a goal.
                if (window.goalCoordinates && bot.isBotEnabled) {
                    var headCoord = { x: window.snake.xx, y: window.snake.yy };
                    canvas.drawLine(
                        headCoord,
                        window.goalCoordinates,
                        'green');
                    canvas.drawCircle(window.goalCoordinates, 'red', true);
                }
            }
        },

        oefTimer: function () {
            var start = Date.now();
            canvas.maintainZoom();
            original_oef();
            original_redraw();

            if (window.playing && bot.isBotEnabled && window.snake !== null) {
                window.onmousemove = function () { };
                bot.isBotRunning = true;
                bot.go();
            } else if (bot.isBotEnabled && bot.isBotRunning) {
                bot.isBotRunning = false;
                if (window.lastscore && window.lastscore.childNodes[1]) {
                    bot.scores.push(parseInt(window.lastscore.childNodes[1].innerHTML));
                    bot.scores.sort(function (a, b) { return b - a; });
                    userInterface.updateStats();
                }

                if (window.autoRespawn) {
                    window.connect();
                }
            }

            if (!bot.isBotEnabled || !bot.isBotRunning) {
                window.onmousemove = original_onmousemove;
            }

            userInterface.onFrameUpdate();
           // setTimeout(userInterface.oefTimer, (1000 / bot.opt.targetFps) - (Date.now() - start));
        },

        // Quit to menu
        quit: function () {
            if (window.playing && window.resetGame) {
                window.want_close_socket = true;
                window.dead_mtm = 0;
                if (window.play_btn) {
                    window.play_btn.setEnabled(true);
                }
                window.resetGame();
            }
        },

        // Update the relation between the screen and the canvas.
        onresize: function () {
            window.resize();
            // Canvas different size from the screen (often bigger).
            canvas.canvasRatio = {
                x: window.mc.width / window.ww,
                y: window.mc.height / window.hh
            };
        },

        handleTextColor: function (enabled) {
            return '<span style=\"color:' +
                (enabled ? 'green;\">enabled' : 'red;\">disabled') + '</span>';
        }
    };
})();

window.oef = userInterface.oefTimer

// Main
(function () {
    window.play_btn.btnf.addEventListener('click', userInterface.playButtonClickListener);
    document.onkeydown = userInterface.onkeydown;
    window.onmousedown = userInterface.onmousedown;
    window.addEventListener('mouseup', userInterface.onmouseup);
    window.onresize = userInterface.onresize;

    // Hide top score
    userInterface.hideTop();

    // Overlays
    userInterface.initOverlays();

    // Load preferences
    userInterface.loadPreference('logDebugging', false);
    userInterface.loadPreference('visualDebugging', false);
    userInterface.loadPreference('autoRespawn', false);
    userInterface.loadPreference('mobileRender', false);
    window.nick.value = userInterface.loadPreference('savedNick', 'Slither.io-bot');

    // Listener for mouse wheel scroll - used for setZoom function
    document.body.addEventListener('mousewheel', canvas.setZoom);
    document.body.addEventListener('DOMMouseScroll', canvas.setZoom);

    // Set render mode
    if (window.mobileRender) {
        userInterface.toggleMobileRendering(true);
    } else {
        userInterface.toggleMobileRendering(false);
    }

    // Unblocks all skins without the need for FB sharing.
    window.localStorage.setItem('edttsg', '1');

    // Remove social
    window.social.remove();

    // Maintain fps
    setInterval(userInterface.framesPerSecond.fpsTimer, 80);

    // Start!
    userInterface.oefTimer();
})();

