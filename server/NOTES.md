# Setup Notes

## Installing nodejs

I do not recommend the node that comes in the ubuntu repos.
Instead, use NVM to install a recent one. I've tested with 9.7.0

https://github.com/creationix/nvm

## install necessary node modules

`npm install` should be all you need.

## Missing files.

Several files needed to run this server are not checked into the repo.

`mysql_creds.json`

Contains credentials for mysql for storing data. The file should look like this:

```json
{
    "db": {
        "name": "raddemo",
        "max_name_length" : 20,
        "conn_params": {
            "host": "localhost",
            "user": "rad_poster",
            "password": "lalalalalaleelee"
        }
    }
}
```

`provisioning_tokens.json`

Contains tokens that new sensor clients will need to match in order 
to register themselves. A sensor client device needs to have only one
of these, but you can have several. This lets you add and take away
if necessary.

```json
[
  "lalalalalaleeeleeellee",
  "fdfdsfdsfdfdfsdfdsfsdf",
  "2340982423jksndfsdkn2r9"
]
```

`sensor_params.json`

Contains parameters for specific client devices, in case you want to 
override default settings on their local parameters file. For example,
if you want to change the upload rate, you do not have to log into the 
client device and make the change. You can change it here and the client
device will pick up the changed parameter.

This file needs to be present, but it can be empty.

```json
{
    "d3s_CR0F79K13L": {
        "foobinator": 5.93
    },
    "d3s_GSVAW3Q3P0": {
    }
}
```

## credentials database

Credentials for provisioned clients are stored in a sqlite 
database. It will be created for you when you run and no 
configuration is required.

## Mysql Database preparation

1. Install mysql by your package manager.

   `sudo apt install mysql-server` or similar.

2. Finish the mysql install. Usually something like:

   `mysql_secure_installation`

   You'll set a password for root and whatnot

3. Start mysql as root

   `mysql -u root -p`

   Enter your password.


4. Create the database:

   ```mysql
   create database raddemo;
   ```

5. Create a user

   ```mysql
   create user rad_poster@localhost;`
   ```

6. Give the user appropriate permissions

   ```mysql
   grant create on raddemo.* to rad_poster@localhost;
   grant select on raddemo.* to rad_poster@localhost;
   grant insert on raddemo.* to rad_poster@localhost;
   grant update on raddemo.* to rad_poster@localhost;
   ```

7. Flush privileges and exit

   ```mysql
   fliuh priviliges;
   exit;
   ```

8. Run storer.js so that it will create the necessary
   table(s)

   `node storer.js`

   You'll have to ^C out of that.


## Running

You can run the server with 

`/path/to/node index.js`

but a better way to do it is to make it a service run under 
systemd. A sample ircdemo.service file is provided. On most 
systems you'll

1. `sudo cp ircdemo.service /etc/systemd/system/`
2. `sudo systemctl enable ircdemo`
3. `sudo systemctl start icrdemo`

You can see how things are going like this:

`sudo journalctl -f -u ircdemo`


