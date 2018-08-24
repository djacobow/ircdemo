#!/usr/bin/env python3

import serial
import time
import socket
import struct
import subprocess
import json

def txrx(s,m):
    
    abytes = ''.join([m,'\r']).encode('ascii')
    print('>>>',abytes)
    s.write(abytes)
    ready = 0
    while ready <= 0:
        time.sleep(0.25)
        ready = s.inWaiting()
    time.sleep(0.25)
    r0 = s.read_until()
    time.sleep(0.25)
    r1 = s.read_until()
    print('<<<<',r1)
    return r1

def doInit():
    s = serial.Serial('/dev/ttyUSB0', 115200, serial.EIGHTBITS, serial.PARITY_NONE, serial.STOPBITS_ONE, .001)
   
    commands = [
        'AT',
        'AT',
        'AT',
        'ATZ',
        'AT^NDISDUP=1,1,"wholesale"',
        'AT^DHCP?',
        'AT+CNUM?',
    ]

    results = [ txrx(s,x).decode('ascii') for x in commands ]
    print(json.dumps(results,indent=2))
    return results[5]


def decodeIps(response):
    ips = []
    hex_addresses = response.split(':', 1)[1].split(",")
    for i in range(6):
        ips.append(socket.inet_ntoa(struct.pack("<L", int(hex_addresses[i], base=16))))
    netmask = sum([bin(int(x)).count('1') for x in ips[1].split('.')])

    actions = [
        ["/sbin/ip", 'address', 'add', '{}/{}'.format(ips[0], netmask), 'dev', 'wwan0' ],
        ["/sbin/ip", 'route', 'add', 'default', 'via', '{}'.format(ips[2]),],
        #"#The server recommends these DNS servers: {} and {}".format(ips[4], ips[5])
    ]
    return actions


def doActions(actions):
    for action in actions:
        subprocess.run(action)

if __name__ == '__main__':
    magic_str = doInit()
    actions = decodeIps(magic_str)
    doActions(actions)
