# Setup notes for configuration a sensor node

## Install raspbian

There's enough help for this on the interwebs. I recommend
that you install NOOBS, then choose the Raspbian Lite version.
Be sure to set the keyboard and language to US English.

Boot up and log. If you plan on being able to ssh into these
nodes, use rasp-config to enable ssh.

## Install all the packages you need

The easiest way to determine this list is to just run the 
capture.py program and see what comaplaints you get. Most 
of the missing dependencies can be found in the ubuntu repos,
but a few need to be installed with pip3.

## Missing files

There are several files you'll need that are not in the repo:

`device_name.txt`

This is the name of the node as it'll be stored on the system.

Example:
```
bob
```

`credentials.json`

You do not need to create this file. It will be created 
the first time the client code runs after registering with
the server.

If you delete this file, the server will let a client re-
register a finite number of times. After that, you'll have to 
remove the record from the server sqlite database to re-register again.

`device_params.json`

There are parameters that you can use to override defaults 
in the code. Note that even these parameters will be overrriden
by parameters downloaded from the server. So

server params >> device_params.json >> default in code

This file needs to be present, but it can be empty.
```json
{}
```


`provisioning_token.json`

```
"DJmtFWMWh6VgrLSTO6+dGZZKMJeRW6sBfjtfFXKtlugyyPbDVDrQxZ4BzvcN96ce91HPxFLmbtjsA0WXl6Zff0YS0pf0Dk6HBvv3eZsiFOb2ajUXMyfH6/HhKdBKmkblQh9vIFSxq/7FH7J1vvO7vrVuXSv/ZaIzrpmQx3T3Rdg="
```

Any one of potentially several secret tokens from the server that are used
when the client is provisioning. Once the client has gotten its own 
credentials from the server, this file is no longer needed and can be
deleted. For best security, it probably should be.

## Running

You can try everything out by running capture.py. Problems 
will be apparent right away. The first time it runs (successfully)
it will communicate with the server and provision itself with
credentials.

You can kill it with ^C.

## Installing as a service

ircdemo.service is provided as an example of how to install
under systemd.

`sudo cp ircdemo.service /etc/systemd/system`
`sudo systemctl enable ircdemo`
`sudo systemctl start ircdemo`

