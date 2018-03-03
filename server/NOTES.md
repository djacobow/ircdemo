# Setup Notes

## Installing nodejs

I do not recommend the node that comes in the ubuntu repos.
Instead, use NVM to install a recent one. I've tested with 9.7.0

https://github.com/creationix/nvm

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
  "DJmtFWMWh6VgrLSTO6+dGZZKMJeRW6sBfjtfFXKtlugyyPbDVDrQxZ4BzvcN96ce91HPxFLmbtjsA0WXl6Zff0YS0pf0Dk6HBvv3eZsiFOb2ajUXMyfH6/HhKdBKmkblQh9vIFSxq/7FH7J1vvO7vrVuXSv/ZaIzrpmQx3T3Rdg=",
  "J2rM13oXCbE5jrk8UcN1bbFKQYRQ75S3X0rEXQcQs9nzVJq/oy3J7eNFiEJtYN1xh58eebkO/vrjd8OgVGBTGwNp69K6IhwBXHmiLC+0L20D+MTyTW6g7Lo+zoB9Offd6SNbFi/9LHHHFoF6uinuwZMEtwrnWVu6mi2kUQls9eY=",
  "+3hozL4i7TOgA9gINttIaIAkBoZ5wvjFw7Muu4yXnJ2ViIIGTrJoEOnXTUe7AuoTJERtXB5JzrUAK2ABrZZ+wbct2DcDbhLSzg0sj7Kg3ifAeQ+5A9PzfAXhz4lKJxscPb7UXpsirYK+291XxmP38lrnaeObuN6T/RaDOrmGVDI="
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
  create database raddemo;`
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


