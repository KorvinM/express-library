# Express Library

A learning project to construct a basic MVC Express application.

Based on the Mozilla Development Network's [Express Tutorial: The Local Library website](https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/Tutorial_local_library_website) 

## Usage
* To install, clone the repo and run `npm install`
* Rename sample-config.js to config.js
* Create a development database at Mongodb.com, and add the uri for the database to config.js where indicated
* Ensure your node environment variable is set to 'development':

  __Windows:__
  `SET NODE_ENV=development`
  or
  `set NODE_ENV=development`

  __OS X / Linux:__
  `export NODE_ENV=development`

  __Windows CMD__:
  `set NODE_ENV=development`

  __Windows PowerShell:__
  `$env:NODE_ENV="development"`
  
  (The commands shown above are from [this comment](https://davidwalsh.name/node-environment-variables#comment-510249))
* To start, run `npm run serverstart`.

## TODO
* Implement auth
* Implement more control over production and dev modes
* moment.js is now considered deprecated. Replace with alternative
* improve styling
* make app generally more user-friendly and efficient: 'more robust' as the original tutorial puts it
