var http = require('request');
var cors = require('cors');
var uuid = require('uuid');
var url = require('url');
var round = 0;
var maxrounds = 3;
var players = [];
var gameIsRunning = false;
var items = null;
var falseTryCounter = 0;
var maxFalseTries = 10;

var mysql = require('mysql');
var mysql_connection = mysql.createConnection({host : 'localhost', user : 'root', password : '', database : 'quizbot'});
mysql_connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
  console.log('connected to mysql db as id ' + mysql_connection.threadId);
});

// This is the heart of your HipChat Connect add-on. For more information,
// take a look at https://developer.atlassian.com/hipchat/tutorials/getting-started-with-atlassian-connect-express-node-js
module.exports = function (app, addon) {
  var hipchat = require('../lib/hipchat')(addon);

  // simple healthcheck
  app.get('/healthcheck', function (req, res) {
    res.send('OK');
  });

  // Root route. This route will serve the `addon.json` unless a homepage URL is
  // specified in `addon.json`.
/*  app.get('/',
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
    );*/

  // This is an example route that's used by the default for the configuration page
  // https://developer.atlassian.com/hipchat/guide/configuration-page
  app.get('/config',
    // Authenticates the request using the JWT token in the request
    addon.authenticate(),
    function (req, res) {
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
        identity: req.identity
      });
    }
    );*/

  // This is an example dialog controller that can be launched when clicking on the glance.
  // https://developer.atlassian.com/hipchat/guide/dialog-and-sidebar-views/dialog
/*  app.get('/dialog',
    addon.authenticate(),
    function (req, res) {
      res.render('dialog', {
        identity: req.identity
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
      res.json({ status: "ok" });
    }
    );*/

  app.post('/startquiz',
    addon.authenticate(),
    function (req, res) {
      //reset game
      gameIsRunning = true;
      round = 1;
      falseTryCounter = 0;

      mysql_connection.query("SELECT * FROM items ORDER BY RAND() LIMIT 10", function (error, results, fields) {
        try {
          console.log(results);
          items = results;
        } catch(err) {
            console.log("DB Error: "+ err.message);
            console.log(error);
            hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Error getting questions from database')
              .then(function (data) {
                res.sendStatus(200);
              });
        }

      //players = hipchat.user;
      console.log(items);
      hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Round '+round+' of '+maxrounds);
      hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Ready! Set! Go!');
      falseTryCounter = 0;
      hipchat.sendMessage(req.clientInfo, req.identity.roomId, items[round-1]["question"])
        .then(function (data) {
          res.sendStatus(200);
        });
      });
    });

    app.post('/answer',
      addon.authenticate(),
      function (req, res) {
        if (gameIsRunning) {
          proposed_answer = req["body"]["item"]["message"]["message"].toLowerCase();
          console.log(proposed_answer);
          correct_answer = items[round-1]["answer"].toLowerCase();
          console.log(correct_answer);
          if (correct_answer.indexOf('\"'+proposed_answer+'\"') > -1) {
            //correct answer
            currentPlayerName = req["body"]["item"]["message"]["from"]["name"];
            nameFound = false;
            for (p in players){
              if (players[p]["name"] == currentPlayerName) {
                nameFound = true;
                console.log("add point to existing player");
                players[p]["points"] = players[p]["points"] + 1;
              }
            }
            if (!nameFound){
              console.log("new player")
              players.push({name: currentPlayerName, points: 1});
            }

            //tell its correct
            //if the round is still going give the next question
              hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Correct! '+currentPlayerName+' gets a point');
              currentRanking = "";
              for (p in players){
                currentRanking = currentRanking.concat(players[p]["name"]);
                currentRanking = currentRanking.concat(": ");
                currentRanking = currentRanking.concat(players[p]["points"]);
                currentRanking = currentRanking.concat("; ");
              }
              hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Current Ranking: '+ currentRanking);

            if (round < maxrounds) {
              round = round + 1;
              falseTryCounter = 0;
              hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Next Question: '+ items[round-1]["question"])
                .then(function (data) {
                  res.sendStatus(200);
                });
            } else {
              gameIsRunning = false;
              hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Game Finished! Thank your for playing!')
                .then(function (data) {
                  res.sendStatus(200);
                });
            }
          } else {
            if (falseTryCounter >= maxFalseTries)
            {
                hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'No one answered the question correctly :( ');
                round = round + 1;
                falseTryCounter = 0;
                hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Next Question: '+ items[round-1]["question"])
                  .then(function (data) {
                    res.sendStatus(200);
                  });
            }
            falseTryCounter = falseTryCounter + 1;
          }
        }
      }
    );

  // This is an example route to handle an incoming webhook
  // https://developer.atlassian.com/hipchat/guide/webhooks
  app.post('/stopquiz',
    addon.authenticate(),
    function (req, res) {
      console.log(round);
      gameIsRunning = false;
      round = 0;
      players = [];

      hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'stop')
        .then(function (data) {
          res.sendStatus(200);
        });
    }
    );

  // Notify the room that the add-on was installed. To learn more about
  // Connect's install flow, check out:
  // https://developer.atlassian.com/hipchat/guide/installation-flow
  addon.on('installed', function (clientKey, clientInfo, req) {
    hipchat.sendMessage(clientInfo, req.body.roomId, 'The ' + addon.descriptor.name + ' add-on is ready to quiz!');
  });

  // Clean up clients when uninstalled
  addon.on('uninstalled', function (id) {
    hipchat.sendMessage(clientInfo, req.body.roomId, 'The ' + addon.descriptor.name + ' has left the building!');
    addon.settings.client.keys(id + ':*', function (err, rep) {
      rep.forEach(function (k) {
        addon.logger.info('Removing key:', k);
        addon.settings.client.del(k);
      });
    });
  });

};
