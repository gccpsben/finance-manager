# Backend Docs

## Setup
To setup the backend server, run the following command. This will install all of the required dependancies from package.json
```npm
npm install
```
Next, a ``.env`` file is needed to store all of the database and sensitive settings.

If there are no ``.env`` files, create one using ```touch ./.env``` on the command line.

Inside the file, add all of your settings as follows:

```env
FINANCE_DB_PROTOCAL=mongodb+srv
FINANCE_DB_USERNAME=...
FINANCE_DB_PASSWORD=...
FINANCE_DB_HOST=... <example: main.xxxxxx.mongodb.net>
FINANCE_DB_FULL_URL=$FINANCE_DB_PROTOCAL://$FINANCE_DB_USERNAME:$FINANCE_DB_PASSWORD@$FINANCE_DB_HOST

PORT=55559
SSL_KEY_PATH=/ssl/.key
SSL_PEM_PATH=/ssl/.pem-chain
JWT_SECRET=...
```
If you don't want to run the server in HTTPS mode, you can leave the ``SSL_KEY_PATH`` and ``SSL_PEM_PATH`` blank.
Now with all things done, start the server with:
```npm
npm run watch_server
```

Expected output:
```log
3:43:43 - Starting compilation in watch mode...

3:43:48 - Found 0 errors. Watching for file changes.
Running in HTTPS mode.
Connecting to finance database...
Connected to finance database and set up mongoose.
Started listening on 55559
Successfully fetched UST price 0.113504.
Successfully fetched BTC price 210145.
Successfully fetched LTC price 710.06.
Successfully fetched USDT price 7.83.
Successfully fetched XNO price 5.56.
```

> Please use ``Git Bash`` or similiar shell as terminal, otherwise colors may not show up correctly. (Like using Windows Default CMD)

Verify server by going to https://localhost:55559/api/ (HTTPS mode) or http://localhost:55559/api/ (HTTP mode) in your browser.

Expected output:
```json
{ "message": "welcome to the entry API" }
```

You have successfully started the backend server.

> If you are seeing security warning or connection reset errors, please make sure your url is using the correct HTTP protocol.

## API and Endpoints

### RESTful Endpoints
