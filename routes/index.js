// var http = require('request');
// var cors = require('cors');
// var uuid = require('uuid');
// var url = require('url');
var round = 0;
var maxrounds = 10;
var players = [];
var gameIsRunning = false;
var items = null;
var falseTryCounter = 1;
var maxFalseTries = 10;
var currentRegex = [];
var nextCount = 0;

var mysql = require('mysql');
var mysqlConnection = null;

var dbConfig = {'host': 'localhost', 'user': 'quizbot', 'password': 'quiz123!987bot', 'database': 'quizbot'};

function handleDisconnect(){
  mysqlConnection = mysql.createConnection(dbConfig); // Recreate the connection, since
                                                  // the old one cannot be reused.

  mysqlConnection.connect(function(err){              // The server is either down
    if(err){                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  mysqlConnection.on('error', function(err){
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST'){ // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

function resetGlobalVars(){
  gameIsRunning = false;
  round = 0;
  maxrounds = 10;
  nextCount = 0;
  players = [];
  currentRegex = [];
}

function generateAnswerRegexs(){
  var correctAnswer = items[round-1]["answer"];
  if (items[round-1]["regex"] !== null && items[round-1]["regex"] !== "" ){
    correctAnswer = items[round-1]["regex"];
  }
  if (correctAnswer.indexOf("#") > -1) {
    var part1Answer = correctAnswer.split("#");
    currentRegex.push(new RegExp(part1Answer[1], "i"));

    var part2Answer = correctAnswer.replace(/#/g, "");
    currentRegex.push(new RegExp(part2Answer, "i"));
  } else {
    currentRegex.push(new RegExp(correctAnswer, "i"));
  }
}

function resetQuestions(hipchat, req){
  console.log(hipchat);
  var oldAnswer = items[round-1]["answer"];
  mysqlConnection.query("SELECT * FROM items2 ORDER BY RAND() LIMIT " + maxrounds, function(error, results, fields) {
  try {
    console.log(results);
    items = results;
  } catch (err) {
    console.log("DB Error: " + err.message);
    console.log(error);
    hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Error getting questions from database')
      .then(function(data) {
         res.sendStatus(200);
      });
  }

  falseTryCounter = 1;
  currentRegex = [];
  nextCount = 0;
  generateAnswerRegexs();
  console.log(currentRegex);
  hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'No one answered the question correctly :( </br> The correct answer was: ' + oldAnswer +'</br> New Question: '+ items[round-1]["question"])
    .then(function(data) {
       res.sendStatus(200);
    });
});
}

// This is the heart of your HipChat Connect add-on. For more information,
// take a look at https://developer.atlassian.com/hipchat/tutorials/getting-started-with-atlassian-connect-express-node-js
module.exports = function(app, addon) {
  var hipchat = require('../lib/hipchat')(addon);

  // simple healthcheck
  app.get('/healthcheck', function(req, res) {
    res.send('OK');
  });

  // Root route. This route will serve the `addon.json` unless a homepage URL is
  // specified in `addon.json`.
  app.get('/',
    function (req, res) {
      // Use content-type negotiation to choose the best way to respond
      res.format({
        // If the request content-type is text-html, it will decide which to serve up
        'text/html': function () {
          var homepage = url.parse(addon.descriptor.links.homepage);
          if (homepage.hostname === req.hostname && homepage.path === req.path) {
            res.render('homepage', addon.descriptor);
          } else {
            res.redirect(addon.descriptor.links.homepage);
          }
        },
        // This logic is here to make sure that the `addon.json` is always
        // served up when requested by the host
        'application/json': function () {
          res.redirect('/atlassian-connect.json');
        }
      });
    }
    );

  // This is an example route that's used by the default for the configuration page
  // https://developer.atlassian.com/hipchat/guide/configuration-page
  app.get('/config',
    // Authenticates the request using the JWT token in the request
    addon.authenticate(),
    function(req, res) {
      // The `addon.authenticate()` middleware populates the following:
      // * req.clientInfo: useful information about the add-on client such as the
      //   clientKey, oauth info, and HipChat account info
      // * req.context: contains the context data accompanying the request like
      //   the roomId
      res.render('config', req.context);
    }
    );

  // This is an example glance that shows in the sidebar
  // https://developer.atlassian.com/hipchat/guide/glances
/*  app.get('/glance',
    cors(),
    addon.authenticate(),
    function (req, res) {
      res.json({
        "label": {
          "type": "html",
          "value": "Hello World!"
        },
        "status": {
          "type": "lozenge",
          "value": {
            "label": "NEW",
            "type": "error"
          }
        }
      });
    }
    );*/

  // This is an example end-point that you can POST to to update the glance info
  // Room update API: https://www.hipchat.com/docs/apiv2/method/room_addon_ui_update
  // Group update API: https://www.hipchat.com/docs/apiv2/method/addon_ui_update
  // User update API: https://www.hipchat.com/docs/apiv2/method/user_addon_ui_update
/*  app.post('/update_glance',
    cors(),
    addon.authenticate(),
    function (req, res) {
      res.json({
        "label": {
          "type": "html",
          "value": "Hello World!"
        },
        "status": {
          "type": "lozenge",
          "value": {
            "label": "All good",
            "type": "success"
          }
        }
      });
    }
    );*/

  // This is an example sidebar controller that can be launched when clicking on the glance.
  // https://developer.atlassian.com/hipchat/guide/dialog-and-sidebar-views/sidebar
/*  app.get('/sidebar',
    addon.authenticate(),
    function (req, res) {
      res.render('sidebar', {
        'identity': req.identity
      });
    }
    );*/

  // This is an example dialog controller that can be launched when clicking on the glance.
  // https://developer.atlassian.com/hipchat/guide/dialog-and-sidebar-views/dialog
/*  app.get('/dialog',
    addon.authenticate(),
    function (req, res) {
      res.render('dialog', {
        'identity': req.identity
      });
    }
    );*/

  // Sample endpoint to send a card notification back into the chat room
  // See https://developer.atlassian.com/hipchat/guide/sending-messages
/*  app.post('/send_notification',
    addon.authenticate(),
    function (req, res) {
      var card = {
        "style": "link",
        "url": "https://www.hipchat.com",
        "id": uuid.v4(),
        "title": req.body.messageTitle,
        "description": "Great teams use HipChat: Group and private chat, file sharing, and integrations",
        "icon": {
          "url": "https://hipchat-public-m5.atlassian.com/assets/img/hipchat/bookmark-icons/favicon-192x192.png"
        }
      };
      var msg = '<b>' + card.title + '</b>: ' + card.description;
      var opts = { 'options': { 'color': 'yellow' } };
      hipchat.sendMessage(req.clientInfo, req.identity.roomId, msg, opts, card);
      res.json({ 'status': "ok" });
    }
    );*/

  app.post('/startquiz',
    addon.authenticate(),
    function(req, res) {

      //check for db connection
      if (mysqlConnection === null){
        console.log("Retrieve Database connection");
        handleDisconnect();
      }
      // check for custom number of rounds
      var parameters = req["body"]["item"]["message"]["message"].split(" ");
      if (parameters[1] !== null && !isNaN(parseFloat(parameters[1])) && isFinite(parameters[1])) {
        maxrounds = parameters[1];
      }
      // reset game
      gameIsRunning = true;
      round = 1;
      nextCount = 0;
      falseTryCounter = 1;

      mysqlConnection.query("SELECT * FROM items2 ORDER BY RAND() LIMIT " + maxrounds, function(error, results, fields) {
        try {
          console.log(results);
          items = results;
        } catch (err) {
          console.log("DB Error: " + err.message);
          console.log(error);
          hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Error getting questions from database')
            .then(function(data) {
              res.sendStatus(200);
            });
        }

      // players = hipchat.user;
          falseTryCounter = 1;
          generateAnswerRegexs();
          console.log(currentRegex);
          hipchat.sendMessage(req.clientInfo, req.identity.roomId,
            'Ready! Set! Go! </br> Round ' + round + ' of '+maxrounds + '</br>' + items[round-1]["question"])
            .then(function(data) {
              res.sendStatus(200);
          });
        });
      });

      app.post('/answer',
        addon.authenticate(),
        function(req, res) {
          if (gameIsRunning){
            var proposed_answer = req["body"]["item"]["message"]["message"].toLowerCase();
            console.log(proposed_answer);
            var success = false;
            for (var r in currentRegex) {
              if (currentRegex[r].test(proposed_answer)) {
                success = true;
              }
            }

          if (success) {
            // correct answer
            var currentPlayerName = req["body"]["item"]["message"]["from"]["name"];
            var nameFound = false;
            for (var p in players){
              if (players[p]["name"] === currentPlayerName) {
                nameFound = true;
                console.log("add point to existing player");
                players[p]["points"] = players[p]["points"] + 1;
              }
            }
            if (!nameFound) {
              console.log("new player");
              players.push({'name': currentPlayerName, 'points': 1});
            }

            // tell its correct
            // if the round is still going give the next question
	    var currentRanking = "";
	    for (var p in players) {
              currentRanking = currentRanking.concat(players[p]["name"]);
              currentRanking = currentRanking.concat(": ");
              currentRanking = currentRanking.concat(players[p]["points"]);
              currentRanking = currentRanking.concat("; ");
	    }

            if (round < maxrounds) {
              round = round + 1;
              falseTryCounter = 1;
              currentRegex = [];
              nextCount = 0;
              generateAnswerRegexs();
              console.log(currentRegex);
              hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Correct! '+currentPlayerName+' gets a point </br> Current Ranking: ' + currentRanking + '</br> Next Question: ' + items[round-1]["question"])
                .then(function(data) {
                  res.sendStatus(200);
                });
            } else {
              resetGlobalVars();
              hipchat.sendMessage(req.clientInfo, req.identity.roomId,
                'Game Finished! Thank your for playing! </br> Final Score: ' + currentRanking)
                .then(function(data) {
                    res.sendStatus(200);
                });
            }
          } else {
            if (falseTryCounter >= maxFalseTries) {
              resetQuestions(hipchat, req);
            }
            falseTryCounter = falseTryCounter + 1;
          }
        }
      }
    );

  app.post('/again',
    addon.authenticate(),
    function(req, res) {
      hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Current Question: ' + items[round-1]["question"])
        .then(function (data) {
          res.sendStatus(200);
        });
    }
    );

 app.post('/next',
    addon.authenticate(),
    function(req, res) {
      nextCount = nextCount + 1;     
      console.log("vote next");
      var halfNumberOfPlayer = 1;
      if (players !== null){
        halfNumberOfPlayer = players.length/2
      }
      console.log(halfNumberOfPlayer);
      if (nextCount > halfNumberOfPlayer) {
        console.log("reset question");
        resetQuestions(hipchat, req);
      }
    }
    );


  // This is an example route to handle an incoming webhook
  // https://developer.atlassian.com/hipchat/guide/webhooks
  app.post('/stopquiz',
    addon.authenticate(),
    function(req, res) {
      console.log(round);
      resetGlobalVars();

      hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'All quizzes stopped. Please restart with /startquiz {number of rounds. default 10}')
        .then(function (data) {
          res.sendStatus(200);
        });
    }
    );

  // Notify the room that the add-on was installed. To learn more about
  // Connect's install flow, check out:
  // https://developer.atlassian.com/hipchat/guide/installation-flow
  addon.on('installed', function(clientKey, clientInfo, req) {
    hipchat.sendMessage(clientInfo, req.body.roomId, 'The ' + addon.descriptor.name + ' is ready to quiz with /startquiz {number of rounds. default 10}');
  });

  // Clean up clients when uninstalled
  addon.on('uninstalled', function(id) {
    hipchat.sendMessage(clientInfo, req.body.roomId, 'The ' + addon.descriptor.name + ' has left the building!');
    addon.settings.client.keys(id + ':*', function (err, rep) {
      rep.forEach(function (k) {
        addon.logger.info('Removing key:', k);
        addon.settings.client.del(k);
      });
    });
  });

};
