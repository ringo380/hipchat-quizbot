# hipchat-quizbot
A quizbot for HipChat


## Installation
* Fork repository
* Create heroku app at http://heroku.com
  * Add a ClearDB MySQL and a Heroku Redis to the app
* Configure the config.json and routes/index.js (Line 18) for correct deployment URLs  
* Insert questions.de via SQL into the ClearDB MySQL
* deploy to heroku (connect heroku to your github)
* find a hipchat room and integrate the bot ("Build your own integration" -> "Install an integration from a descriptor URL"  -> <Path to your heroku app>/atlassian-connect.json )

## ToDo
* Help command
* move DB config
* make score mode configurable to allow max number of points per player instead of max number of rounds
* use glance to show status
* use sidebar to track current player scores
* create sidebar for global scoreboard over multiple quizzes
* show categories of questions
* use difficulties of questions
