#!/usr/bin/env python3

from sys import exit
from os import system
import time
import kromek
import ServerConnection
import TimerLoop
import Backgrounder
import Camera
import json
import myhelpers

base_config = {
    'reading_period': 60,
    'photo_period': 20,
    'config_check_period': 7200,
    'ping_period': 900,
    'tick_length': 0.25,
    'sensor_params': { },
    'max_consec_net_errs': 10,
    'mail_check_period': 7200,
    'bground_check_period': 5,
    'clock_resync_period': 7200,
    'camera': {
        'skip_comparison': True,
        'params': {
            'resolution': (2560, 2048),
            #'resolution': (3280, 2464),  # max native res for pi camera2
            # auto iso
            #'iso': 100,
            'vflip': False,
            'image_effect': 'denoise',
        },
    }
}

def fileIntoString(fn):
    try:
        with open(fn,'r') as fh:
            os = fh.read().replace('\n','')
            return os
    except:
        return None

def synchronizeSystemClock():
    print('synchronizeSystemClock()')
    clock_is_set = False
    clock_attempts_remain = 3
    while not clock_is_set and clock_attempts_remain:
        setres = system('sudo ./setclock.py')
        if setres == 0:
            clock_is_set = True
        else:
            clock_attempts_remain -= 1
    if not clock_is_set:
        sys.exit(-1)


def pre_run():
    kdevs = kromek.discover()
    print('Discovered %s' % kdevs)
    if len(kdevs) <= 0:
        print('No devices?')
        return

    try:
        kconn = kromek.connect(kdevs[0])
    except:
        print('Could not connect to kromek device.')
        return None

    try:
        cconn = Camera.Camera()
    except:
        print('Could not create camera instance.')
        return None

    try:
        ser = kromek.get_value(kconn,param='serial')
    except:
        return None

    server_config = {
        'provisioning_token_path': './provisioning_token.json',
        'url_base': 'https://irc-dev.lbl.gov/demo1',
        'credentials_path': './credentials.json',
        'params_path': './device_params.json',
        'device_name': fileIntoString('device_name.txt'),
        'device_type': 'kromek_d3s+picamera',
        'device_serial': ser['serial'].encode('ascii'),
    }

    sconn = ServerConnection.ServerConnection(server_config)

    cfg = { k:base_config[k] for k in base_config }
    cfg['kconn'] = kconn
    cfg['sconn'] = sconn
    cfg['cconn'] = cconn
    cconn.setParams(cfg['camera'])

    if True:
        synchronizeSystemClock()

    return cfg




def readSensor(cfg):
    print('readSensor()')
    fake_kromek = False 

    read_time = myhelpers.nowstr()

    try:
        sdata = {}
        if fake_kromek:
            sdata = {
                'serial': 'blee bloop',
                'bias': 123,
                'measurement': [1,2,3,4,5,6,7],
            }
        else:
            for group in ['serial','status','measurement','gain','bias','lld-g','lld-n']:
                res = kromek.get_value(cfg['kconn'],param=group)
                for k in res:
                    sdata[k] = res[k]
        sdata['read_time'] = read_time
        return sdata

    except Exception as e:
        print('well, that didn\'t work')
        print(e)
        return None




class CapHandlers(object):
    def __init__(self, cfg):
        self.cfg = cfg

    def takeReading(self, name, now):
        sdata = readSensor(self.cfg)
        res = self.cfg['sconn'].push(sdata,'radiation')
        print(res)
        return False

    def takePhoto(self, name, now):
        phdata = None
        if cfg['camera']['skip_comparison']:
            phdata = cfg['cconn'].captureToJPEGStr()
        else:
            phdata = cfg['cconn'].takeAndComparePhoto()
        if phdata:
            res = cfg['sconn'].push(phdata,'image')
            print(res)
        else:
            print('No image to upload.')

    def checkNetErrs(self, name, now):
        if self.cfg['sconn'].getStats()['consec_net_errs'] > self.cfg['max_consec_net_errs']:
            print('Network not working. I\'m going to kill myself and presumably systemd will restart me.')
            exit(-10)

    def doPing(self, name, now):
        res = self.cfg['sconn'].ping()

    def cfgCheck(self, name, now):
        self.cfg['sconn'].getParams(self.cfg)

    def syncClock(self, name, now):
        synchronizeSystemClock()



class MessageHandler(object):
    def __init__(self,sconn):
        self.sconn = sconn
        self.backgrounder = Backgrounder.Backgrounder()
    def messageType(self, msg, t):
        mt = msg.get('type',None)
        if mt:
            return mt == t
        return false
    def checkNew(self, name, now):
        messages = self.sconn.getMail()
        for message in messages:
            if self.messageType(message,'shell_script'):
                self.backgrounder.startNew(message)
            elif self.messageType(message,'restart'):
                sys.exit(0)
    def checkComplete(self, name, now):
        count, reses = self.backgrounder.checkResults()
        if count:
            for msgid in reses:
                self.sconn.respondMail(msgid,reses[msgid])






def mymain(cfg):

    ch = CapHandlers(cfg)
    te = TimerLoop.TimerLoop()
    mh = MessageHandler(cfg['sconn'])

    te.addHandler(ch.doPing,       cfg['ping_period'])
    te.addHandler(ch.takeReading,  cfg['reading_period'])
    te.addHandler(ch.takePhoto,    cfg['photo_period'])
    te.addHandler(ch.checkNetErrs, cfg['reading_period'])
    te.addHandler(ch.cfgCheck,     cfg['config_check_period'])
    te.addHandler(mh.checkNew,     cfg['mail_check_period'])
    te.addHandler(mh.checkComplete,cfg['bground_check_period'])
    te.addHandler(ch.syncClock,    cfg['clock_resync_period'])

    te.run(cfg['tick_length'])

if __name__ == '__main__':
    try:
        cfg = pre_run();
        if cfg:
            mymain(cfg)
    except Exception as e:
        print('Whoops!',e)

